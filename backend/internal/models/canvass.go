package models

import (
	"backend/internal/config"
	"errors"
	"log"
)

type CanvassItem struct {
	ProjectItemComponentID int     `json:"project_item_component_id"`
	ProjectName            string  `json:"project_name"`
	ParentProductName      string  `json:"parent_product_name"`
	InventoryID            int     `json:"inventory_id"`
	InventoryName          string  `json:"inventory_name"`
	DBOSCode               string  `json:"dbos_code"`
	ProdQty                float64 `json:"prod_qty"`
	HasSelectedSupplier    bool    `json:"has_selected_supplier"`
}

type Quotation struct {
	CanvassID              int     `json:"canvass_id"`
	ProjectItemComponentID int     `json:"project_item_component_id"`
	SupplierID             int     `json:"supplier_id"`
	SupplierName           string  `json:"supplier_name"`
	RFQNumber              string  `json:"rfq_number"`
	QuotedUnitPrice        float64 `json:"quoted_unit_price"`
	QuotedLandedPrice      float64 `json:"quoted_landed_price"`
	QuotedSellingPrice     float64 `json:"quoted_selling_price"`
	Remarks                string  `json:"remarks"`
	IsSelected             bool    `json:"is_selected"`
	DateQuoted             string  `json:"date_quoted"`
}

