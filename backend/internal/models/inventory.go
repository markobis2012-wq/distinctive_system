package models

import (
	"backend/internal/config"
	"errors"
	"fmt"
	"log"
	"time"
)

type Attribute struct {
	AttributeID   int    `json:"attribute_id"`
	AttributeName string `json:"attribute_name"`
	DataType      string `json:"data_type"`
}

type InvAttribute struct {
	AttributeID   int    `json:"attribute_id"`
	AttributeName string `json:"attribute_name"`
	DataType      string `json:"data_type"`
	Value         string `json:"value"`
}

type Inventory struct {
	InventoryID     int              `json:"inventory_id" form:"inventory_id"`
	DBOSCode        string           `json:"dbos_code" form:"dbos_code"`
	InventoryName   string           `json:"inventory_name" form:"inventory_name"`
	Description     string           `json:"description" form:"description"`
	UOMID           int              `json:"uom_id" form:"uom_id"`
	QtyOnHand       float64          `json:"qty_on_hand" form:"qty_on_hand"`
	ImagePath       string           `json:"image_path" form:"image_path"`
	IsActive        bool             `json:"is_active" form:"is_active"`
	Attributes      []InvAttribute   `json:"attributes" form:"attributes"`
	Classifications []Classification `json:"classifications" form:"classifications"` // NEW
}

type AddStockRequest struct {
	SupplierID        int     `json:"supplier_id" form:"supplier_id"`
	SupplierProductID int     `json:"supplier_product_id" form:"supplier_product_id"`
	QtyAdded          float64 `json:"qty_added" form:"qty_added"`
	UOMID             int     `json:"uom_id" form:"uom_id"`
	Remarks           string  `json:"remarks" form:"remarks"`
	CreatedBy         string  `json:"created_by" form:"created_by"` // NEW: Pass the user who made the addition
}

type LedgerHistory struct {
	LedgerID        int     `json:"ledger_id"`
	TransactionType string  `json:"transaction_type"`
	TransactionName string  `json:"transaction_name"`
	QtyChange       float64 `json:"qty_change"`
	ReferenceID     int     `json:"reference_id"`
	Remarks         string  `json:"remarks"`
	CreatedBy       string  `json:"created_by"`
	CreatedAt       string  `json:"created_at"`
}

type AddedStockHistory struct {
	AddInventoryID int     `json:"add_inventory_id"`
	SupplierName   string  `json:"supplier_name"`
	QtyAdded       float64 `json:"qty_added"`
	Remarks        string  `json:"remarks"`
	DateAdded      string  `json:"date_added"`
}

type Classification struct {
	ClassificationID   int    `json:"classification_id"`
	ClassificationName string `json:"classification_name"`
}

