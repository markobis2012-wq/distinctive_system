package models

import "backend/internal/config"

type ProjectItemComponent struct {
	ComponentID       int     `json:"project_item_component_id"`
	ProjectItemsID    int     `json:"project_items_id"`
	SupplierID        int     `json:"supplier_id"`
	SupplierProductID int     `json:"supplier_product_id"`
	QtyPerItem        int     `json:"qty_per_item"`
	ProdQty           int     `json:"prod_qty"`
	UnitPrice         string  `json:"unit_price"`
	LandedPrice       string  `json:"landed_price"`
	TotalPrice        string  `json:"total_price"`
	SellingPrice      float64 `json:"selling_price"`
	TotalSellingPrice float64 `json:"total_selling_price"`

	// Joined names for UI
	SupplierName string `json:"supplier_name"`
	ProductName  string `json:"product_name"`
}

// Helper struct for the dropdown
type ComponentProductOption struct {
	SupplierProductID int    `json:"supplier_product_id"`
	ProductName       string `json:"product_name"`
	UnitPrice         string `json:"unit_price"`
	LandPrice         string `json:"land_price"` // <-- Add this new field
}

func GetComponentSupplierProducts(supplierID int) ([]ComponentProductOption, error) {
	// Added CAST(land_price AS CHAR) to safely fetch the decimal as a string
	query := `
		SELECT supplier_product_id, COALESCE(supplier_product_name, ''), COALESCE(products_price, '0'), COALESCE(CAST(land_price AS CHAR), '0') 
		FROM tbl_supplier_products 
		WHERE company_id = ? AND is_active = 1`

	rows, err := config.DB.Query(query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ComponentProductOption
	for rows.Next() {
		var p ComponentProductOption
		// Added &p.LandPrice to the scan list
		if err := rows.Scan(&p.SupplierProductID, &p.ProductName, &p.UnitPrice, &p.LandPrice); err == nil {
			list = append(list, p)
		}
	}

	if list == nil {
		list = []ComponentProductOption{}
	}
	return list, nil
}

func GetProjectItemComponents(itemID int) ([]ProjectItemComponent, error) {
	// Updated COALESCE(sp.product_name) to COALESCE(sp.supplier_product_name)
	query := `
		SELECT 
			c.project_item_component_id, c.project_items_id, COALESCE(c.supplier_id, 0), COALESCE(c.supplier_product_id, 0),
			COALESCE(c.qty_per_item, 0), COALESCE(c.prod_qty, 0), COALESCE(c.unit_price, '0'), COALESCE(c.landed_price, '0'), 
			COALESCE(c.total_price, '0'), COALESCE(c.selling_price, 0), COALESCE(c.total_selling_price, 0),
			COALESCE(comp.company_name, 'Unknown'), COALESCE(sp.supplier_product_name, 'Unknown')
		FROM tbl_project_item_component c
		LEFT JOIN tbl_company comp ON c.supplier_id = comp.company_id
		LEFT JOIN tbl_supplier_products sp ON c.supplier_product_id = sp.supplier_product_id
		WHERE c.project_items_id = ?
		ORDER BY c.project_item_component_id DESC`

	rows, err := config.DB.Query(query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comps []ProjectItemComponent
	for rows.Next() {
		var c ProjectItemComponent
		if err := rows.Scan(
			&c.ComponentID, &c.ProjectItemsID, &c.SupplierID, &c.SupplierProductID,
			&c.QtyPerItem, &c.ProdQty, &c.UnitPrice, &c.LandedPrice, &c.TotalPrice,
			&c.SellingPrice, &c.TotalSellingPrice, &c.SupplierName, &c.ProductName,
		); err == nil {
			comps = append(comps, c)
		}
	}
	if comps == nil {
		comps = []ProjectItemComponent{}
	}
	return comps, nil
}

func AddProjectItemComponent(c ProjectItemComponent) error {
	query := `INSERT INTO tbl_project_item_component 
		(project_items_id, supplier_id, supplier_product_id, qty_per_item, prod_qty, unit_price, landed_price, total_price, selling_price, total_selling_price) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := config.DB.Exec(query, c.ProjectItemsID, c.SupplierID, c.SupplierProductID, c.QtyPerItem, c.ProdQty, c.UnitPrice, c.LandedPrice, c.TotalPrice, c.SellingPrice, c.TotalSellingPrice)
	return err
}

func DeleteProjectItemComponent(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_project_item_component WHERE project_item_component_id = ?", id)
	return err
}
