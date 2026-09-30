package models

import (
	"backend/internal/config"
	"log"
)

type ProjectItem struct {
	ItemID                 int     `json:"project_items_id"`
	ProjectID              int     `json:"project_id"`
	ProductName            string  `json:"product_name"`
	ProductDescription     string  `json:"product_description"`
	Qty                    int     `json:"qty"`
	UomID                  int     `json:"uom_id"`   // UPDATED: Matches uom_id column
	UomAbbr                string  `json:"uom_abbr"` // NEW: Pulled from tbl_uom
	UnitPrice              float64 `json:"unit_price"`
	TotalPrice             float64 `json:"total_price"`
	ImagePath              string  `json:"image_path"`
	DbosImagePath          string  `json:"dbos_image_path"`
	ProjectComponentsTotal string  `json:"project_components_total"`
	Location               string  `json:"location"`

	QtyInProduction     float64 `json:"qty_in_production"`
	QtyReadyForDelivery float64 `json:"qty_ready_for_delivery"`
	QtyDelivered        float64 `json:"qty_delivered"`

	Status string `json:"status"`
}

func GetProjectItems(projectID int) ([]ProjectItem, error) {
	log.Printf("🔍 [SQL] Running query for project_id = %d", projectID)

	query := `
		SELECT 
			p.project_items_id, p.project_id, COALESCE(p.product_name, ''), 
			COALESCE(p.product_description, ''), COALESCE(p.qty, 0), COALESCE(p.uom_id, 0), 
			p.unit_price, p.total_price, COALESCE(p.image_path, ''), COALESCE(p.dbos_image_path, ''), 
			COALESCE(p.project_components_total, '0'), COALESCE(p.location, ''),
			COALESCE(p.qty_in_production, 0), COALESCE(p.qty_ready_for_delivery, 0), COALESCE(p.qty_delivered, 0),
			COALESCE(u.uom_abbr, 'Units')
		FROM tbl_project_items p
		LEFT JOIN tbl_uom u ON p.uom_id = u.uom_id
		WHERE p.project_id = ?
		ORDER BY p.project_items_id DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		log.Printf("❌ [SQL EXECUTION ERROR]: %v", err)
		return nil, err
	}
	defer rows.Close()

	var items []ProjectItem
	rowCount := 0

	for rows.Next() {
		rowCount++
		var i ProjectItem

		err := rows.Scan(
			&i.ItemID, &i.ProjectID, &i.ProductName, &i.ProductDescription,
			&i.Qty, &i.UomID, &i.UnitPrice, &i.TotalPrice, &i.ImagePath, &i.DbosImagePath,
			&i.ProjectComponentsTotal, &i.Location,
			&i.QtyInProduction, &i.QtyReadyForDelivery, &i.QtyDelivered,
			&i.UomAbbr, // SCAN NEW UOM ABBR
		)

		if err != nil {
			log.Printf("❌ [SCAN ERROR] Failed on Row %d (Item ID: %d): %v", rowCount, i.ItemID, err)
			continue
		}

		if i.QtyDelivered >= float64(i.Qty) {
			i.Status = "Completed"
		} else if i.QtyDelivered > 0 || i.QtyReadyForDelivery > 0 || i.QtyInProduction > 0 {
			i.Status = "In Progress"
		} else {
			i.Status = "Pending"
		}

		items = append(items, i)
	}

	if err = rows.Err(); err != nil {
		log.Printf("❌ [ROWS ITERATION ERROR]: %v", err)
	}

	if items == nil {
		items = []ProjectItem{}
	}
	return items, nil
}

func AddProjectItem(i ProjectItem) error {
	query := `INSERT INTO tbl_project_items 
		(project_id, product_name, product_description, qty, uom_id, unit_price, total_price, image_path, dbos_image_path, project_components_total, location) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := config.DB.Exec(query,
		i.ProjectID, i.ProductName, i.ProductDescription, i.Qty, i.UomID, i.UnitPrice, i.TotalPrice, i.ImagePath, i.DbosImagePath, i.ProjectComponentsTotal, i.Location,
	)
	return err
}

func UpdateProjectItem(i ProjectItem) error {
	if i.ImagePath != "" && i.DbosImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, qty=?, uom_id=?, unit_price=?, total_price=?, image_path=?, dbos_image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.Qty, i.UomID, i.UnitPrice, i.TotalPrice, i.ImagePath, i.DbosImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	} else if i.ImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, qty=?, uom_id=?, unit_price=?, total_price=?, image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.Qty, i.UomID, i.UnitPrice, i.TotalPrice, i.ImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	} else if i.DbosImagePath != "" {
		query := `UPDATE tbl_project_items SET product_name=?, product_description=?, qty=?, uom_id=?, unit_price=?, total_price=?, dbos_image_path=?, project_components_total=?, location=? WHERE project_items_id=?`
		_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.Qty, i.UomID, i.UnitPrice, i.TotalPrice, i.DbosImagePath, i.ProjectComponentsTotal, i.Location, i.ItemID)
		return err
	}

	query := `UPDATE tbl_project_items SET product_name=?, product_description=?, qty=?, uom_id=?, unit_price=?, total_price=?, project_components_total=?, location=? WHERE project_items_id=?`
	_, err := config.DB.Exec(query, i.ProductName, i.ProductDescription, i.Qty, i.UomID, i.UnitPrice, i.TotalPrice, i.ProjectComponentsTotal, i.Location, i.ItemID)
	return err
}

func DeleteProjectItem(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_project_items WHERE project_items_id = ?", id)
	return err
}
