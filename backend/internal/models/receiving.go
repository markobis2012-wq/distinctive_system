package models

import (
	"backend/internal/config"
	"fmt"
	"log"
)

type IncomingPOItem struct {
	POItemID         int     `json:"po_item_id"`
	PONumber         string  `json:"po_number"`
	SupplierName     string  `json:"supplier_name"`
	ItemName         string  `json:"item_name"`
	OrderedQty       float64 `json:"ordered_qty"`
	ReceivedQty      float64 `json:"received_qty"`
	Status           string  `json:"status"`
	ExpectedDelivery string  `json:"expected_delivery"`
}

// Fetch all PO items that have not been fully received yet
func GetIncomingPOItems() ([]IncomingPOItem, error) {
	query := `
		SELECT 
			poi.po_item_id, 
			po.po_number, 
			COALESCE(c.company_name, 'Unknown Vendor'), 
			COALESCE(poi.description, 'Unknown Item'), 
			poi.qty, 
			poi.received_qty, 
			poi.status, 
			COALESCE(CAST(po.expected_delivery_date AS CHAR), '')
		FROM tbl_po_items poi
		JOIN tbl_po po ON poi.po_id = po.po_id
		LEFT JOIN tbl_company c ON po.supplier_id = c.company_id
		WHERE poi.status != 'Fully Received'
		ORDER BY po.po_date ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
		// THIS WILL PRINT THE EXACT MYSQL ERROR TO YOUR TERMINAL
		log.Printf("❌ ERROR in GetIncomingPOItems (Query Execution): %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []IncomingPOItem
	for rows.Next() {
		var item IncomingPOItem
		if err := rows.Scan(&item.POItemID, &item.PONumber, &item.SupplierName, &item.ItemName, &item.OrderedQty, &item.ReceivedQty, &item.Status, &item.ExpectedDelivery); err != nil {
			// THIS WILL PRINT IF THERE IS A MISMATCH IN VARIABLE MAPPING
			log.Printf("❌ ERROR in GetIncomingPOItems (Row Scanning): %v\n", err)
			return nil, err
		}
		list = append(list, item)
	}

	if list == nil {
		list = []IncomingPOItem{}
	}

	return list, nil
}

// Update the ETA for a specific PO
func UpdatePOETA(poNumber string, eta string) error {
	_, err := config.DB.Exec(`UPDATE tbl_po SET expected_delivery_date = NULLIF(?, '') WHERE po_number = ?`, eta, poNumber)
	if err != nil {
		log.Printf("❌ ERROR in UpdatePOETA: %v\n", err)
	}
	return err
}

// THE LEDGER HANDSHAKE: Receives the PO and adds to Master Inventory via Unified Ledger
func ReceiveGoods(poItemID int, qtyReceived float64) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	var inventoryID, poID int
	var orderedQty, currentReceivedQty float64
	var poNumber string

	err = tx.QueryRow(`
		SELECT mi.inventory_id, poi.qty, poi.received_qty, po.po_number, po.po_id
		FROM tbl_po_items poi
		JOIN tbl_mrf_items mi ON poi.mrf_item_id = mi.mrf_item_id
		JOIN tbl_po po ON poi.po_id = po.po_id
		WHERE poi.po_item_id = ?`, poItemID).Scan(&inventoryID, &orderedQty, &currentReceivedQty, &poNumber, &poID)

	if err != nil {
		tx.Rollback()
		log.Printf("❌ ERROR in ReceiveGoods (Finding Item): %v\n", err)
		return fmt.Errorf("failed to find linked inventory item: %v", err)
	}

	newTotalReceived := currentReceivedQty + qtyReceived
	status := "Partially Received"
	if newTotalReceived >= orderedQty {
		status = "Fully Received"
	}

	// 1. Update PO Item Status
	_, err = tx.Exec(`UPDATE tbl_po_items SET received_qty = ?, status = ? WHERE po_item_id = ?`, newTotalReceived, status, poItemID)
	if err != nil {
		tx.Rollback()
		log.Printf("❌ ERROR in ReceiveGoods (Update PO Item): %v\n", err)
		return err
	}

	// 2. Update Master Inventory
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ? WHERE inventory_id = ?`, qtyReceived, inventoryID)
	if err != nil {
		tx.Rollback()
		log.Printf("❌ ERROR in ReceiveGoods (Update Master Inventory): %v\n", err)
		return err
	}

	// 3. Record to Ledger (Type 2 = PO_RECEIPT)
	remarks := fmt.Sprintf("Received via %s", poNumber)
	_, err = tx.Exec(`
		INSERT INTO tbl_inventory_ledger 
		(inventory_id, transaction_type_id, qty_change, reference_id, destination, status, remarks) 
		VALUES (?, 2, ?, ?, 'Main Warehouse', 'Completed', ?)`,
		inventoryID, qtyReceived, poID, remarks)

	if err != nil {
		tx.Rollback()
		log.Printf("❌ ERROR in ReceiveGoods (Ledger Insert): %v\n", err)
		return err
	}

	return tx.Commit()
}
