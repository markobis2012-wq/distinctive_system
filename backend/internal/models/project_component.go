package models

import (
	"backend/internal/config"
	"log"
)

type ProjectItemComponent struct {
	ComponentID    int `json:"project_item_component_id"`
	ProjectItemsID int `json:"project_items_id"`

	// Inventory Link & Custom Name
	InventoryID    int    `json:"inventory_id"`
	InventoryName  string `json:"inventory_name"`
	DBOSCode       string `json:"dbos_code"`
	CustomItemName string `json:"custom_item_name"`

	// NEW: Unit of Measure
	UomID   int    `json:"uom_id"`
	UomAbbr string `json:"uom_abbr"`

	// Quantities and Prices
	QtyPerItem        float64 `json:"qty_per_item"`
	ProdQty           float64 `json:"prod_qty"`
	UnitPrice         float64 `json:"unit_price"`
	LandedPrice       float64 `json:"landed_price"`
	TotalPrice        float64 `json:"total_price"`
	SellingPrice      float64 `json:"selling_price"`
	TotalSellingPrice float64 `json:"total_selling_price"`
}

func GetProjectItemComponents(itemID int) ([]ProjectItemComponent, error) {
	query := `
		SELECT 
			c.project_item_component_id, c.project_items_id, 
			COALESCE(c.inventory_id, 0), COALESCE(i.inventory_name, 'Unknown Item'), COALESCE(i.dbos_code, 'N/A'),
			COALESCE(c.custom_item_name, ''),
			COALESCE(c.qty_per_item, 0), COALESCE(c.prod_qty, 0), 
			COALESCE(c.unit_price, 0), COALESCE(c.landed_price, 0), COALESCE(c.total_price, 0), 
			COALESCE(c.selling_price, 0), COALESCE(c.total_selling_price, 0),
			COALESCE(c.uom_id, 0), COALESCE(u.uom_abbr, 'Units')
		FROM tbl_project_item_component c
		LEFT JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON c.uom_id = u.uom_id
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
			&c.CustomItemName,
			&c.QtyPerItem, &c.ProdQty,
			&c.UnitPrice, &c.LandedPrice, &c.TotalPrice,
			&c.SellingPrice, &c.TotalSellingPrice,
			&c.UomID, &c.UomAbbr, // SCAN UOM
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
	query := `INSERT INTO tbl_project_item_component 
		(project_items_id, inventory_id, custom_item_name, uom_id, qty_per_item, prod_qty, unit_price, landed_price, total_price, selling_price, total_selling_price) 
		VALUES (?, NULLIF(?, 0), NULLIF(?, ''), NULLIF(?, 0), ?, ?, ?, ?, ?, ?, ?)`

	_, err := config.DB.Exec(query,
		c.ProjectItemsID,
		c.InventoryID,
		c.CustomItemName,
		c.UomID, // INSERT UOM
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
	CustomItemName         string  `json:"custom_item_name"`
	ProdQty                float64 `json:"prod_qty"`
	ParentItemName         string  `json:"parent_item_name"`
	UomAbbr                string  `json:"uom_abbr"` // NEW: BOM includes UOM
}

func GetAllProjectComponents(projectID int) ([]ProjectBOMItem, error) {
	query := `
		SELECT 
			c.project_item_component_id,
			COALESCE(c.inventory_id, 0),
			COALESCE(i.inventory_name, 'Unknown'),
			COALESCE(i.dbos_code, 'N/A'),
			COALESCE(c.custom_item_name, ''),
			COALESCE(c.prod_qty, 0),
			COALESCE(pi.product_name, 'Unknown'),
			COALESCE(u.uom_abbr, 'Units')
		FROM tbl_project_item_component c
		JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id
		LEFT JOIN tbl_inventory i ON c.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON c.uom_id = u.uom_id
		WHERE pi.project_id = ?
	`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ProjectBOMItem
	for rows.Next() {
		var b ProjectBOMItem
		if err := rows.Scan(&b.ProjectItemComponentID, &b.InventoryID, &b.InventoryName, &b.DBOSCode, &b.CustomItemName, &b.ProdQty, &b.ParentItemName, &b.UomAbbr); err == nil {
			list = append(list, b)
		}
	}
	if list == nil {
		list = []ProjectBOMItem{}
	}
	return list, nil
}
