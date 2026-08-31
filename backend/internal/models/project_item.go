package models

import "backend/internal/config"

type ProjectItem struct {
	ItemID                 int     `json:"project_items_id"`
	ProjectID              int     `json:"project_id"`
	ProductName            string  `json:"product_name"`
	ProductDescription     string  `json:"product_description"`
	SuppliersDescription   string  `json:"suppliers_description"`
	Qty                    int     `json:"qty"`
	Uom                    int     `json:"uom"`
	UnitPrice              float64 `json:"unit_price"`
	TotalPrice             float64 `json:"total_price"`
	SupProdID              int     `json:"sup_prod_id"`
	ImagePath              string  `json:"image_path"`
	DbosImagePath          string  `json:"dbos_image_path"`
	ProjectComponentsTotal string  `json:"project_components_total"`
	Location               string  `json:"location"`

	// Computed Fields from tbl_delivery_item
	ItemDelivered int    `json:"item_delivered"`
	ItemPending   int    `json:"item_pending"`
	Status        string `json:"status"`
}

func GetProjectItems(projectID int) ([]ProjectItem, error) {
	query := `
		SELECT 
			pi.project_items_id, pi.project_id, COALESCE(pi.product_name, ''), 
			COALESCE(pi.product_description, ''), COALESCE(pi.suppliers_description, ''), 
			COALESCE(pi.qty, 0), COALESCE(pi.uom, 0), pi.unit_price, pi.total_price, 
			COALESCE(pi.sup_prod_id, 0), COALESCE(pi.image_path, ''), COALESCE(pi.dbos_image_path, ''), 
			COALESCE(pi.project_components_total, '0'), COALESCE(pi.location, ''),
			COALESCE(SUM(di.deliver_qty), 0) AS item_delivered
		FROM tbl_project_items pi
		LEFT JOIN tbl_delivery_item di ON pi.project_items_id = di.project_item_id
		WHERE pi.project_id = ?
		GROUP BY pi.project_items_id
		ORDER BY pi.project_items_id DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ProjectItem
	for rows.Next() {
		var i ProjectItem
		err := rows.Scan(
			&i.ItemID, &i.ProjectID, &i.ProductName, &i.ProductDescription, &i.SuppliersDescription,
			&i.Qty, &i.Uom, &i.UnitPrice, &i.TotalPrice, &i.SupProdID, &i.ImagePath, &i.DbosImagePath,
			&i.ProjectComponentsTotal, &i.Location, &i.ItemDelivered,
		)
		if err == nil {
			i.ItemPending = i.Qty - i.ItemDelivered
			if i.ItemPending <= 0 {
				i.Status = "Completed"
			} else if i.ItemDelivered > 0 {
				i.Status = "Partial"
			} else {
				i.Status = "Pending"
			}
			items = append(items, i)
		}
	}
	if items == nil {
		items = []ProjectItem{}
	}
	return items, nil
}

func AddProjectItem(i ProjectItem) error {
	query := `INSERT INTO tbl_project_items 
		(project_id, product_name, product_description, suppliers_description, qty, uom, unit_price, total_price, sup_prod_id, image_path, dbos_image_path, project_components_total, location) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := config.DB.Exec(query,
		i.ProjectID, i.ProductName, i.ProductDescription, i.SuppliersDescription, i.Qty, i.Uom, i.UnitPrice, i.TotalPrice, i.SupProdID, i.ImagePath, i.DbosImagePath, i.ProjectComponentsTotal, i.Location,
	)
	return err
}

func UpdateProjectItem(i ProjectItem) error {
	// Only update images if new paths are provided
	if i.ImagePath != "" && i.DbosImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, suppliers_description=?, qty=?, uom=?, unit_price=?, total_price=?, sup_prod_id=?, image_path=?, dbos_image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.SuppliersDescription, i.Qty, i.Uom, i.UnitPrice, i.TotalPrice, i.SupProdID, i.ImagePath, i.DbosImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	} else if i.ImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, suppliers_description=?, qty=?, uom=?, unit_price=?, total_price=?, sup_prod_id=?, image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.SuppliersDescription, i.Qty, i.Uom, i.UnitPrice, i.TotalPrice, i.SupProdID, i.ImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	} else if i.DbosImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, suppliers_description=?, qty=?, uom=?, unit_price=?, total_price=?, sup_prod_id=?, dbos_image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.SuppliersDescription, i.Qty, i.Uom, i.UnitPrice, i.TotalPrice, i.SupProdID, i.DbosImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	}

	query := `UPDATE tbl_project_items SET product_name=?, product_description=?, suppliers_description=?, qty=?, uom=?, unit_price=?, total_price=?, sup_prod_id=?, project_components_total=?, location=? WHERE project_items_id=?`
	_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.SuppliersDescription, i.Qty, i.Uom, i.UnitPrice, i.TotalPrice, i.SupProdID, i.ProjectComponentsTotal, i.Location, i.ItemID)
	return err
}

func DeleteProjectItem(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_project_items WHERE project_items_id = ?", id)
	return err
}
