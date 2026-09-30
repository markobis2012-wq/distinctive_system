package models

import (
	"backend/internal/config"
)

type Currency struct {
	CurrencyID   int     `json:"currency_id"`
	CurrencyCode string  `json:"currency_code"`
	CurrencyName string  `json:"currency_name"`
	ExchangeRate float64 `json:"exchange_rate"`
}

func GetCurrencies() ([]Currency, error) {
	rows, err := config.DB.Query(`SELECT currency_id, currency_code, currency_name, exchange_rate FROM tbl_currency`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Currency
	for rows.Next() {
		var c Currency
		if err := rows.Scan(&c.CurrencyID, &c.CurrencyCode, &c.CurrencyName, &c.ExchangeRate); err == nil {
			list = append(list, c)
		}
	}
	return list, nil
}

type UOM struct {
	UomID   int    `json:"uom_id"`
	UomAbbr string `json:"uom_abbr"`
	UomDesc string `json:"uom_desc"`
}

func GetUOMs() ([]UOM, error) {
	rows, err := config.DB.Query(`SELECT uom_id, uom_abbr, uom_desc FROM tbl_uom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []UOM
	for rows.Next() {
		var u UOM
		if err := rows.Scan(&u.UomID, &u.UomAbbr, &u.UomDesc); err == nil {
			list = append(list, u)
		}
	}
	if list == nil {
		list = []UOM{}
	}
	return list, nil
}

// --- PARTS / LOADING LIST ---

type ProjectPart struct {
	PartID         int     `json:"project_item_component_id"`
	ProjectItemsID int     `json:"project_items_id"`
	PartName       string  `json:"part_name"`
	Description    string  `json:"description"`
	QtyPerItem     float64 `json:"qty_per_item"`
	ProdQty        float64 `json:"prod_qty"`
	ParentItemName string  `json:"parent_item_name,omitempty"`
	UomID          int     `json:"uom_id"`
	UomAbbr        string  `json:"uom_abbr"`
}

func GetPartsByProject(projectID int) ([]ProjectPart, error) {
	query := `
		SELECT c.project_item_component_id, c.project_items_id, c.part_name, COALESCE(c.description, ''), c.qty_per_item, c.prod_qty, p.product_name, c.uom_id, COALESCE(um.uom_abbr, '')
		FROM tbl_project_item_component c
		JOIN tbl_project_items p ON c.project_items_id = p.project_items_id
		LEFT JOIN tbl_uom um ON c.uom_id = um.uom_id
		WHERE p.project_id = ? ORDER BY c.project_item_component_id DESC`
	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ProjectPart
	for rows.Next() {
		var p ProjectPart
		if err := rows.Scan(&p.PartID, &p.ProjectItemsID, &p.PartName, &p.Description, &p.QtyPerItem, &p.ProdQty, &p.ParentItemName, &p.UomID, &p.UomAbbr); err == nil {
			list = append(list, p)
		}
	}
	if list == nil {
		list = []ProjectPart{}
	}
	return list, nil
}

func AddProjectPart(p ProjectPart) error {
	_, err := config.DB.Exec(`INSERT INTO tbl_project_item_component (project_items_id, part_name, description, qty_per_item, prod_qty, uom_id) VALUES (?, ?, ?, ?, ?, ?)`,
		p.ProjectItemsID, p.PartName, p.Description, p.QtyPerItem, p.ProdQty, p.UomID)
	return err
}

func DeleteProjectPart(id int) error {
	_, err := config.DB.Exec(`DELETE FROM tbl_project_item_component WHERE project_item_component_id = ?`, id)
	return err
}

// --- MASTER PROJECT BOM ---

type PartAllocation struct {
	PartID       int     `json:"part_id"`
	QtyPerPart   float64 `json:"qty_per_part"`
	AllocatedQty float64 `json:"allocated_qty"`
}

type AddBOMRequest struct {
	ProjectID      int              `json:"project_id"`
	InventoryID    int              `json:"inventory_id"`
	CustomItemName string           `json:"custom_item_name"`
	Description    string           `json:"description"`
	QtyNeeded      float64          `json:"qty_needed"`
	UomID          int              `json:"uom_id"`
	CurrencyID     int              `json:"currency_id"`
	UnitCost       float64          `json:"unit_cost"`
	LandedCost     float64          `json:"landed_cost"`
	TotalCost      float64          `json:"total_cost"`
	Allocations    []PartAllocation `json:"allocations"`
}

type MasterBOM struct {
	BOMID          int     `json:"bom_id"`
	ProjectID      int     `json:"project_id"`
	InventoryID    int     `json:"inventory_id"`
	CustomItemName string  `json:"custom_item_name"`
	Description    string  `json:"description"`
	QtyNeeded      float64 `json:"qty_needed"`
	UomID          int     `json:"uom_id"`
	UomAbbr        string  `json:"uom_abbr"`
	CurrencyID     int     `json:"currency_id"`
	CurrencyCode   string  `json:"currency_code"`
	UnitCost       float64 `json:"unit_cost"`
	LandedCost     float64 `json:"landed_cost"`
	TotalCost      float64 `json:"total_cost"`
	InventoryName  string  `json:"inventory_name"`
	DBOSCode       string  `json:"dbos_code"`
	UsedForParts   string  `json:"used_for_parts"`
}

func GetMasterBOM(projectID int) ([]MasterBOM, error) {
	query := `
		SELECT 
			b.bom_id, COALESCE(b.inventory_id, 0), COALESCE(b.custom_item_name, ''), COALESCE(b.description, ''), 
			b.qty_needed, b.uom_id, COALESCE(um.uom_abbr, ''),
			b.currency_id, COALESCE(c.currency_code, 'PHP'), b.unit_cost, b.landed_cost, b.total_cost, 
			COALESCE(i.inventory_name, ''), COALESCE(i.dbos_code, ''),
			COALESCE(GROUP_CONCAT(CONCAT(p.part_name, ' (', u.qty_per_part, ' ea)') SEPARATOR ', '), 'General Consumable')
		FROM tbl_project_bom b
		LEFT JOIN tbl_inventory i ON b.inventory_id = i.inventory_id
		LEFT JOIN tbl_currency c ON b.currency_id = c.currency_id
		LEFT JOIN tbl_uom um ON b.uom_id = um.uom_id
		LEFT JOIN tbl_project_bom_usage u ON b.bom_id = u.bom_id
		LEFT JOIN tbl_project_item_component p ON u.project_item_component_id = p.project_item_component_id
		WHERE b.project_id = ?
		GROUP BY b.bom_id ORDER BY b.bom_id DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []MasterBOM
	for rows.Next() {
		var b MasterBOM
		if err := rows.Scan(&b.BOMID, &b.InventoryID, &b.CustomItemName, &b.Description, &b.QtyNeeded, &b.UomID, &b.UomAbbr, &b.CurrencyID, &b.CurrencyCode, &b.UnitCost, &b.LandedCost, &b.TotalCost, &b.InventoryName, &b.DBOSCode, &b.UsedForParts); err == nil {
			list = append(list, b)
		}
	}
	if list == nil {
		list = []MasterBOM{}
	}
	return list, nil
}

func AddMasterBOM(req AddBOMRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	res, err := tx.Exec(`
		INSERT INTO tbl_project_bom (project_id, inventory_id, custom_item_name, description, qty_needed, uom_id, currency_id, unit_cost, landed_cost, total_cost) 
		VALUES (?, NULLIF(?, 0), NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, ?, ?, ?)`,
		req.ProjectID, req.InventoryID, req.CustomItemName, req.Description, req.QtyNeeded, req.UomID, req.CurrencyID, req.UnitCost, req.LandedCost, req.TotalCost)

	if err != nil {
		tx.Rollback()
		return err
	}
	bomID, _ := res.LastInsertId()

	for _, alloc := range req.Allocations {
		_, err = tx.Exec(`INSERT INTO tbl_project_bom_usage (bom_id, project_item_component_id, qty_per_part, allocated_qty) VALUES (?, ?, ?, ?)`,
			bomID, alloc.PartID, alloc.QtyPerPart, alloc.AllocatedQty)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func DeleteMasterBOM(bomID int) error {
	_, err := config.DB.Exec(`DELETE FROM tbl_project_bom WHERE bom_id = ?`, bomID)
	return err
}
