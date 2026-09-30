package models

import (
	"backend/internal/config"
	"fmt"
	"log"
	"time"
)

// --- MRF DASHBOARD & PROJECT VIEWS ---

type ProjectMRF struct {
	MRFID         int    `json:"mrf_id"`
	MRFNumber     string `json:"mrf_number"`
	DateRequested string `json:"date_requested"`
	RequestedBy   string `json:"requested_by"`
	ApprovedBy    string `json:"approved_by"`
	Status        string `json:"status"`
}

// Fetch all MRFs belonging to a specific project (Used in EditProjectPage)
func GetProjectMRFs(projectID int) ([]ProjectMRF, error) {
	query := `
		SELECT 
			mrf_id, 
			mrf_number, 
			CAST(date_requested AS CHAR), 
			requested_by, 
			COALESCE(approved_by, ''),
			status 
		FROM tbl_mrf 
		WHERE project_id = ? 
		ORDER BY mrf_id DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		log.Printf("❌ DB Error GetProjectMRFs: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []ProjectMRF
	for rows.Next() {
		var m ProjectMRF
		if err := rows.Scan(&m.MRFID, &m.MRFNumber, &m.DateRequested, &m.RequestedBy, &m.ApprovedBy, &m.Status); err == nil {
			list = append(list, m)
		} else {
			log.Printf("❌ Scan Error in GetProjectMRFs: %v\n", err)
		}
	}
	if list == nil {
		list = []ProjectMRF{}
	}
	return list, nil
}

// --- CREATING AN MRF (Phase 1 to Phase 2 Transition) ---

type CreateMRFRequest struct {
	ProjectID     int    `json:"project_id"`
	RequestedBy   string `json:"requested_by"`
	DateRequested string `json:"date_requested"`
	Items         []struct {
		BOMID          int     `json:"bom_id"` // <--- FIXED: Now correctly receives bom_id from React
		InventoryID    int     `json:"inventory_id"`
		CustomItemName string  `json:"custom_item_name"`
		QtyRequested   float64 `json:"qty_requested"`
	} `json:"items"`
}

// Generate MRF and save items from the BOM
func CreateProjectMRF(req CreateMRFRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	tempMRFNumber := fmt.Sprintf("MRF-TEMP-%d", time.Now().Unix())
	res, err := tx.Exec(`INSERT INTO tbl_mrf (project_id, mrf_number, date_requested, requested_by, status) VALUES (?, ?, ?, ?, 'Pending')`,
		req.ProjectID, tempMRFNumber, req.DateRequested, req.RequestedBy)
	if err != nil {
		tx.Rollback()
		return err
	}

	mrfID, _ := res.LastInsertId()

	realMRFNumber := fmt.Sprintf("MRF-%d-%05d", time.Now().Year(), mrfID)
	_, err = tx.Exec(`UPDATE tbl_mrf SET mrf_number = ? WHERE mrf_id = ?`, realMRFNumber, mrfID)
	if err != nil {
		tx.Rollback()
		return err
	}

	lineQuery := `INSERT INTO tbl_mrf_items (mrf_id, bom_id, inventory_id, custom_item_name, qty_requested) 
                  VALUES (?, NULLIF(?, 0), NULLIF(?, 0), NULLIF(?, ''), ?)`

	for _, item := range req.Items {
		// FIXED: Passing item.BOMID here instead of the old component ID
		_, err = tx.Exec(lineQuery, mrfID, item.BOMID, item.InventoryID, item.CustomItemName, item.QtyRequested)
		if err != nil {
			tx.Rollback()
			log.Printf("❌ DB Error Inserting MRF Line: %v\n", err)
			return err
		}
	}

	return tx.Commit()
}

// --- PHASE 2 CORE: STOCK VS DEMAND CHECK ---

type MRFItemToFulfill struct {
	MRFItemID      int     `json:"mrf_item_id"`
	MRFID          int     `json:"mrf_id"`
	BOMID          int     `json:"bom_id"` // <--- FIXED HERE TOO
	InventoryID    int     `json:"inventory_id"`
	CustomItemName string  `json:"custom_item_name"`
	Description    string  `json:"description"`
	InventoryName  string  `json:"inventory_name"`
	DBOSCode       string  `json:"dbos_code"`
	QtyRequested   float64 `json:"qty_requested"`
	QtyOnHand      float64 `json:"qty_on_hand"`
	QtyIssued      float64 `json:"qty_issued"`
	Status         string  `json:"status"`
	UOMAbbr        string  `json:"uom_abbr"`

	ProcurementFlag bool `json:"procurement_flag"`
}

// Get the specific items inside an MRF and check if warehouse has stock
func GetMRFItemsForFulfillment(mrfID int) ([]MRFItemToFulfill, error) {
	query := `
		SELECT 
			mi.mrf_item_id, 
			mi.mrf_id,
			COALESCE(mi.bom_id, 0), 
			COALESCE(mi.inventory_id, 0), 
			COALESCE(mi.custom_item_name, ''),
			COALESCE(b.description, ''), 
			COALESCE(i.inventory_name, 'Custom Item'), 
			COALESCE(i.dbos_code, 'N/A'), 
			CAST(mi.qty_requested AS DOUBLE), 
			CAST(COALESCE(i.qty_on_hand, 0) AS DOUBLE),
			CAST(COALESCE(mi.qty_issued, 0) AS DOUBLE),
			COALESCE(mi.status, 'Pending'),
			COALESCE(u.uom_abbr, 'Units')
		FROM tbl_mrf_items mi
		LEFT JOIN tbl_project_bom b ON mi.bom_id = b.bom_id
		LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON i.uom_id = u.uom_id
		WHERE mi.mrf_id = ?`

	rows, err := config.DB.Query(query, mrfID)
	if err != nil {
		log.Printf("❌ DB Error in GetMRFItemsForFulfillment: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var items []MRFItemToFulfill
	for rows.Next() {
		var item MRFItemToFulfill

		if err := rows.Scan(
			&item.MRFItemID,
			&item.MRFID,
			&item.BOMID, // <--- FIXED: Scanning into BOMID
			&item.InventoryID,
			&item.CustomItemName,
			&item.Description,
			&item.InventoryName,
			&item.DBOSCode,
			&item.QtyRequested,
			&item.QtyOnHand,
			&item.QtyIssued,
			&item.Status,
			&item.UOMAbbr,
		); err == nil {

			pendingQty := item.QtyRequested - item.QtyIssued
			if item.InventoryID == 0 || item.QtyOnHand < pendingQty {
				item.ProcurementFlag = true
			} else {
				item.ProcurementFlag = false
			}

			items = append(items, item)
		} else {
			log.Printf("❌ SCAN ERROR in GetMRFItemsForFulfillment: %v\n", err)
		}
	}

	if items == nil {
		items = []MRFItemToFulfill{}
	}
	return items, nil
}

// --- WAREHOUSE MANAGEMENT VIEWS ---

type PendingMRF struct {
	MRFID         int    `json:"mrf_id"`
	ProjectID     int    `json:"project_id"`
	ProjectName   string `json:"project_name"`
	MRFNumber     string `json:"mrf_number"`
	DateRequested string `json:"date_requested"`
	RequestedBy   string `json:"requested_by"`
}

// Get all MRFs waiting for warehouse approval
func GetPendingMRFs() ([]PendingMRF, error) {
	query := `
		SELECT 
			m.mrf_id, m.project_id, COALESCE(p.project_name, 'Unknown'), 
			m.mrf_number, CAST(m.date_requested AS CHAR), m.requested_by
		FROM tbl_mrf m
		LEFT JOIN projects p ON m.project_id = p.projects_id
		WHERE m.status = 'Pending' OR m.status = 'Partial'
		ORDER BY m.date_requested ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
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

// Fetch all processed MRFs
func GetMRFHistory() ([]MRFHistory, error) {
	query := `
		SELECT 
			m.mrf_id, m.project_id, COALESCE(p.project_name, 'Unknown'), 
			m.mrf_number, CAST(m.date_requested AS CHAR), COALESCE(m.requested_by, 'System'),
			m.status, COALESCE(m.approved_by, 'System')
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

// --- PHASE 4: WAREHOUSE FULFILLMENT & PO ROUTING ---

type FulfillMRFRequest struct {
	MRFID       int                `json:"mrf_id"`
	ProjectID   int                `json:"project_id"`
	ApprovedBy  string             `json:"approved_by"`
	Destination string             `json:"destination"` // e.g. "Production Floor"
	Status      string             `json:"status"`      // e.g. "In Production"
	Items       []MRFItemToFulfill `json:"items"`
}

// Fulfills MRFs, Logs to Ledger (Type 1), and Routes shortages to PO
func FulfillMRF(req FulfillMRFRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	allFullyIssued := true
	anyIssued := false

	for _, item := range req.Items {

		// 1. Calculate Backorders and Procurement Flags
		qtyBackordered := item.QtyRequested - item.QtyIssued
		procurementFlag := 0

		if qtyBackordered > 0 {
			procurementFlag = 1 // Flag for Purchasing Department!
			allFullyIssued = false
		}
		if item.QtyIssued > 0 {
			anyIssued = true
		}

		// 2. Update MRF Item with Mapped Inventory, Issued Qty, and PO Routing Flags
		_, err = tx.Exec(`UPDATE tbl_mrf_items SET inventory_id = ?, qty_issued = ?, qty_backordered = ?, procurement_flag = ? WHERE mrf_item_id = ?`,
			item.InventoryID, item.QtyIssued, qtyBackordered, procurementFlag, item.MRFItemID)
		if err != nil {
			tx.Rollback()
			return err
		}

		// 3. Deduct Inventory & Log to Enterprise Ledger
		if item.QtyIssued > 0 {
			// Deduct from Master Inventory
			_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand - ? WHERE inventory_id = ?`, item.QtyIssued, item.InventoryID)
			if err != nil {
				tx.Rollback()
				return err
			}

			// Insert into Ledger (Transaction Type 1 = MRF_ISSUE)
			_, err = tx.Exec(`
				INSERT INTO tbl_inventory_ledger (inventory_id, transaction_type_id, qty_change, reference_id, project_id, destination, status, remarks, created_by)
				VALUES (?, 1, ?, ?, ?, ?, ?, 'MRF Fulfillment', ?)`,
				item.InventoryID, -item.QtyIssued, req.MRFID, req.ProjectID, req.Destination, req.Status, req.ApprovedBy)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// 4. Update the Parent MRF Status
	mrfStatus := "Approved"
	if !allFullyIssued && anyIssued {
		mrfStatus = "Partial"
	} else if !anyIssued {
		mrfStatus = "Pending PO"
	}

	_, err = tx.Exec(`UPDATE tbl_mrf SET status = ?, approved_by = ? WHERE mrf_id = ?`, mrfStatus, req.ApprovedBy, req.MRFID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