// --- CLASSIFICATION MASTER FUNCTIONS ---
func GetAllClassifications() ([]Classification, error) {
	rows, err := config.DB.Query(`SELECT classification_id, classification_name FROM tbl_classifications ORDER BY classification_name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var classes []Classification
	for rows.Next() {
		var c Classification
		if err := rows.Scan(&c.ClassificationID, &c.ClassificationName); err == nil {
			classes = append(classes, c)
		}
	}
	if classes == nil {
		classes = []Classification{}
	}
	return classes, nil
}

func CreateClassification(class Classification) (int, error) {
	res, err := config.DB.Exec(`INSERT INTO tbl_classifications (classification_name) VALUES (?)`, class.ClassificationName)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return int(id), nil
}

func GetAllAttributes() ([]Attribute, error) {
	rows, err := config.DB.Query(`SELECT attribute_id, attribute_name, data_type FROM tbl_attributes ORDER BY attribute_name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attrs []Attribute
	for rows.Next() {
		var a Attribute
		if err := rows.Scan(&a.AttributeID, &a.AttributeName, &a.DataType); err == nil {
			attrs = append(attrs, a)
		}
	}
	if attrs == nil {
		attrs = []Attribute{}
	}
	return attrs, nil
}

func CreateAttribute(attr Attribute) error {
	_, err := config.DB.Exec(`INSERT INTO tbl_attributes (attribute_name, data_type) VALUES (?, ?)`, attr.AttributeName, attr.DataType)
	return err
}

func DeleteAttribute(id int) error {
	// Delete links first
	config.DB.Exec(`DELETE FROM tbl_inventory_attributes WHERE attribute_id = ?`, id)
	_, err := config.DB.Exec(`DELETE FROM tbl_attributes WHERE attribute_id = ?`, id)
	return err
}

// --- UPDATED INVENTORY FUNCTIONS ---
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
			// Initialize empty arrays so JSON doesn't return null
			i.Attributes = []InvAttribute{}
			i.Classifications = []Classification{}
			items = append(items, i)
		}
	}

	// CRITICAL FIX: Map the pointers AFTER the slice is fully built
	// so memory re-allocation doesn't break the references.
	itemMap := make(map[int]*Inventory)
	for idx := range items {
		itemMap[items[idx].InventoryID] = &items[idx]
	}

	// 1. Fetch & Attach Attributes
	attrQuery := `
        SELECT ia.inventory_id, a.attribute_id, a.attribute_name, a.data_type, ia.attribute_value 
        FROM tbl_inventory_attributes ia 
        JOIN tbl_attributes a ON ia.attribute_id = a.attribute_id
    `
	attrRows, err := config.DB.Query(attrQuery)
	if err == nil {
		defer attrRows.Close()
		for attrRows.Next() {
			var invID int
			var attr InvAttribute
			if err := attrRows.Scan(&invID, &attr.AttributeID, &attr.AttributeName, &attr.DataType, &attr.Value); err == nil {
				if item, exists := itemMap[invID]; exists {
					item.Attributes = append(item.Attributes, attr)
				}
			}
		}
	}

	// 2. Fetch & Attach Classifications (Tags)
	classQuery := `
        SELECT ic.inventory_id, c.classification_id, c.classification_name 
        FROM tbl_inventory_classifications ic 
        JOIN tbl_classifications c ON ic.classification_id = c.classification_id
    `
	classRows, err := config.DB.Query(classQuery)
	if err == nil {
		defer classRows.Close()
		for classRows.Next() {
			var invID int
			var c Classification
			if err := classRows.Scan(&invID, &c.ClassificationID, &c.ClassificationName); err == nil {
				if item, exists := itemMap[invID]; exists {
					item.Classifications = append(item.Classifications, c)
				}
			}
		}
	}

	if items == nil {
		items = []Inventory{}
	}
	return items, nil
}

func SaveInventoryClassifications(invID int, classIDs []int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}
	tx.Exec(`DELETE FROM tbl_inventory_classifications WHERE inventory_id = ?`, invID)

	for _, cID := range classIDs {
		tx.Exec(`INSERT INTO tbl_inventory_classifications (inventory_id, classification_id) VALUES (?, ?)`, invID, cID)
	}
	return tx.Commit()
}

func SaveInventoryAttributes(invID int, attrs []InvAttribute) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// Clear existing attributes for this item
	tx.Exec(`DELETE FROM tbl_inventory_attributes WHERE inventory_id = ?`, invID)

	// Insert new ones
	for _, attr := range attrs {
		if attr.Value != "" {
			// CRITICAL: The 3rd parameter here must be attr.Value
			tx.Exec(`INSERT INTO tbl_inventory_attributes (inventory_id, attribute_id, attribute_value) VALUES (?, ?, ?)`,
				invID, attr.AttributeID, attr.Value)
		}
	}
	return tx.Commit()
}

