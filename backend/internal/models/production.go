package models

import (
	"backend/internal/config"
	"fmt"
	"log"
)

type ProductionItem struct {
	ProjectItemsID      int     `json:"project_items_id"`
	ProjectID           int     `json:"project_id"`
	ProjectName         string  `json:"project_name"`
	ProductName         string  `json:"product_name"`
	TotalQty            float64 `json:"total_qty"`
	QtyInProduction     float64 `json:"qty_in_production"`
	QtyReadyForDelivery float64 `json:"qty_ready_for_delivery"`
	QtyDelivered        float64 `json:"qty_delivered"`
}

func GetProductionPipeline() ([]ProductionItem, error) {
	log.Println("==> [PRODUCTION] Starting GetProductionPipeline query...")

	var items []ProductionItem

	query := `
		SELECT i.project_items_id, i.project_id, 
		       COALESCE(p.project_name, 'Unknown Project'), 
		       COALESCE(i.product_name, 'Unnamed Item'), 
		       COALESCE(i.qty, 0), 
		       COALESCE(i.qty_in_production, 0), 
		       COALESCE(i.qty_ready_for_delivery, 0), 
		       COALESCE(i.qty_delivered, 0)
		FROM tbl_project_items i
		LEFT JOIN projects p ON i.project_id = p.projects_id
		WHERE p.project_status NOT IN ('Finished', 'Completed') OR p.project_status IS NULL
		ORDER BY i.project_items_id DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		log.Println("==> [PRODUCTION] SQL QUERY ERROR:", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item ProductionItem
		err := rows.Scan(
			&item.ProjectItemsID,
			&item.ProjectID,
			&item.ProjectName,
			&item.ProductName,
			&item.TotalQty,
			&item.QtyInProduction,
			&item.QtyReadyForDelivery,
			&item.QtyDelivered,
		)
		if err != nil {
			log.Println("==> [PRODUCTION] SQL ROW SCAN ERROR:", err)
			continue
		}
		items = append(items, item)
	}

	log.Printf("==> [PRODUCTION] Query Complete. Fetched %d items.\n", len(items))
	return items, nil
}

type AdvanceProductionPayload struct {
	QtyToMove      float64 `json:"qty_to_move"`
	InsertToLedger bool    `json:"insert_to_ledger"`
	InventoryID    *int    `json:"inventory_id,omitempty"` // Required only if inserting to ledger
	Username       string  `json:"username,omitempty"`
}

func AdvanceToReady(projectItemsID int, p AdvanceProductionPayload) error {
	// 1. Begin Database Transaction
	tx, err := config.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to start database transaction: %v", err)
	}

	// 2. Safely deduct from Production and Add to Ready
	res, err := tx.Exec(`
		UPDATE tbl_project_items 
		SET qty_in_production = qty_in_production - ?, 
		    qty_ready_for_delivery = qty_ready_for_delivery + ? 
		WHERE project_items_id = ? AND qty_in_production >= ?`,
		p.QtyToMove, p.QtyToMove, projectItemsID, p.QtyToMove)

	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update production quantities: %v", err)
	}

	// Ensure we actually updated something (prevents moving more qty than exists)
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		tx.Rollback()
		return fmt.Errorf("invalid quantity or item not found in production")
	}

	// 3. OPTIONAL: Insert Finished Good into Master Inventory Ledger
	if p.InsertToLedger && p.InventoryID != nil && *p.InventoryID > 0 {

		// Grab the project_id associated with this project item
		var projectID int
		err = tx.QueryRow("SELECT project_id FROM tbl_project_items WHERE project_items_id = ?", projectItemsID).Scan(&projectID)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to verify project ID: %v", err)
		}

		user := p.Username
		if user == "" {
			user = "System"
		}

		// Adjust the transaction_type_id (e.g., 4) to match whatever "PRODUCTION_RECEIPT" is in your tbl_inventory_transaction_types table
		transactionTypeID := 4

		ledgerQuery := `
			INSERT INTO tbl_inventory_ledger 
			(inventory_id, transaction_type_id, qty_change, reference_id, project_id, destination, status, remarks, created_by)
			VALUES (?, ?, ?, ?, ?, 'Staging Area', 'Staged / Ready', 'Finished Good produced from floor', ?)`

		_, err = tx.Exec(ledgerQuery, *p.InventoryID, transactionTypeID, p.QtyToMove, projectItemsID, projectID, user)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert into master ledger: %v", err)
		}
	}

	// 4. Commit Transaction
	return tx.Commit()
}

type StartProductionPayload struct {
	QtyToStart float64 `json:"qty_to_start"`
}

func StartProduction(projectItemsID int, qty float64) error {
	_, err := config.DB.Exec(`
		UPDATE tbl_project_items 
		SET qty_in_production = qty_in_production + ? 
		WHERE project_items_id = ?`,
		qty, projectItemsID)
	return err
}