// Fetch all BOM components that need canvassing or have shortages
func GetItemsForCanvassing() ([]CanvassItem, error) {
	query := `
		SELECT 
			c.project_item_component_id,
			COALESCE(p.project_name, 'Unknown Project'),
			COALESCE(pi.product_name, 'Unknown Item'),
			c.inventory_id,
			COALESCE(i.inventory_name, 'Unknown Material'),
			COALESCE(i.dbos_code, 'N/A'),
			c.prod_qty,
			EXISTS(SELECT 1 FROM tbl_canvass_quotations q WHERE q.project_item_component_id = c.project_item_component_id AND q.is_selected = 1) as has_selected
		FROM tbl_project_item_component c
		JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id
		JOIN projects p ON pi.project_id = p.projects_id
		LEFT JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		WHERE c.supplier_id IS NULL OR c.supplier_id = 0
		ORDER BY c.project_item_component_id DESC
	`
	rows, err := config.DB.Query(query)
	if err != nil {
		log.Printf("❌ DB Error GetItemsForCanvassing: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []CanvassItem
	for rows.Next() {
		var item CanvassItem
		if err := rows.Scan(&item.ProjectItemComponentID, &item.ProjectName, &item.ParentProductName, &item.InventoryID, &item.InventoryName, &item.DBOSCode, &item.ProdQty, &item.HasSelectedSupplier); err == nil {
			list = append(list, item)
		}
	}
	if list == nil {
		list = []CanvassItem{}
	}
	return list, nil
}

// Fetch all supplier quotations for a specific BOM component
func GetQuotationsForComponent(componentID int) ([]Quotation, error) {
	query := `
		SELECT 
			q.canvass_id, q.project_item_component_id, q.supplier_id,
			COALESCE(comp.company_name, 'Unknown Supplier'),
			COALESCE(q.rfq_number, ''),
			COALESCE(q.quoted_unit_price, 0),
			COALESCE(q.quoted_landed_price, 0),
			COALESCE(q.quoted_selling_price, 0),
			COALESCE(q.remarks, ''),
			q.is_selected,
			CAST(q.date_quoted AS CHAR)
		FROM tbl_canvass_quotations q
		LEFT JOIN tbl_company comp ON q.supplier_id = comp.company_id
		WHERE q.project_item_component_id = ?
		ORDER BY q.quoted_landed_price ASC
	`
	rows, err := config.DB.Query(query, componentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quotes []Quotation
	for rows.Next() {
		var q Quotation
		if err := rows.Scan(&q.CanvassID, &q.ProjectItemComponentID, &q.SupplierID, &q.SupplierName, &q.RFQNumber, &q.QuotedUnitPrice, &q.QuotedLandedPrice, &q.QuotedSellingPrice, &q.Remarks, &q.IsSelected, &q.DateQuoted); err == nil {
			quotes = append(quotes, q)
		}
	}
	if quotes == nil {
		quotes = []Quotation{}
	}
	return quotes, nil
}

// Add a supplier quotation (Canvass entry)
func AddQuotation(q Quotation) error {
	query := `
		INSERT INTO tbl_canvass_quotations 
		(project_item_component_id, supplier_id, rfq_number, quoted_unit_price, quoted_landed_price, quoted_selling_price, remarks)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := config.DB.Exec(query, q.ProjectItemComponentID, q.SupplierID, q.RFQNumber, q.QuotedUnitPrice, q.QuotedLandedPrice, q.QuotedSellingPrice, q.Remarks)
	return err
}

// Select/Award the winning supplier quote and update the component
func AwardQuotation(canvassID int, componentID int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Unselect all quotes for this component
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 0 WHERE project_item_component_id = ?`, componentID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Mark this specific quote as selected
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 1 WHERE canvass_id = ?`, canvassID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Get the quoted prices and supplier_id
	var supplierID int
	var unitPrice, landedPrice, sellingPrice float64
	err = tx.QueryRow(`SELECT supplier_id, quoted_unit_price, quoted_landed_price, quoted_selling_price FROM tbl_canvass_quotations WHERE canvass_id = ?`, canvassID).Scan(&supplierID, &unitPrice, &landedPrice, &sellingPrice)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 4. Update the main BOM component with the winning supplier and pricing (Transitioning to Phase 4 readiness!)
	queryUpdateComp := `
		UPDATE tbl_project_item_component 
		SET supplier_id = ?, unit_price = ?, landed_price = ?, selling_price = ?, total_price = (prod_qty * ?), total_selling_price = (prod_qty * ?)
		WHERE project_item_component_id = ?
	`
	_, err = tx.Exec(queryUpdateComp, supplierID, unitPrice, landedPrice, sellingPrice, landedPrice, sellingPrice, componentID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

// Update the prices of an existing quotation (After supplier replies to RFQ)
func UpdateQuotationPrices(canvassID int, unitPrice, landedPrice, sellingPrice float64, remarks string) error {
	query := `
		UPDATE tbl_canvass_quotations 
		SET quoted_unit_price = ?, quoted_landed_price = ?, quoted_selling_price = ?, remarks = ? 
		WHERE canvass_id = ?`
	_, err := config.DB.Exec(query, unitPrice, landedPrice, sellingPrice, remarks, canvassID)
	return err
}

type BulkRFQRequest struct {
	SupplierID   int    `json:"supplier_id"`
	RFQNumber    string `json:"rfq_number"`
	ComponentIDs []int  `json:"component_ids"`
}

// Add a quotation entry for multiple items at once (Consolidated RFQ)
func AddBulkQuotations(req BulkRFQRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	query := `
		INSERT INTO tbl_canvass_quotations 
		(project_item_component_id, supplier_id, rfq_number, quoted_unit_price, quoted_landed_price, quoted_selling_price, remarks)
		VALUES (?, ?, ?, 0, 0, 0, '')
	`

	for _, compID := range req.ComponentIDs {
		_, err := tx.Exec(query, compID, req.SupplierID, req.RFQNumber)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

type AwardedComponent struct {
	ProjectItemComponentID int     `json:"project_item_component_id"`
	ProjectName            string  `json:"project_name"`
	InventoryName          string  `json:"inventory_name"`
	DBOSCode               string  `json:"dbos_code"`
	SupplierID             int     `json:"supplier_id"`
	SupplierName           string  `json:"supplier_name"`
	ProdQty                float64 `json:"prod_qty"`
	LandedPrice            float64 `json:"landed_price"`
	TotalPrice             float64 `json:"total_price"`
	PONumber               string  `json:"po_number"`
}

// Fetch items that have been awarded to a supplier
func GetAwardedComponents() ([]AwardedComponent, error) {
	query := `
		SELECT 
			c.project_item_component_id,
			COALESCE(p.project_name, 'Unknown'),
			COALESCE(i.inventory_name, 'Unknown'),
			COALESCE(i.dbos_code, 'N/A'),
			c.supplier_id,
			COALESCE(comp.company_name, 'Unknown Supplier'),
			c.prod_qty,
			c.landed_price,
			c.total_price,
			COALESCE(c.po_number, '')
		FROM tbl_project_item_component c
		JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id
		JOIN projects p ON pi.project_id = p.projects_id
		JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		JOIN tbl_company comp ON c.supplier_id = comp.company_id
		WHERE c.supplier_id IS NOT NULL AND c.supplier_id > 0
		ORDER BY c.po_number ASC, comp.company_name ASC
	`
	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []AwardedComponent
	for rows.Next() {
		var a AwardedComponent
		if err := rows.Scan(&a.ProjectItemComponentID, &a.ProjectName, &a.InventoryName, &a.DBOSCode, &a.SupplierID, &a.SupplierName, &a.ProdQty, &a.LandedPrice, &a.TotalPrice, &a.PONumber); err == nil {
			list = append(list, a)
		}
	}
	if list == nil {
		list = []AwardedComponent{}
	}
	return list, nil
}

// Lock items into a Purchase Order
func GeneratePO(poNumber string, componentIDs []int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	query := `UPDATE tbl_project_item_component SET po_number = ? WHERE project_item_component_id = ?`
	for _, id := range componentIDs {
		_, err := tx.Exec(query, poNumber, id)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

// Cancel an award before a PO is officially generated
func CancelAward(componentID int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Unselect the quotation in the canvassing table
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 0 WHERE project_item_component_id = ?`, componentID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Reset the component's supplier and prices (ONLY if po_number is empty)
	queryUpdateComp := `
		UPDATE tbl_project_item_component 
		SET supplier_id = NULL, unit_price = 0, landed_price = 0, selling_price = 0, total_price = 0, total_selling_price = 0
		WHERE project_item_component_id = ? AND (po_number IS NULL OR po_number = '')
	`
	res, err := tx.Exec(queryUpdateComp, componentID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Check if any row was actually updated
	affected, _ := res.RowsAffected()
	if affected == 0 {
		tx.Rollback()
		return errors.New("cannot cancel an award that already has a generated PO")
	}

	return tx.Commit()
}