func CreateInventory(inv Inventory) (int, error) {
	log.Println("====== INVENTORY CREATION LOG (BACKEND) ======")
	// %+v prints the struct names alongside their values so you can see EVERYTHING Gin captured
	log.Printf("Raw struct received: %+v\n", inv)
	log.Printf("DBOS Code: '%s'", inv.DBOSCode)
	log.Printf("Item Name: '%s'", inv.InventoryName)
	log.Printf("UOM ID Received: %d", inv.UOMID)
	log.Println("==============================================")

	if inv.UOMID == 0 {
		log.Println("CRITICAL ERROR: UOMID is 0! The backend failed to capture the uom_id from the frontend form.")
		// Fail and return an error so the frontend doesn't save bad data with UOM = 1
		return 0, errors.New("uom_id is missing or 0. Form data did not bind correctly")
	}

	query := `INSERT INTO tbl_inventory (dbos_code, inventory_name, description, uom_id, qty_on_hand, image_path, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`
	res, err := config.DB.Exec(query, inv.DBOSCode, inv.InventoryName, inv.Description, inv.UOMID, 0.00, inv.ImagePath, true)
	if err != nil {
		log.Printf("Database execution error: %v\n", err)
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

	// Determine the correct transaction type
	transactionTypeID := 3 // Default: MANUAL_ADD
	if req.SupplierID > 0 {
		transactionTypeID = 2 // PO_RECEIPT
	}

	// 1. Insert into Central Ledger
	// Passing SupplierID as the ReferenceID if it's a PO
	_, err = tx.Exec(`
        INSERT INTO tbl_inventory_ledger 
        (inventory_id, transaction_type_id, qty_change, reference_id, remarks, created_by) 
        VALUES (?, ?, ?, ?, ?, ?)`,
		inventoryID, transactionTypeID, req.QtyAdded, req.SupplierID, req.Remarks, req.CreatedBy,
	)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Update Master Inventory Balance
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ?, date_modified = ? WHERE inventory_id = ?`,
		req.QtyAdded, time.Now(), inventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func GetInventoryLedgerHistory(inventoryID int) ([]ItemLedgerEntry, error) {
	query := `
        SELECT 
            l.ledger_id,
            DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i') as created_at, 
            tt.transaction_name, 
            l.qty_change, 
            COALESCE(l.destination, 'N/A'), 
            COALESCE(l.remarks, ''),
            COALESCE(l.created_by, '')
        FROM tbl_inventory_ledger l
        JOIN tbl_inventory_transaction_types tt ON l.transaction_type_id = tt.transaction_type_id
        WHERE l.inventory_id = ? 
        ORDER BY l.created_at DESC`

	rows, err := config.DB.Query(query, inventoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ItemLedgerEntry
	for rows.Next() {
		var e ItemLedgerEntry
		// Make sure Scan matches the exact order of the SELECT statement
		if err := rows.Scan(&e.LedgerID, &e.CreatedAt, &e.TransactionName, &e.QtyChange, &e.Destination, &e.Remarks, &e.CreatedBy); err == nil {
			list = append(list, e)
		}
	}
	if list == nil {
		list = []ItemLedgerEntry{}
	}
	return list, nil
}

func UpdateInventoryLedgerStock(ledgerID int, newQtyChange float64, newRemarks string) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	var oldQtyChange float64
	var invID int
	err = tx.QueryRow(`SELECT inventory_id, qty_change FROM tbl_inventory_ledger WHERE ledger_id = ?`, ledgerID).Scan(&invID, &oldQtyChange)
	if err != nil {
		tx.Rollback()
		return err
	}

	qtyDifference := newQtyChange - oldQtyChange

	// Ensure master stock doesn't fall below zero due to this edit
	var masterQty float64
	tx.QueryRow(`SELECT qty_on_hand FROM tbl_inventory WHERE inventory_id = ?`, invID).Scan(&masterQty)
	if masterQty+qtyDifference < 0 {
		tx.Rollback()
		return errors.New("updating this record would cause master stock to fall below zero")
	}

	// 1. Update the ledger row
	_, err = tx.Exec(`UPDATE tbl_inventory_ledger SET qty_change = ?, remarks = ? WHERE ledger_id = ?`, newQtyChange, newRemarks, ledgerID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Adjust the master inventory balance by the net difference
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ? WHERE inventory_id = ?`, qtyDifference, invID)
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
	CreatedBy   string  `json:"created_by"` // NEW: Track who returned it
}

