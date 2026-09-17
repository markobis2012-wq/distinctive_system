package models

import (
	"backend/internal/config"
	"errors"
	"time"
)

type Inventory struct {
	InventoryID   int     `json:"inventory_id"`
	DBOSCode      string  `json:"dbos_code"`
	InventoryName string  `json:"inventory_name"`
	Description   string  `json:"description"`
	UOMID         int     `json:"uom_id"`
	QtyOnHand     float64 `json:"qty_on_hand"`
	ImagePath     string  `json:"image_path"`
	IsActive      bool    `json:"is_active"`
}

type AddStockRequest struct {
	SupplierID        int     `json:"supplier_id"`
	SupplierProductID int     `json:"supplier_product_id"`
	QtyAdded          float64 `json:"qty_added"`
	UOMID             int     `json:"uom_id"`
	Remarks           string  `json:"remarks"`
}

type AddedStockHistory struct {
	AddInventoryID int     `json:"add_inventory_id"`
	SupplierName   string  `json:"supplier_name"`
	QtyAdded       float64 `json:"qty_added"`
	Remarks        string  `json:"remarks"`
	DateAdded      string  `json:"date_added"`
}

func GetAllInventory() ([]Inventory, error) {
	query := `SELECT inventory_id, dbos_code, inventory_name, description, uom_id, qty_on_hand, COALESCE(image_path, ''), is_active FROM tbl_inventory ORDER BY inventory_name ASC`
	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Inventory
	for rows.Next() {
		var i Inventory
		if err := rows.Scan(&i.InventoryID, &i.DBOSCode, &i.InventoryName, &i.Description, &i.UOMID, &i.QtyOnHand, &i.ImagePath, &i.IsActive); err == nil {
			items = append(items, i)
		}
	}
	if items == nil {
		items = []Inventory{}
	}
	return items, nil
}

func CreateInventory(inv Inventory) (int, error) {
	query := `INSERT INTO tbl_inventory (dbos_code, inventory_name, description, uom_id, qty_on_hand, image_path, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`
	res, err := config.DB.Exec(query, inv.DBOSCode, inv.InventoryName, inv.Description, inv.UOMID, 0.00, inv.ImagePath, true)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return int(id), nil
}

func UpdateInventory(inv Inventory) error {
	// Check qty rule if deactivating
	if !inv.IsActive {
		var qty float64
		config.DB.QueryRow(`SELECT qty_on_hand FROM tbl_inventory WHERE inventory_id = ?`, inv.InventoryID).Scan(&qty)
		if qty > 0 {
			return errors.New("cannot deactivate item with stock on hand")
		}
	}

	query := `UPDATE tbl_inventory SET inventory_name = ?, description = ?, image_path = COALESCE(NULLIF(?,''), image_path), is_active = ?, date_modified = ? WHERE inventory_id = ?`
	_, err := config.DB.Exec(query, inv.InventoryName, inv.Description, inv.ImagePath, inv.IsActive, time.Now(), inv.InventoryID)
	return err
}

func AddInventoryStock(inventoryID int, req AddStockRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}
	_, err = tx.Exec(`INSERT INTO tbl_inventory_added (inventory_id, supplier_id, supplier_product_id, qty_added, uom_id, remarks, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		inventoryID, req.SupplierID, req.SupplierProductID, req.QtyAdded, req.UOMID, req.Remarks, time.Now())
	if err != nil {
		tx.Rollback()
		return err
	}
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ?, date_modified = ? WHERE inventory_id = ?`, req.QtyAdded, time.Now(), inventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func GetInventoryAddedHistory(inventoryID int) ([]AddedStockHistory, error) {
	query := `
		SELECT a.add_inventory_id, COALESCE(c.company_name, 'Unknown'), a.qty_added, COALESCE(a.remarks, ''), a.date_added 
		FROM tbl_inventory_added a
		LEFT JOIN tbl_company c ON a.supplier_id = c.company_id
		WHERE a.inventory_id = ? ORDER BY a.date_added DESC`
	rows, err := config.DB.Query(query, inventoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []AddedStockHistory
	for rows.Next() {
		var h AddedStockHistory
		if err := rows.Scan(&h.AddInventoryID, &h.SupplierName, &h.QtyAdded, &h.Remarks, &h.DateAdded); err == nil {
			history = append(history, h)
		}
	}
	if history == nil {
		history = []AddedStockHistory{}
	}
	return history, nil
}

// Update Added Stock - Safely adjusts the master qty difference
func UpdateInventoryAddedStock(addID int, newQty float64, newRemarks string) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	var oldQty float64
	var invID int
	err = tx.QueryRow(`SELECT inventory_id, qty_added FROM tbl_inventory_added WHERE add_inventory_id = ?`, addID).Scan(&invID, &oldQty)
	if err != nil {
		tx.Rollback()
		return err
	}

	qtyDifference := newQty - oldQty

	// Ensure master stock doesn't go below zero
	var masterQty float64
	tx.QueryRow(`SELECT qty_on_hand FROM tbl_inventory WHERE inventory_id = ?`, invID).Scan(&masterQty)
	if masterQty+qtyDifference < 0 {
		tx.Rollback()
		return errors.New("updating this record would cause master stock to fall below zero")
	}

	_, err = tx.Exec(`UPDATE tbl_inventory_added SET qty_added = ?, remarks = ? WHERE add_inventory_id = ?`, newQty, newRemarks, addID)
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ? WHERE inventory_id = ?`, qtyDifference, invID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// --- PHASE 5: RETURN TO STOCK (RTS) ---

type RTSRequest struct {
	InventoryID int     `json:"inventory_id"`
	ProjectID   int     `json:"project_id"`
	ReturnQty   float64 `json:"return_qty"`
	Notes       string  `json:"notes"`
}

func ProcessReturnToStock(req RTSRequest) error {
	if req.ReturnQty <= 0 {
		return errors.New("return quantity must be greater than zero")
	}

	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Increment the Master Inventory qty_on_hand
	updateInv := `UPDATE tbl_inventory SET qty_on_hand = COALESCE(qty_on_hand, 0) + ?, date_modified = ? WHERE inventory_id = ?`
	_, err = tx.Exec(updateInv, req.ReturnQty, time.Now(), req.InventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Log it into your existing Stock History table!
	// We use supplier_id = 0 so you know it came from the production floor, not a supplier.
	logQuery := `
		INSERT INTO tbl_inventory_added (inventory_id, supplier_id, supplier_product_id, qty_added, uom_id, remarks, date_added)
		SELECT ?, 0, 0, ?, uom_id, ?, ? FROM tbl_inventory WHERE inventory_id = ?
	`

	remarks := "Returned to Stock (RTS)"
	if req.Notes != "" {
		remarks += " - Notes: " + req.Notes
	}

	_, err = tx.Exec(logQuery, req.InventoryID, req.ReturnQty, remarks, time.Now(), req.InventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
