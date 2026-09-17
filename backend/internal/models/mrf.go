package models

import (
	"backend/internal/config"
	"errors"
	"log"
	"time"
)

type PendingMRF struct {
	MRFID         int    `json:"mrf_id"`
	ProjectID     int    `json:"project_id"`
	ProjectName   string `json:"project_name"`
	MRFNumber     string `json:"mrf_number"`
	DateRequested string `json:"date_requested"`
	RequestedBy   string `json:"requested_by"`
}

type MRFItemToFulfill struct {
	MRFItemID              int     `json:"mrf_item_id"`
	ProjectItemComponentID int     `json:"project_item_component_id"`
	InventoryID            int     `json:"inventory_id"`
	InventoryName          string  `json:"inventory_name"`
	DBOSCode               string  `json:"dbos_code"`
	QtyRequested           float64 `json:"qty_requested"`
	QtyOnHand              float64 `json:"qty_on_hand"`
	QtyIssued              float64 `json:"qty_issued"` // Used for the payload
}

type FulfillMRFRequest struct {
	MRFID      int                `json:"mrf_id"`
	ProjectID  int                `json:"project_id"`
	ApprovedBy string             `json:"approved_by"`
	Items      []MRFItemToFulfill `json:"items"`
}

// Get all MRFs waiting for warehouse approval
func GetPendingMRFs() ([]PendingMRF, error) {
	query := `
		SELECT mrf_id, project_id, mrf_number, date_requested, requested_by, status 
		FROM tbl_mrf 
		WHERE status = 'Pending' OR status = 'Partial'
		ORDER BY date_requested ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
		// THIS WILL PRINT THE EXACT MYSQL ERROR TO YOUR TERMINAL!
		log.Printf("❌ DATABASE ERROR in GetPendingMRFs: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var mrfs []PendingMRF
	for rows.Next() {
		var m PendingMRF
		if err := rows.Scan(&m.MRFID, &m.ProjectID, &m.ProjectName, &m.MRFNumber, &m.DateRequested, &m.RequestedBy); err == nil {
			mrfs = append(mrfs, m)
		} else {
			log.Printf("❌ SCAN ERROR in GetPendingMRFs row: %v\n", err)
		}
	}
	if mrfs == nil {
		mrfs = []PendingMRF{}
	}

	log.Printf("✅ Successfully fetched %d pending MRFs\n", len(mrfs))
	return mrfs, nil
}

// Get the specific items inside a pending MRF so warehouse can check stock
func GetMRFItemsForFulfillment(mrfID int) ([]MRFItemToFulfill, error) {
	// We use CAST(... AS DOUBLE) to prevent Go from crashing on MySQL DECIMAL types
	query := `
		SELECT 
			mi.mrf_item_id, 
			COALESCE(mi.project_item_component_id, 0), 
			mi.inventory_id, 
			i.inventory_name, 
			i.dbos_code, 
			CAST(mi.qty_requested AS DOUBLE), 
			CAST(i.qty_on_hand AS DOUBLE),
			CAST(COALESCE(mi.qty_issued, 0) AS DOUBLE)
		FROM tbl_mrf_items mi
		JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		WHERE mi.mrf_id = ?`

	log.Printf("Executing GetMRFItemsForFulfillment for MRF ID: %d", mrfID)

	rows, err := config.DB.Query(query, mrfID)
	if err != nil {
		log.Printf("❌ DB Error in GetMRFItemsForFulfillment: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var items []MRFItemToFulfill
	for rows.Next() {
		var item MRFItemToFulfill
		var previouslyIssued float64

		// We MUST scan exactly 8 variables because our SELECT has 8 columns!
		if err := rows.Scan(
			&item.MRFItemID,
			&item.ProjectItemComponentID,
			&item.InventoryID,
			&item.InventoryName,
			&item.DBOSCode,
			&item.QtyRequested,
			&item.QtyOnHand,
			&previouslyIssued, // We read what the DB says was already issued
		); err == nil {

			// Calculate if there is still a shortage for this item
			shortage := item.QtyRequested - previouslyIssued
			if shortage < 0 {
				shortage = 0
			}

			// Default the input box to the remaining shortage
			item.QtyIssued = shortage

			// Only show items to the warehouse if they STILL need fulfillment
			if shortage > 0 {
				items = append(items, item)
			}
		} else {
			// This will now visibly tell you if it fails instead of showing an empty screen!
			log.Printf("❌ SCAN ERROR in GetMRFItemsForFulfillment row: %v\n", err)
		}
	}
	if items == nil {
		items = []MRFItemToFulfill{}
	}

	log.Printf("✅ Successfully fetched %d items for MRF Fulfillment", len(items))
	return items, nil
}

// THE SMART CONSUME FUNCTION: Fulfills MRFs and handles Backorders (Phase 5)
func FulfillMRF(req FulfillMRFRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	allFullyIssued := true

	// 1. Process each item
	for _, item := range req.Items {
		if item.QtyIssued > 0 {
			// A. Verify warehouse actually has the stock they are trying to issue
			var currentStock float64
			err = tx.QueryRow(`SELECT qty_on_hand FROM tbl_inventory WHERE inventory_id = ?`, item.InventoryID).Scan(&currentStock)
			if err != nil || currentStock < item.QtyIssued {
				tx.Rollback()
				return errors.New("insufficient stock to issue: " + item.InventoryName)
			}

			// B. Get the previously issued amount to calculate the new cumulative total
			var prevIssued float64
			var requested float64
			err = tx.QueryRow(`SELECT COALESCE(qty_issued, 0), qty_requested FROM tbl_mrf_items WHERE mrf_item_id = ?`, item.MRFItemID).Scan(&prevIssued, &requested)
			if err != nil {
				tx.Rollback()
				return err
			}

			newTotalIssued := prevIssued + item.QtyIssued

			// C. Calculate Status (Shortage vs Issued)
			itemStatus := "Issued"
			if newTotalIssued < requested {
				itemStatus = "Shortage"
				allFullyIssued = false // Still a shortage, keep MRF as Partial
			}

			// D. Update MRF Item (Lock in the NEW cumulative amount)
			_, err = tx.Exec(`UPDATE tbl_mrf_items SET qty_issued = ?, status = ? WHERE mrf_item_id = ?`, newTotalIssued, itemStatus, item.MRFItemID)
			if err != nil {
				tx.Rollback()
				return err
			}

			// E. Log to Consumed Table
			_, err = tx.Exec(`INSERT INTO tbl_inventory_consumed (inventory_id, project_id, project_component_id, mrf_id, qty_consumed, date_consumed) 
							  VALUES (?, ?, ?, ?, ?, ?)`,
				item.InventoryID, req.ProjectID, item.ProjectItemComponentID, req.MRFID, item.QtyIssued, time.Now())
			if err != nil {
				tx.Rollback()
				return err
			}

			// F. Deduct from Master Inventory
			_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand - ? WHERE inventory_id = ?`, item.QtyIssued, item.InventoryID)
			if err != nil {
				tx.Rollback()
				return err
			}
		} else {
			// If they issued 0 this round, we still need to check if this item is a lingering shortage
			var prevIssued, requested float64
			tx.QueryRow(`SELECT COALESCE(qty_issued, 0), qty_requested FROM tbl_mrf_items WHERE mrf_item_id = ?`, item.MRFItemID).Scan(&prevIssued, &requested)
			if prevIssued < requested {
				allFullyIssued = false
			}
		}
	}

	// 2. Mark MRF Document Status
	mrfStatus := "Completed"
	if !allFullyIssued {
		mrfStatus = "Partial" // Means there are still items waiting to be purchased/received!
	}

	_, err = tx.Exec(`UPDATE tbl_mrf SET status = ?, approved_by = ? WHERE mrf_id = ?`, mrfStatus, req.ApprovedBy, req.MRFID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

type CreateMRFRequest struct {
	RequestedBy   string `json:"requested_by"`
	DateRequested string `json:"date_requested"`
	Items         []struct {
		InventoryID            int     `json:"inventory_id"`
		ProjectItemComponentID int     `json:"project_item_component_id"` // Will default to 0 from frontend
		QtyRequested           float64 `json:"qty_requested"`
	} `json:"items"`
}

// Generate MRF and save items
func CreateMRF(projectID int, req CreateMRFRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Generate unique MRF Number (Format: MRF-YYYYMMDD-HHMMSS)
	mrfNumber := "MRF-" + time.Now().Format("20060102-150405")

	// 2. Insert main document
	res, err := tx.Exec(`INSERT INTO tbl_mrf (project_id, mrf_number, date_requested, requested_by, status) VALUES (?, ?, ?, ?, 'Pending')`,
		projectID, mrfNumber, req.DateRequested, req.RequestedBy)
	if err != nil {
		tx.Rollback()
		return err
	}

	mrfID, _ := res.LastInsertId()

	// 3. Insert line items
	for _, item := range req.Items {
		var compID interface{}
		if item.ProjectItemComponentID > 0 {
			compID = item.ProjectItemComponentID
		} else {
			compID = nil // Handles the NULL column if components aren't mapped
		}

		_, err = tx.Exec(`INSERT INTO tbl_mrf_items (mrf_id, project_item_component_id, inventory_id, qty_requested) VALUES (?, ?, ?, ?)`,
			mrfID, compID, item.InventoryID, item.QtyRequested)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

type ProjectMRF struct {
	MRFID         int    `json:"mrf_id"`
	MRFNumber     string `json:"mrf_number"`
	DateRequested string `json:"date_requested"`
	RequestedBy   string `json:"requested_by"`
	Status        string `json:"status"`
}

// Fetch all MRFs belonging to a specific project
func GetMRFsByProject(projectID int) ([]ProjectMRF, error) {
	// FIX: Added CAST to date_requested to prevent silent mapping failures
	query := `
        SELECT 
            mrf_id, 
            mrf_number, 
            CAST(date_requested AS CHAR), 
            requested_by, 
            status 
        FROM tbl_mrf 
        WHERE project_id = ? 
        ORDER BY date_requested DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mrfs []ProjectMRF
	for rows.Next() {
		var m ProjectMRF
		if err := rows.Scan(&m.MRFID, &m.MRFNumber, &m.DateRequested, &m.RequestedBy, &m.Status); err == nil {
			mrfs = append(mrfs, m)
		} else {
			println("Scan Error in GetMRFsByProject:", err.Error())
		}
	}
	if mrfs == nil {
		mrfs = []ProjectMRF{}
	}
	return mrfs, nil
}

type MRFHistory struct {
	MRFID         int    `json:"mrf_id"`
	ProjectID     int    `json:"project_id"`
	ProjectName   string `json:"project_name"`
	MRFNumber     string `json:"mrf_number"`
	DateRequested string `json:"date_requested"`
	RequestedBy   string `json:"requested_by"`
	Status        string `json:"status"`
	ApprovedBy    string `json:"approved_by"`
}

// Fetch all processed MRFs (Approved, Rejected, etc.)
func GetMRFHistory() ([]MRFHistory, error) {
	query := `
		SELECT 
			m.mrf_id, 
			m.project_id, 
			COALESCE(p.project_name, 'Unknown Project'), 
			m.mrf_number, 
			CAST(m.date_requested AS CHAR), 
			COALESCE(m.requested_by, 'System'),
			m.status,
			COALESCE(m.approved_by, 'System')
		FROM tbl_mrf m
		LEFT JOIN projects p ON m.project_id = p.projects_id 
		WHERE m.status != 'Pending'
		ORDER BY m.date_requested DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		log.Printf("❌ DATABASE ERROR in GetMRFHistory: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var mrfs []MRFHistory
	for rows.Next() {
		var m MRFHistory
		if err := rows.Scan(&m.MRFID, &m.ProjectID, &m.ProjectName, &m.MRFNumber, &m.DateRequested, &m.RequestedBy, &m.Status, &m.ApprovedBy); err == nil {
			mrfs = append(mrfs, m)
		} else {
			log.Printf("❌ SCAN ERROR in GetMRFHistory row: %v\n", err)
		}
	}
	if mrfs == nil {
		mrfs = []MRFHistory{}
	}
	return mrfs, nil
}