func ProcessReturnToStock(req RTSRequest) error {
	if req.ReturnQty <= 0 {
		return errors.New("return quantity must be greater than zero")
	}

	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Log to the Unified Ledger (Type 5 = RETURN)
	remarks := "Returned to Stock (RTS)"
	if req.Notes != "" {
		remarks += " - Notes: " + req.Notes
	}

	_, err = tx.Exec(`
        INSERT INTO tbl_inventory_ledger 
        (inventory_id, transaction_type_id, qty_change, project_id, remarks, created_by) 
        VALUES (?, 5, ?, ?, ?, ?)`,
		req.InventoryID, req.ReturnQty, req.ProjectID, remarks, req.CreatedBy,
	)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Increment Master Inventory
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = COALESCE(qty_on_hand, 0) + ?, date_modified = ? WHERE inventory_id = ?`,
		req.ReturnQty, time.Now(), req.InventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

type ItemLedgerEntry struct {
	LedgerID        int     `json:"ledger_id"` // Add this
	CreatedAt       string  `json:"created_at"`
	TransactionName string  `json:"transaction_name"`
	QtyChange       float64 `json:"qty_change"`
	Destination     string  `json:"destination"`
	Remarks         string  `json:"remarks"`
	CreatedBy       string  `json:"created_by"` // Add this
}

type ItemSupplier struct {
	CompanyName  string  `json:"company_name"`
	SupplierSKU  string  `json:"supplier_sku"`
	SellingPrice string  `json:"selling_price"`
	LandedPrice  float64 `json:"landed_price"`
}

func GetSuppliersForItem(dbosCode string) ([]ItemSupplier, error) {
	query := `
        SELECT c.company_name, COALESCE(sp.sup_product_code, 'N/A'), COALESCE(sp.products_price, '0'), sp.land_price
        FROM tbl_supplier_products sp
        JOIN tbl_company c ON sp.company_id = c.company_id
        WHERE sp.dbos_code = ? AND sp.is_active = 1`

	rows, err := config.DB.Query(query, dbosCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ItemSupplier
	for rows.Next() {
		var s ItemSupplier
		if err := rows.Scan(&s.CompanyName, &s.SupplierSKU, &s.SellingPrice, &s.LandedPrice); err == nil {
			list = append(list, s)
		}
	}
	if list == nil {
		list = []ItemSupplier{}
	}
	return list, nil
}

type ItemMRFHistory struct {
	MRFNumber    string  `json:"mrf_number"`
	ProjectName  string  `json:"project_name"`
	QtyRequested float64 `json:"qty_requested"`
	QtyIssued    float64 `json:"qty_issued"` // NEW: Added to support the frontend pending calculations
	Status       string  `json:"status"`
	PONumber     string  `json:"po_number"`
	POEta        string  `json:"po_eta"`
}

func GetItemMRFHistory(inventoryID int) ([]ItemMRFHistory, error) {
	query := `
        SELECT 
            m.mrf_number, 
            p.project_name, 
            mi.qty_requested, 
            COALESCE(mi.qty_issued, 0) as qty_issued,
            mi.status, 
            COALESCE(po.po_number, 'N/A'), 
            COALESCE(CAST(po.expected_delivery_date AS CHAR), 'Pending Update')
        FROM tbl_mrf_items mi
        JOIN tbl_mrf m ON mi.mrf_id = m.mrf_id
        JOIN projects p ON m.project_id = p.projects_id
        LEFT JOIN tbl_po_items poi ON poi.mrf_item_id = mi.mrf_item_id
        LEFT JOIN tbl_po po ON poi.po_id = po.po_id
        WHERE mi.inventory_id = ?
        ORDER BY m.date_requested DESC`

	rows, err := config.DB.Query(query, inventoryID)
	if err != nil {
		// THIS WILL PRINT THE EXACT MYSQL ERROR TO YOUR TERMINAL
		log.Printf("❌ SQL ERROR in GetItemMRFHistory: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []ItemMRFHistory
	for rows.Next() {
		var h ItemMRFHistory
		// Notice QtyIssued is now included in the Scan
		if err := rows.Scan(&h.MRFNumber, &h.ProjectName, &h.QtyRequested, &h.QtyIssued, &h.Status, &h.PONumber, &h.POEta); err == nil {
			list = append(list, h)
		} else {
			log.Printf("❌ SCAN ERROR in GetItemMRFHistory: %v\n", err)
		}
	}
	if list == nil {
		list = []ItemMRFHistory{}
	}
	return list, nil
}

type InventorySupplier struct {
	MappingID           int     `json:"mapping_id"`
	InventoryID         int     `json:"inventory_id"`
	SupplierProductID   int     `json:"supplier_product_id"`
	CompanyName         string  `json:"company_name"`
	SupProductCode      string  `json:"sup_product_code"`
	SupplierProductName string  `json:"supplier_product_name"`
	LeadTimeDays        int     `json:"lead_time_days"`
	MOQ                 float64 `json:"moq"`
	LandedPrice         float64 `json:"landed_price"`
	IsPreferred         bool    `json:"is_preferred"`
}

type CatalogItem struct {
	SupplierProductID   int    `json:"supplier_product_id"`
	CompanyName         string `json:"company_name"`
	SupplierProductName string `json:"supplier_product_name"`
}

func GetInventorySuppliers(inventoryID int) ([]InventorySupplier, error) {
	query := `
        SELECT 
            map.mapping_id, map.inventory_id, map.supplier_product_id,
            c.company_name, COALESCE(sp.sup_product_code, ''), sp.supplier_product_name,
            map.lead_time_days, map.moq, COALESCE(sp.land_price, 0), map.is_preferred
        FROM tbl_inventory_suppliers map
        JOIN tbl_supplier_products sp ON map.supplier_product_id = sp.supplier_product_id
        JOIN tbl_company c ON sp.company_id = c.company_id
        WHERE map.inventory_id = ?
        ORDER BY map.is_preferred DESC, c.company_name ASC`

	rows, err := config.DB.Query(query, inventoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []InventorySupplier
	for rows.Next() {
		var s InventorySupplier
		if err := rows.Scan(&s.MappingID, &s.InventoryID, &s.SupplierProductID, &s.CompanyName, &s.SupProductCode, &s.SupplierProductName, &s.LeadTimeDays, &s.MOQ, &s.LandedPrice, &s.IsPreferred); err == nil {
			list = append(list, s)
		}
	}
	if list == nil {
		list = []InventorySupplier{}
	}
	return list, nil
}

func GetCatalogOptionsForMapping(dbosCode string) ([]CatalogItem, error) {
	query := `
        SELECT sp.supplier_product_id, c.company_name, sp.supplier_product_name
        FROM tbl_supplier_products sp
        JOIN tbl_company c ON sp.company_id = c.company_id
        WHERE sp.dbos_code = ? AND sp.is_active = 1`

	rows, err := config.DB.Query(query, dbosCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []CatalogItem
	for rows.Next() {
		var c CatalogItem
		if err := rows.Scan(&c.SupplierProductID, &c.CompanyName, &c.SupplierProductName); err == nil {
			list = append(list, c)
		}
	}
	if list == nil {
		list = []CatalogItem{}
	}
	return list, nil
}

func AddInventorySupplier(s InventorySupplier) error {
	_, err := config.DB.Exec(`
        INSERT INTO tbl_inventory_suppliers (inventory_id, supplier_product_id, lead_time_days, moq) 
        VALUES (?, ?, ?, ?)`,
		s.InventoryID, s.SupplierProductID, s.LeadTimeDays, s.MOQ)
	return err
}

func DeleteInventorySupplier(mappingID int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_inventory_suppliers WHERE mapping_id = ?", mappingID)
	return err
}

func SetPreferredSupplier(inventoryID int, mappingID int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}
	_, err = tx.Exec("UPDATE tbl_inventory_suppliers SET is_preferred = 0 WHERE inventory_id = ?", inventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}
	_, err = tx.Exec("UPDATE tbl_inventory_suppliers SET is_preferred = 1 WHERE mapping_id = ?", mappingID)
	if err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

type TransactionType struct {
	TransactionTypeID int    `json:"transaction_type_id"`
	TransactionCode   string `json:"transaction_code"`
	TransactionName   string `json:"transaction_name"`
}

func GetTransactionTypes() ([]TransactionType, error) {
	query := `SELECT transaction_type_id, transaction_code, transaction_name FROM tbl_inventory_transaction_types WHERE is_active = 1`
	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []TransactionType
	for rows.Next() {
		var t TransactionType
		if err := rows.Scan(&t.TransactionTypeID, &t.TransactionCode, &t.TransactionName); err == nil {
			list = append(list, t)
		}
	}
	if list == nil {
		list = []TransactionType{}
	}
	return list, nil
}

type ManualLedgerEntry struct {
	TransactionTypeID int     `json:"transaction_type_id"`
	Qty               float64 `json:"qty"`
	Remarks           string  `json:"remarks"`
	ReferenceID       *int    `json:"reference_id"` // Pointer allows nulls
	ProjectID         *int    `json:"project_id"`   // Pointer allows nulls
	CreatedBy         string  `json:"created_by"`
}

func AddManualLedgerEntry(inventoryID int, entry ManualLedgerEntry) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Find if this type is a deduction or addition
	var code string
	err = tx.QueryRow("SELECT transaction_code FROM tbl_inventory_transaction_types WHERE transaction_type_id = ?", entry.TransactionTypeID).Scan(&code)
	if err != nil {
		tx.Rollback()
		return err
	}

	multiplier := 1.0
	// If it's a manual deduction or an MRF issue, subtract the qty
	if code == "MANUAL_SUB" || code == "MRF_ISSUE" {
		multiplier = -1.0
	}
	qtyChange := entry.Qty * multiplier

	// Force default remark if left empty
	if entry.Remarks == "" {
		entry.Remarks = "Manual adjustment via terminal"
	}

	// 2. Insert the ledger record WITH all tracking fields
	_, err = tx.Exec(`
        INSERT INTO tbl_inventory_ledger 
        (inventory_id, transaction_type_id, qty_change, reference_id, project_id, destination, status, remarks, created_by) 
        VALUES (?, ?, ?, ?, ?, 'Main Warehouse', 'Completed', ?, ?)`,
		inventoryID, entry.TransactionTypeID, qtyChange, entry.ReferenceID, entry.ProjectID, entry.Remarks, entry.CreatedBy)

	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Update the master inventory quantity
	_, err = tx.Exec(`UPDATE tbl_inventory SET qty_on_hand = qty_on_hand + ? WHERE inventory_id = ?`, qtyChange, inventoryID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func DeleteLedgerEntry(ledgerID int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	var invID int
	var qtyChange float64

	// 1. Get the exact quantity change of the transaction
	err = tx.QueryRow("SELECT inventory_id, qty_change FROM tbl_inventory_ledger WHERE ledger_id = ?", ledgerID).Scan(&invID, &qtyChange)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("transaction not found: %v", err)
	}

	// 2. Reverse the mathematical effect on Master Inventory
	// If qtyChange is positive (addition), subtracting it removes it.
	// If qtyChange is negative (deduction), subtracting a negative adds it back!
	_, err = tx.Exec("UPDATE tbl_inventory SET qty_on_hand = qty_on_hand - ? WHERE inventory_id = ?", qtyChange, invID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Finally, delete the ledger record
	_, err = tx.Exec("DELETE FROM tbl_inventory_ledger WHERE ledger_id = ?", ledgerID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
