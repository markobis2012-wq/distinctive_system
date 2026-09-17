package models

import (
	"backend/internal/config"
	"log"
)

type ProjectItemComponent struct {
	ComponentID    int `json:"project_item_component_id"`
	ProjectItemsID int `json:"project_items_id"`

	// NEW: Phase 1 Inventory Link
	InventoryID   int    `json:"inventory_id"`
	InventoryName string `json:"inventory_name"`
	DBOSCode      string `json:"dbos_code"`

	// Phase 4: Supplier Links (will be 0 / NULL during Phase 1)
	SupplierID        int `json:"supplier_id"`
	SupplierProductID int `json:"supplier_product_id"`

	// Quantities and Prices
	QtyPerItem        float64 `json:"qty_per_item"` // Changed to float64 to support decimals
	ProdQty           float64 `json:"prod_qty"`     // Changed to float64 to support decimals
	UnitPrice         string  `json:"unit_price"`
	LandedPrice       string  `json:"landed_price"`
	TotalPrice        string  `json:"total_price"`
	SellingPrice      float64 `json:"selling_price"`
	TotalSellingPrice float64 `json:"total_selling_price"`

	// Joined names for UI (Populated during Phase 4)
	SupplierName string `json:"supplier_name"`
	ProductName  string `json:"product_name"`
}

// Helper struct for the dropdown (We will use this in Phase 4)
type ComponentProductOption struct {
	SupplierProductID int    `json:"supplier_product_id"`
	ProductName       string `json:"product_name"`
	UnitPrice         string `json:"unit_price"`
	LandPrice         string `json:"land_price"`
}

func GetComponentSupplierProducts(supplierID int) ([]ComponentProductOption, error) {
	query := `
		SELECT supplier_product_id, COALESCE(supplier_product_name, ''), COALESCE(products_price, '0'), COALESCE(CAST(land_price AS CHAR), '0') 
		FROM tbl_supplier_products 
		WHERE company_id = ? AND is_active = 1`

	rows, err := config.DB.Query(query, supplierID)
	if err != nil {
		log.Printf("❌ DB Error GetComponentSupplierProducts: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []ComponentProductOption
	for rows.Next() {
		var p ComponentProductOption
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
	// Added the LEFT JOIN to tbl_inventory to pull the Master Item Name & Code
	query := `
		SELECT 
			c.project_item_component_id, c.project_items_id, 
			COALESCE(c.inventory_id, 0), COALESCE(i.inventory_name, 'Unknown Item'), COALESCE(i.dbos_code, 'N/A'),
			COALESCE(c.supplier_id, 0), COALESCE(c.supplier_product_id, 0),
			COALESCE(c.qty_per_item, 0), COALESCE(c.prod_qty, 0), 
			COALESCE(c.unit_price, '0'), COALESCE(c.landed_price, '0'), COALESCE(c.total_price, '0'), 
			COALESCE(c.selling_price, 0), COALESCE(c.total_selling_price, 0),
			COALESCE(comp.company_name, 'Pending Canvas'), COALESCE(sp.supplier_product_name, 'Pending Canvas')
		FROM tbl_project_item_component c
		LEFT JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		LEFT JOIN tbl_company comp ON c.supplier_id = comp.company_id
		LEFT JOIN tbl_supplier_products sp ON c.supplier_product_id = sp.supplier_product_id
		WHERE c.project_items_id = ?
		ORDER BY c.project_item_component_id DESC`

	rows, err := config.DB.Query(query, itemID)
	if err != nil {
		log.Printf("❌ DB Error GetProjectItemComponents: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var comps []ProjectItemComponent
	for rows.Next() {
		var c ProjectItemComponent
		if err := rows.Scan(
			&c.ComponentID, &c.ProjectItemsID,
			&c.InventoryID, &c.InventoryName, &c.DBOSCode,
			&c.SupplierID, &c.SupplierProductID,
			&c.QtyPerItem, &c.ProdQty,
			&c.UnitPrice, &c.LandedPrice, &c.TotalPrice,
			&c.SellingPrice, &c.TotalSellingPrice,
			&c.SupplierName, &c.ProductName,
		); err == nil {
			comps = append(comps, c)
		} else {
			log.Printf("❌ SCAN ERROR in GetProjectItemComponents row: %v\n", err)
		}
	}
	if comps == nil {
		comps = []ProjectItemComponent{}
	}
	return comps, nil
}

func AddProjectItemComponent(c ProjectItemComponent) error {
	// FIX: We use NULLIF(?, 0) for the supplier fields.
	// In Phase 1, the frontend sends supplier_id = 0. NULLIF safely converts this to NULL in MySQL.
	query := `INSERT INTO tbl_project_item_component 
		(project_items_id, inventory_id, supplier_id, supplier_product_id, qty_per_item, prod_qty, unit_price, landed_price, total_price, selling_price, total_selling_price) 
		VALUES (?, ?, NULLIF(?, 0), NULLIF(?, 0), ?, ?, ?, ?, ?, ?, ?)`

	_, err := config.DB.Exec(query,
		c.ProjectItemsID,
		c.InventoryID,
		c.SupplierID,
		c.SupplierProductID,
		c.QtyPerItem,
		c.ProdQty,
		c.UnitPrice,
		c.LandedPrice,
		c.TotalPrice,
		c.SellingPrice,
		c.TotalSellingPrice,
	)

	if err != nil {
		log.Printf("❌ DB Error AddProjectItemComponent: %v\n", err)
	}

	return err
}

func DeleteProjectItemComponent(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_project_item_component WHERE project_item_component_id = ?", id)
	return err
}

type ProjectBOMItem struct {
	ProjectItemComponentID int     `json:"project_item_component_id"`
	InventoryID            int     `json:"inventory_id"`
	InventoryName          string  `json:"inventory_name"`
	DBOSCode               string  `json:"dbos_code"`
	ProdQty                float64 `json:"prod_qty"`
	ParentItemName         string  `json:"parent_item_name"` // To show WHAT it's being used for
}

// Fetch the complete BOM for the entire project
func GetAllProjectComponents(projectID int) ([]ProjectBOMItem, error) {
	query := `
		SELECT 
			c.project_item_component_id,
			COALESCE(c.inventory_id, 0),
			COALESCE(i.inventory_name, 'Unknown'),
			COALESCE(i.dbos_code, 'N/A'),
			COALESCE(c.prod_qty, 0),
			COALESCE(pi.product_name, 'Unknown')
		FROM tbl_project_item_component c
		JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id
		LEFT JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		WHERE pi.project_id = ?
	`

	log.Printf("Executing GetAllProjectComponents for project_id: %d", projectID)

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		// THIS WILL PRINT THE EXACT SQL ERROR TO YOUR TERMINAL
		log.Printf("❌ DATABASE ERROR in GetAllProjectComponents: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []ProjectBOMItem
	for rows.Next() {
		var b ProjectBOMItem
		if err := rows.Scan(&b.ProjectItemComponentID, &b.InventoryID, &b.InventoryName, &b.DBOSCode, &b.ProdQty, &b.ParentItemName); err == nil {
			list = append(list, b)
		} else {
			log.Printf("❌ SCAN ERROR in GetAllProjectComponents row: %v\n", err)
		}
	}
	if list == nil {
		list = []ProjectBOMItem{}
	}

	log.Printf("✅ Successfully fetched %d BOM items", len(list))
	return list, nil
}
