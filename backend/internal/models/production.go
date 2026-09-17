package models

import (
	"backend/internal/config"
	"log"
)

type ProductionItem struct {
	ProjectItemsID      int     `json:"project_items_id"`
	ProjectID           int     `json:"project_id"`
	ProjectName         string  `json:"project_name"`
	ProductName         string  `json:"product_name"`
	TotalQty            float64 `json:"total_qty"`
	QtyInProduction     float64 `json:"qty_in_production"`
	QtyReadyForDelivery float64 `json:"qty_ready_for_delivery"`
	QtyDelivered        float64 `json:"qty_delivered"`
}

func GetProductionPipeline() ([]ProductionItem, error) {
	log.Println("==> [PRODUCTION] Starting GetProductionPipeline query...")

	var items []ProductionItem

	// FIXED: Using `projects` instead of `tbl_projects`, `product_name`, and `project_items_id`
	query := `
		SELECT i.project_items_id, i.project_id, 
		       COALESCE(p.project_name, 'Unknown Project'), 
		       COALESCE(i.product_name, 'Unnamed Item'), 
		       COALESCE(i.qty, 0), 
		       COALESCE(i.qty_in_production, 0), 
		       COALESCE(i.qty_ready_for_delivery, 0), 
		       COALESCE(i.qty_delivered, 0)
		FROM tbl_project_items i
		LEFT JOIN projects p ON i.project_id = p.projects_id
		WHERE p.project_status NOT IN ('Finished', 'Completed') OR p.project_status IS NULL
		ORDER BY i.project_items_id DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		log.Println("==> [PRODUCTION] SQL QUERY ERROR:", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item ProductionItem
		err := rows.Scan(
			&item.ProjectItemsID,
			&item.ProjectID,
			&item.ProjectName,
			&item.ProductName,
			&item.TotalQty,
			&item.QtyInProduction,
			&item.QtyReadyForDelivery,
			&item.QtyDelivered,
		)
		if err != nil {
			log.Println("==> [PRODUCTION] SQL ROW SCAN ERROR:", err)
			continue
		}
		items = append(items, item)
	}

	log.Printf("==> [PRODUCTION] Query Complete. Fetched %d items.\n", len(items))
	return items, nil
}

type AdvanceProductionPayload struct {
	QtyToMove float64 `json:"qty_to_move"`
}

func AdvanceToReady(projectItemsID int, p AdvanceProductionPayload) error {
	// FIXED: Using `project_items_id` in the WHERE clause
	_, err := config.DB.Exec(`
		UPDATE tbl_project_items 
		SET qty_in_production = qty_in_production - ?, 
		    qty_ready_for_delivery = qty_ready_for_delivery + ? 
		WHERE project_items_id = ?`,
		p.QtyToMove, p.QtyToMove, projectItemsID)
	return err
}
