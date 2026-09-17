package models

import (
	"backend/internal/config"
	"errors"
)

type DeliveryItem struct {
	DeliveryItemID int    `json:"delivery_item_id"`
	DeliveryID     int    `json:"delivery_id"`
	ProjectItemID  int    `json:"project_item_id"`
	DeliverQty     int    `json:"deliver_qty"`
	Remarks        string `json:"remarks"`
	ProductName    string `json:"product_name"`
	UOMAbbr        string `json:"uom_abbr"`
}

type AvailableProjectItem struct {
	ProjectItemID int    `json:"project_items_id"`
	ProductName   string `json:"product_name"`
	Qty           int    `json:"qty"`
	Pending       int    `json:"pending"`
	UOMAbbr       string `json:"uom_abbr"`
}

// Fetches items currently inside a specific Delivery Receipt
// Replace your old GetDeliveryItems with this unified master query!
func GetDeliveryItems(deliveryID int) ([]LoadingListItem, error) {
	query := `
		SELECT 
			a.delivery_item_id, a.delivery_id, COALESCE(a.project_item_id, 0), COALESCE(a.project_item_component_id, 0), COALESCE(a.deliver_qty, 0),
			
			-- Parent Info
			COALESCE(d.product_name, ''), COALESCE(d.dbos_image_path, ''), COALESCE(d.product_description, ''),
			
			-- Component Info (Injecting inventory_name to fallback nicely)
			COALESCE(inv.inventory_name, e.supplier_product_name, ''), 
			COALESCE(inv.description, e.prod_description, ''), 
			COALESCE(inv.image_path, e.product_image, ''),
			COALESCE(f.uom_abbr, ''),

			-- UI Name & Image
			COALESCE(inv.inventory_name, e.supplier_product_name, d.product_name, a.remarks, 'Unknown Item'),
			COALESCE(a.deliver_qty, 0),
			COALESCE(inv.image_path, e.product_image, d.dbos_image_path, d.image_path, '')

		FROM tbl_delivery_item a
		LEFT JOIN tbl_project_item_component c ON c.project_item_component_id = a.project_item_component_id
		LEFT JOIN tbl_project_items d ON d.project_items_id = a.project_item_id
		LEFT JOIN tbl_supplier_products e ON e.supplier_product_id = c.supplier_product_id
		LEFT JOIN tbl_inventory inv ON inv.inventory_id = c.inventory_id
		LEFT JOIN tbl_uom f ON f.uom_id = d.uom
		WHERE a.delivery_id = ?
		ORDER BY a.delivery_item_id ASC`

	rows, err := config.DB.Query(query, deliveryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []LoadingListItem
	for rows.Next() {
		var i LoadingListItem
		rows.Scan(
			&i.LoadingListID, &i.DeliveryID, &i.ProjectItemID, &i.ProjectItemComponentID, &i.ItemQty,
			&i.ProductName, &i.ItemImage, &i.ItemDesc, &i.ComponentName, &i.ComponentDesc, &i.ComponentImage, &i.UOMAbbr,
			&i.ItemName, &i.Qty, &i.ImagePath,
		)
		items = append(items, i)
	}
	if items == nil {
		items = []LoadingListItem{}
	}
	return items, nil
}

// Fetches Project Items for the dropdown
func GetAvailableProjectItems(projectID int) ([]AvailableProjectItem, error) {
	// Removed the 'WHERE pending > 0' constraint so ALL items show up
	query := `
		SELECT * FROM (
			SELECT 
				pi.project_items_id, 
				COALESCE(pi.product_name, ''), 
				COALESCE(pi.qty, 0) AS qty,
				(COALESCE(pi.qty, 0) - COALESCE((SELECT SUM(deliver_qty) FROM tbl_delivery_item WHERE project_item_id = pi.project_items_id), 0)) AS pending,
				COALESCE(u.uom_abbr, '') AS uom_abbr
			FROM tbl_project_items pi
			LEFT JOIN tbl_uom u ON u.uom_id = pi.uom
			WHERE pi.project_id = ?
		) AS subquery`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		println("[DB ERROR in GetAvailableProjectItems]:", err.Error())
		return nil, err
	}
	defer rows.Close()

	var items []AvailableProjectItem
	for rows.Next() {
		var i AvailableProjectItem
		if err := rows.Scan(&i.ProjectItemID, &i.ProductName, &i.Qty, &i.Pending, &i.UOMAbbr); err == nil {
			items = append(items, i)
		}
	}

	if items == nil {
		items = []AvailableProjectItem{}
	}
	return items, nil
}

// Insert Item with Strict Verification
func AddDeliveryItem(deliveryID int, projectItemID int, deliverQty int, remarks string) error {
	// Verify Pending Logic Backend-Side
	var pending int
	config.DB.QueryRow(`
		SELECT (qty - COALESCE((SELECT SUM(deliver_qty) FROM tbl_delivery_item WHERE project_item_id = ?), 0)) 
		FROM tbl_project_items WHERE project_items_id = ?`, projectItemID, projectItemID).Scan(&pending)

	if deliverQty > pending {
		return errors.New("delivery quantity exceeds pending amount")
	}

	_, err := config.DB.Exec("INSERT INTO tbl_delivery_item (delivery_id, project_item_id, deliver_qty, remarks) VALUES (?, ?, ?, ?)", deliveryID, projectItemID, deliverQty, remarks)
	return err
}

func UpdateDeliveryItem(deliveryItemID int, deliverQty int, remarks string) error {
	_, err := config.DB.Exec("UPDATE tbl_delivery_item SET deliver_qty = ?, remarks = ? WHERE delivery_item_id = ?", deliverQty, remarks, deliveryItemID)
	return err
}

func DeleteDeliveryItem(deliveryItemID int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_delivery_item WHERE delivery_item_id = ?", deliveryItemID)
	return err
}

func GetDeliveryByID(id int) (Delivery, error) {
	query := `
		SELECT a.delivery_id, CAST(a.delivery_date AS CHAR), a.project_id, a.delivery_no, a.is_loading_list,
		       COALESCE(b.project_name, ''), COALESCE(b.project_number, ''), 
		       COALESCE(c.company_name, ''), COALESCE(b.contract_amount, 0)
		FROM tbl_delivery a
		LEFT JOIN projects b ON b.projects_id = a.project_id
		LEFT JOIN tbl_company c ON c.company_id = b.client_id
		WHERE a.delivery_id = ?`

	var d Delivery
	err := config.DB.QueryRow(query, id).Scan(
		&d.DeliveryID, &d.DeliveryDate, &d.ProjectID, &d.DeliveryNo, &d.IsLoadingList,
		&d.ProjectName, &d.ProjectNumber, &d.CompanyName, &d.ContractAmount)
	return d, err
}
