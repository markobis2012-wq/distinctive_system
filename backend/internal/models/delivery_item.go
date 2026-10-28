package models

import (
	"backend/internal/config"
	"log"
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
	ProjectItemComponentID int     `json:"project_item_component_id"`
	ParentItemName         string  `json:"parent_item_name"`
	PartName               string  `json:"part_name"`
	ProdQty                float64 `json:"prod_qty"`      // Total project target for this part
	ReadyQty               float64 `json:"ready_qty"`     // (Parent Ready * Qty Per Item)
	AvailableQty           float64 `json:"available_qty"` // Ready - Already Scheduled
	UOMAbbr                string  `json:"uom_abbr"`
}

// Fetches items currently inside a specific Delivery Receipt
// UPDATED: Now includes dbos_image_path, descriptions, and supplier product details!
func GetDeliveryItems(deliveryID int) ([]DeliveryItemRecord, error) {
	items := []DeliveryItemRecord{}

	query := `
        SELECT 
            a.delivery_item_id, 
            a.delivery_id, 
            COALESCE(a.project_item_component_id, 0),
            COALESCE(pi.product_name, 'General Delivery'),
            COALESCE(c.part_name, a.remarks, 'Unknown Part'),
            COALESCE(a.deliver_qty, 0),
            COALESCE(a.remarks, ''),
            COALESCE(u.uom_abbr, ''),
            COALESCE(pi.image_path, ''),
            
            COALESCE(pi.dbos_image_path, ''),
            COALESCE(pi.product_description, ''),
            '', -- SupplierProductName (No longer needed, frontend falls back to ItemName)
            COALESCE(c.description, ''), -- Pulling description directly from the updated component table!
            '', -- ProductImage (No longer needed)
            COALESCE(c.image_path, '') -- ComponentImagePath (Pulling image from the updated component table!)

        FROM tbl_delivery_item a
        LEFT JOIN tbl_project_item_component c ON a.project_item_component_id = c.project_item_component_id
        LEFT JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id OR a.project_item_id = pi.project_items_id
        LEFT JOIN tbl_uom u ON c.uom_id = u.uom_id
        
        -- REMOVED the tbl_supplier_product JOIN that was causing the crash
        
        WHERE a.delivery_id = ?
        ORDER BY a.delivery_item_id ASC`

	rows, err := config.DB.Query(query, deliveryID)
	if err != nil {
		log.Println("[CRITICAL SQL ERROR in GetDeliveryItems]:", err)
		return items, err
	}
	defer rows.Close()

	for rows.Next() {
		var i DeliveryItemRecord
		err := rows.Scan(
			&i.DeliveryItemID, &i.DeliveryID, &i.ProjectItemComponentID,
			&i.ProductName, &i.ItemName, &i.Qty, &i.Remarks, &i.UOMAbbr, &i.ImagePath,
			&i.DBOSImagePath, &i.ProductDescription, &i.SupplierProductName, &i.ProdDescription, &i.ProductImage,
			&i.ComponentImagePath,
		)

		if err == nil {
			items = append(items, i)
		} else {
			log.Println("[CRITICAL SCAN ERROR in GetDeliveryItems row]:", err)
		}
	}

	return items, nil
}

// Fetches Project Items for the dropdown
func GetAvailableProjectItems(projectID int) ([]AvailableProjectItem, error) {
	query := `
        SELECT * FROM (
            SELECT 
                c.project_item_component_id,
                COALESCE(pi.product_name, '') AS parent_item_name,
                COALESCE(c.part_name, '') AS part_name,
                COALESCE(c.prod_qty, 0) AS prod_qty,
                (COALESCE(pi.qty_ready_for_delivery, 0) * COALESCE(c.qty_per_item, 1)) AS ready_qty,
                ((COALESCE(pi.qty_ready_for_delivery, 0) * COALESCE(c.qty_per_item, 1)) - COALESCE((
                    SELECT SUM(sbi.qty_to_deliver)
                    FROM tbl_schedule_booking_items sbi
                    JOIN tbl_schedule_bookings sb ON sbi.booking_id = sb.booking_id
                    WHERE sbi.project_item_component_id = c.project_item_component_id
                    AND sb.status IN ('Scheduled', 'In Transit')
                ), 0)) AS available_qty,
                COALESCE(u.uom_abbr, '') AS uom_abbr
            FROM tbl_project_item_component c
            JOIN tbl_project_items pi ON c.project_items_id = pi.project_items_id
            LEFT JOIN tbl_uom u ON u.uom_id = c.uom_id
            WHERE pi.project_id = ?
        ) AS subquery
        WHERE available_qty > 0`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		println("[DB ERROR in GetAvailableProjectItems]:", err.Error())
		return nil, err
	}
	defer rows.Close()

	var items []AvailableProjectItem
	for rows.Next() {
		var i AvailableProjectItem
		if err := rows.Scan(&i.ProjectItemComponentID, &i.ParentItemName, &i.PartName, &i.ProdQty, &i.ReadyQty, &i.AvailableQty, &i.UOMAbbr); err == nil {
			items = append(items, i)
		}
	}

	if items == nil {
		items = []AvailableProjectItem{}
	}
	return items, nil
}

// Insert Item with Strict Verification
func AddDeliveryItem(p AddDeliveryItemPayload) error {
	// Fetch the parent project_items_id to maintain legacy column integrity
	var parentID int
	config.DB.QueryRow("SELECT project_items_id FROM tbl_project_item_component WHERE project_item_component_id = ?", p.ProjectItemComponentID).Scan(&parentID)

	_, err := config.DB.Exec(`
        INSERT INTO tbl_delivery_item 
        (delivery_id, project_item_id, project_item_component_id, deliver_qty, remarks) 
        VALUES (?, ?, ?, ?, ?)`,
		p.DeliveryID, parentID, p.ProjectItemComponentID, p.DeliverQty, p.Remarks)
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

type DeliveryItemRecord struct {
	DeliveryItemID         int     `json:"delivery_item_id"`
	DeliveryID             int     `json:"delivery_id"`
	ProjectItemComponentID int     `json:"project_item_component_id"`
	ProductName            string  `json:"product_name"` // Parent item
	ItemName               string  `json:"item_name"`    // Component part
	Qty                    float64 `json:"qty"`
	Remarks                string  `json:"remarks"`
	UOMAbbr                string  `json:"uom_abbr"`
	ImagePath              string  `json:"image_path"`

	// UPDATED: New fields to supply images and descriptions to the React frontend
	DBOSImagePath       string `json:"dbos_image_path"`
	ProductDescription  string `json:"product_description"`
	SupplierProductName string `json:"supplier_product_name"`
	ProdDescription     string `json:"prod_description"`
	ProductImage        string `json:"product_image"`
	ComponentImagePath  string `json:"component_image_path"`
}

type AddDeliveryItemPayload struct {
	DeliveryID             int     `json:"delivery_id"`
	ProjectItemComponentID int     `json:"project_item_component_id"`
	DeliverQty             float64 `json:"deliver_qty"`
	Remarks                string  `json:"remarks"`
}
