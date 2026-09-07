package models

import (
	"backend/internal/config"
)

type LoadingListItem struct {
	LoadingListID          int `json:"loading_list_id"`
	DeliveryID             int `json:"delivery_id"`
	ProjectItemID          int `json:"project_item_id"`
	ProjectItemComponentID int `json:"project_item_component_id"`
	ItemQty                int `json:"item_qty"`

	// Joined Data for Frontend/Print
	ProductName    string `json:"product_name"`
	ItemImage      string `json:"dbos_image_path"`
	ItemDesc       string `json:"product_description"`
	ComponentName  string `json:"supplier_product_name"`
	ComponentDesc  string `json:"prod_description"`
	ComponentImage string `json:"product_image"`
	UOMAbbr        string `json:"uom_abbr"`
}

func GetLoadingListItems(deliveryID int) ([]LoadingListItem, error) {
	query := `
		SELECT a.loading_list_id, a.delivery_id, a.project_item_id, COALESCE(a.project_item_component_id, 0), a.item_qty,
		       COALESCE(d.product_name, ''), COALESCE(d.dbos_image_path, ''), COALESCE(d.product_description, ''),
		       COALESCE(e.supplier_product_name, ''), COALESCE(e.prod_description, ''), COALESCE(e.product_image, ''),
		       COALESCE(f.uom_abbr, '')
		FROM tbl_loading_list a
		LEFT JOIN tbl_project_item_component c ON c.project_item_component_id = a.project_item_component_id
		LEFT JOIN tbl_project_items d ON d.project_items_id = a.project_item_id
		LEFT JOIN tbl_supplier_products e ON e.supplier_product_id = c.supplier_product_id
		LEFT JOIN tbl_uom f ON f.uom_id = d.uom
		WHERE a.delivery_id = ?
		ORDER BY a.project_item_id ASC`

	rows, err := config.DB.Query(query, deliveryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []LoadingListItem
	for rows.Next() {
		var i LoadingListItem
		if err := rows.Scan(&i.LoadingListID, &i.DeliveryID, &i.ProjectItemID, &i.ProjectItemComponentID, &i.ItemQty, &i.ProductName, &i.ItemImage, &i.ItemDesc, &i.ComponentName, &i.ComponentDesc, &i.ComponentImage, &i.UOMAbbr); err == nil {
			items = append(items, i)
		}
	}
	if items == nil {
		items = []LoadingListItem{}
	}
	return items, nil
}

func AddLoadingListItems(deliveryID int, projectItemID int, deliverQty int) error {
	// Check if this project item has sub-components
	rows, err := config.DB.Query("SELECT project_item_component_id, qty_per_item FROM tbl_project_item_component WHERE project_items_id = ?", projectItemID)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasComponents := false
	for rows.Next() {
		hasComponents = true
		var compID, qtyPerItem int
		if err := rows.Scan(&compID, &qtyPerItem); err == nil {
			totalQty := deliverQty * qtyPerItem
			config.DB.Exec("INSERT INTO tbl_loading_list (delivery_id, project_item_id, project_item_component_id, item_qty) VALUES (?, ?, ?, ?)",
				deliveryID, projectItemID, compID, totalQty)
		}
	}

	// If no components exist, insert the main item itself
	if !hasComponents {
		_, err = config.DB.Exec("INSERT INTO tbl_loading_list (delivery_id, project_item_id, project_item_component_id, item_qty) VALUES (?, ?, ?, ?)",
			deliveryID, projectItemID, 0, deliverQty)
	}
	return err
}

func DeleteLoadingListItem(loadingListID int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_loading_list WHERE loading_list_id = ?", loadingListID)
	return err
}
