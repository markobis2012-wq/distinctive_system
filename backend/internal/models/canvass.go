package models

import (
	"backend/internal/config"
	"errors"
	"log"
	"time"
)

// --- PHASE 3: CANVASSING BOARD (Prospecting Shortages) ---

type CanvassItem struct {
	MRFItemID      int     `json:"mrf_item_id"`
	MRFID          int     `json:"mrf_id"`
	MRFNumber      string  `json:"mrf_number"`
	ProjectName    string  `json:"project_name"`
	InventoryID    int     `json:"inventory_id"`
	InventoryName  string  `json:"inventory_name"`
	DBOSCode       string  `json:"dbos_code"`
	QtyBackordered float64 `json:"qty_backordered"`
	UOMAbbr        string  `json:"uom_abbr"`
	HasSelectedSup bool    `json:"has_selected_supplier"`
}

// Fetch all items from all MRFs that are missing stock and need Purchasing to buy them
func GetItemsForCanvassing() ([]CanvassItem, error) {
	query := `
		SELECT 
			mi.mrf_item_id, m.mrf_id, m.mrf_number, COALESCE(p.project_name, 'Unknown'),
			COALESCE(mi.inventory_id, 0), COALESCE(i.inventory_name, mi.custom_item_name), COALESCE(i.dbos_code, 'CUSTOM'),
			mi.qty_backordered, COALESCE(u.uom_abbr, 'Units'),
			EXISTS(SELECT 1 FROM tbl_canvass_quotations cq WHERE cq.mrf_item_id = mi.mrf_item_id AND cq.is_selected = 1) as has_supplier
		FROM tbl_mrf_items mi
		JOIN tbl_mrf m ON mi.mrf_id = m.mrf_id
		LEFT JOIN projects p ON m.project_id = p.projects_id
		LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON i.uom_id = u.uom_id
		WHERE mi.procurement_flag = 1 AND mi.qty_backordered > 0
		ORDER BY m.date_requested ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
		log.Printf("❌ DB Error GetItemsForCanvassing: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var list []CanvassItem
	for rows.Next() {
		var item CanvassItem
		if err := rows.Scan(&item.MRFItemID, &item.MRFID, &item.MRFNumber, &item.ProjectName, &item.InventoryID, &item.InventoryName, &item.DBOSCode, &item.QtyBackordered, &item.UOMAbbr, &item.HasSelectedSup); err == nil {
			list = append(list, item)
		}
	}
	if list == nil {
		list = []CanvassItem{}
	}
	return list, nil
}

// --- QUOTATIONS ---

type Quotation struct {
	CanvassID          int     `json:"canvass_id"`
	MRFItemID          int     `json:"mrf_item_id"`
	SupplierID         int     `json:"supplier_id"`
	SupplierName       string  `json:"supplier_name"`
	RFQNumber          string  `json:"rfq_number"`
	QuotedUnitPrice    float64 `json:"quoted_unit_price"`
	QuotedLandedPrice  float64 `json:"quoted_landed_price"`
	QuotedSellingPrice float64 `json:"quoted_selling_price"`
	Remarks            string  `json:"remarks"`
	IsSelected         bool    `json:"is_selected"`
	DateQuoted         string  `json:"date_quoted"`
}

type AddQuoteRequest struct {
	MRFItemID          int     `json:"mrf_item_id"`
	SupplierID         int     `json:"supplier_id"`
	SupplierProductID  int     `json:"supplier_product_id"` // ADDED THIS
	RFQNumber          string  `json:"rfq_number"`
	QuotedUnitPrice    float64 `json:"quoted_unit_price"`
	QuotedLandedPrice  float64 `json:"quoted_landed_price"`
	QuotedSellingPrice float64 `json:"quoted_selling_price"`
	Remarks            string  `json:"remarks"`
}

func GetQuotationsForComponent(mrfItemID int) ([]Quotation, error) {
	query := `
		SELECT q.canvass_id, q.mrf_item_id, q.supplier_id, COALESCE(c.company_name, 'Unknown'), 
			   COALESCE(q.rfq_number, ''), q.quoted_unit_price, q.quoted_landed_price, q.quoted_selling_price, 
			   COALESCE(q.remarks, ''), q.is_selected, CAST(q.date_quoted AS CHAR)
		FROM tbl_canvass_quotations q
		LEFT JOIN tbl_company c ON q.supplier_id = c.company_id
		WHERE q.mrf_item_id = ? ORDER BY q.quoted_landed_price ASC`

	rows, err := config.DB.Query(query, mrfItemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quotes []Quotation
	for rows.Next() {
		var q Quotation
		if err := rows.Scan(&q.CanvassID, &q.MRFItemID, &q.SupplierID, &q.SupplierName, &q.RFQNumber, &q.QuotedUnitPrice, &q.QuotedLandedPrice, &q.QuotedSellingPrice, &q.Remarks, &q.IsSelected, &q.DateQuoted); err == nil {
			quotes = append(quotes, q)
		}
	}
	if quotes == nil {
		quotes = []Quotation{}
	}
	return quotes, nil
}

func AddQuotation(req AddQuoteRequest) error {
	// Added supplier_product_id to the query
	_, err := config.DB.Exec(`
		INSERT INTO tbl_canvass_quotations 
		(mrf_item_id, supplier_id, supplier_product_id, rfq_number, quoted_unit_price, quoted_landed_price, quoted_selling_price, remarks) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		req.MRFItemID, req.SupplierID, req.SupplierProductID, req.RFQNumber, req.QuotedUnitPrice, req.QuotedLandedPrice, req.QuotedSellingPrice, req.Remarks)
	return err
}

func UpdateQuotationPrices(canvassID int, unitPrice, landedPrice, sellingPrice float64, remarks string) error {
	_, err := config.DB.Exec(`UPDATE tbl_canvass_quotations SET quoted_unit_price = ?, quoted_landed_price = ?, quoted_selling_price = ?, remarks = ? WHERE canvass_id = ?`,
		unitPrice, landedPrice, sellingPrice, remarks, canvassID)
	return err
}

func AwardQuotation(canvassID int, mrfItemID int) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Un-award any previously awarded quotes for this exact MRF missing item
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 0 WHERE mrf_item_id = ?`, mrfItemID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Award the specific quote
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 1 WHERE canvass_id = ?`, canvassID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. Tell the MRF Item that it has been successfully sourced
	_, err = tx.Exec(`UPDATE tbl_mrf_items SET has_selected_supplier = 1 WHERE mrf_item_id = ?`, mrfItemID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 4. AUTO-MAPPING: Link this supplier product to the Master Inventory item automatically
	// We use INSERT IGNORE so if they are already mapped, it won't crash or duplicate.
	_, err = tx.Exec(`
		INSERT IGNORE INTO tbl_inventory_suppliers (inventory_id, supplier_product_id, lead_time_days, moq, is_preferred)
		SELECT mi.inventory_id, cq.supplier_product_id, 0, 1, 0
		FROM tbl_mrf_items mi
		JOIN tbl_canvass_quotations cq ON cq.canvass_id = ?
		WHERE mi.mrf_item_id = ? AND mi.inventory_id IS NOT NULL AND cq.supplier_product_id IS NOT NULL AND cq.supplier_product_id > 0
	`, canvassID, mrfItemID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func CancelAward(mrfItemID int) error {
	// First, check if this item has already been assigned to a PO
	var exists bool
	err := config.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM tbl_po_items WHERE mrf_item_id = ?)`, mrfItemID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("cannot cancel award: this item has already been locked into a Purchase Order")
	}

	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Remove the award status
	_, err = tx.Exec(`UPDATE tbl_canvass_quotations SET is_selected = 0 WHERE mrf_item_id = ?`, mrfItemID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. NEW: Push the item back to the Canvassing Board queue
	_, err = tx.Exec(`UPDATE tbl_mrf_items SET has_selected_supplier = 0 WHERE mrf_item_id = ?`, mrfItemID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

type BulkRFQRequest struct {
	SupplierID int    `json:"supplier_id"`
	RFQNumber  string `json:"rfq_number"`
	MRFItemIDs []int  `json:"mrf_item_ids"`
}

func AddBulkQuotations(req BulkRFQRequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	for _, id := range req.MRFItemIDs {
		// 1. Check if this supplier is already prospected for this item
		var exists bool
		err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM tbl_canvass_quotations WHERE mrf_item_id = ? AND supplier_id = ?)`, id, req.SupplierID).Scan(&exists)
		if err != nil {
			tx.Rollback()
			return err
		}

		if exists {
			// 2A. Update the existing row (this preserves the supplier_product_id you mapped!)
			_, err = tx.Exec(`
				UPDATE tbl_canvass_quotations 
				SET rfq_number = ? 
				WHERE mrf_item_id = ? AND supplier_id = ? AND (rfq_number IS NULL OR rfq_number = '')`,
				req.RFQNumber, id, req.SupplierID)
			if err != nil {
				tx.Rollback()
				return err
			}
		} else {
			// 2B. If they never mapped it, insert a new blank row for the RFQ
			_, err = tx.Exec(`
				INSERT INTO tbl_canvass_quotations 
				(mrf_item_id, supplier_id, rfq_number, quoted_unit_price, quoted_landed_price, quoted_selling_price, remarks) 
				VALUES (?, ?, ?, 0, 0, 0, '')`,
				id, req.SupplierID, req.RFQNumber)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}
	return tx.Commit()
}

// --- PHASE 4: PO GENERATION ---

type AwardedItem struct {
	MRFItemID      int     `json:"mrf_item_id"`
	ProjectID      int     `json:"project_id"`
	ProjectName    string  `json:"project_name"`
	MRFNumber      string  `json:"mrf_number"`
	InventoryName  string  `json:"inventory_name"`
	DBOSCode       string  `json:"dbos_code"`
	SupplierID     int     `json:"supplier_id"`
	SupplierName   string  `json:"supplier_name"`
	QtyBackordered float64 `json:"qty_backordered"`
	LandedPrice    float64 `json:"landed_price"`
	TotalPrice     float64 `json:"total_price"`
	PONumber       string  `json:"po_number"`
}

func GetAwardedItemsForPO() ([]AwardedItem, error) {
	query := `
		SELECT 
			mi.mrf_item_id, m.project_id, COALESCE(p.project_name, 'Unknown'), m.mrf_number,
			COALESCE(i.inventory_name, mi.custom_item_name), COALESCE(i.dbos_code, 'CUSTOM'),
			q.supplier_id, COALESCE(c.company_name, 'Unknown'),
			mi.qty_backordered, q.quoted_landed_price, (mi.qty_backordered * q.quoted_landed_price) as total_price,
			COALESCE(po.po_number, '')
		FROM tbl_mrf_items mi
		JOIN tbl_mrf m ON mi.mrf_id = m.mrf_id
		LEFT JOIN projects p ON m.project_id = p.projects_id
		LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		JOIN tbl_canvass_quotations q ON mi.mrf_item_id = q.mrf_item_id AND q.is_selected = 1
		LEFT JOIN tbl_company c ON q.supplier_id = c.company_id
		LEFT JOIN tbl_po_items poi ON mi.mrf_item_id = poi.mrf_item_id
		LEFT JOIN tbl_po po ON poi.po_id = po.po_id
		WHERE mi.procurement_flag = 1
		ORDER BY m.date_requested ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []AwardedItem
	for rows.Next() {
		var a AwardedItem
		if err := rows.Scan(&a.MRFItemID, &a.ProjectID, &a.ProjectName, &a.MRFNumber, &a.InventoryName, &a.DBOSCode, &a.SupplierID, &a.SupplierName, &a.QtyBackordered, &a.LandedPrice, &a.TotalPrice, &a.PONumber); err == nil {
			list = append(list, a)
		}
	}
	if list == nil {
		list = []AwardedItem{}
	}
	return list, nil
}

type GeneratePORequest struct {
	PONumber   string `json:"po_number"`
	ProjectID  int    `json:"project_id"`
	SupplierID int    `json:"supplier_id"`
	MRFItemIDs []int  `json:"mrf_item_ids"`
}

func GeneratePO(req GeneratePORequest) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	var totalAmount float64

	// 1. Create the PO Header
	res, err := tx.Exec(`INSERT INTO tbl_po (project_id, supplier_id, po_number, po_date, total_amount, status) VALUES (?, ?, ?, ?, ?, 'Draft')`,
		req.ProjectID, req.SupplierID, req.PONumber, time.Now().Format("2006-01-02"), 0)
	if err != nil {
		tx.Rollback()
		return err
	}
	poID, _ := res.LastInsertId()

	// 2. Insert the PO Lines EXACTLY matching your tbl_po_items schema
	for _, id := range req.MRFItemIDs {
		var qty, price float64
		var itemName string

		err = tx.QueryRow(`
			SELECT mi.qty_backordered, q.quoted_landed_price, COALESCE(i.inventory_name, mi.custom_item_name) 
			FROM tbl_mrf_items mi 
			JOIN tbl_canvass_quotations q ON mi.mrf_item_id = q.mrf_item_id 
			LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
			WHERE mi.mrf_item_id = ? AND q.is_selected = 1`, id).Scan(&qty, &price, &itemName)

		if err != nil {
			tx.Rollback()
			return err
		}

		lineTotal := qty * price
		totalAmount += lineTotal

		// Using your exact columns: (po_id, mrf_item_id, description, qty, unit_price, total_price)
		_, err = tx.Exec(`
			INSERT INTO tbl_po_items (po_id, mrf_item_id, description, qty, unit_price, total_price) 
			VALUES (?, ?, ?, ?, ?, ?)`,
			poID, id, itemName, qty, price, lineTotal)

		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// 3. Update the PO Header with the grand total
	_, err = tx.Exec(`UPDATE tbl_po SET total_amount = ? WHERE po_id = ?`, totalAmount, poID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

type VirtualRFQ struct {
	RFQNumber    string `json:"rfq_number"`
	SupplierID   int    `json:"supplier_id"`
	SupplierName string `json:"supplier_name"`
	DateQuoted   string `json:"date_quoted"`
	ItemCount    int    `json:"item_count"`
	AwardedCount int    `json:"awarded_count"`
	Status       string `json:"status"`
}

type RFQPrintItem struct {
	DBOSCode       string  `json:"dbos_code"`
	InventoryName  string  `json:"inventory_name"`
	ProjectName    string  `json:"project_name"`
	MRFNumber      string  `json:"mrf_number"`
	QtyBackordered float64 `json:"qty_backordered"`
	UOMAbbr        string  `json:"uom_abbr"`
}

func GetVirtualRFQs() ([]VirtualRFQ, error) {
	query := `
		SELECT 
			q.rfq_number, 
			q.supplier_id, 
			COALESCE(c.company_name, 'Unknown'), 
			MIN(q.date_quoted) as date_quoted,
			COUNT(q.canvass_id) as item_count,
			SUM(CASE WHEN q.is_selected = 1 THEN 1 ELSE 0 END) as awarded_count
		FROM tbl_canvass_quotations q
		LEFT JOIN tbl_company c ON q.supplier_id = c.company_id
		WHERE q.rfq_number IS NOT NULL AND q.rfq_number != ''
		GROUP BY q.rfq_number, q.supplier_id, c.company_name
		ORDER BY date_quoted DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []VirtualRFQ
	for rows.Next() {
		var r VirtualRFQ
		if err := rows.Scan(&r.RFQNumber, &r.SupplierID, &r.SupplierName, &r.DateQuoted, &r.ItemCount, &r.AwardedCount); err == nil {
			// Calculate virtual status
			if r.AwardedCount == r.ItemCount {
				r.Status = "Fully Awarded"
			} else if r.AwardedCount > 0 {
				r.Status = "Partially Awarded"
			} else {
				r.Status = "Pending Bids"
			}
			list = append(list, r)
		}
	}
	if list == nil {
		list = []VirtualRFQ{}
	}
	return list, nil
}

func GetRFQItemsForPrint(rfqNumber string) ([]RFQPrintItem, error) {
	query := `
		SELECT 
			COALESCE(i.dbos_code, 'CUSTOM'), 
			COALESCE(i.inventory_name, mi.custom_item_name), 
			COALESCE(p.project_name, 'Unknown'), 
			m.mrf_number, 
			mi.qty_backordered, 
			COALESCE(u.uom_abbr, 'UNIT')
		FROM tbl_canvass_quotations q
		JOIN tbl_mrf_items mi ON q.mrf_item_id = mi.mrf_item_id
		JOIN tbl_mrf m ON mi.mrf_id = m.mrf_id
		LEFT JOIN projects p ON m.project_id = p.projects_id
		LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON i.uom_id = u.uom_id
		WHERE q.rfq_number = ?`

	rows, err := config.DB.Query(query, rfqNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []RFQPrintItem
	for rows.Next() {
		var item RFQPrintItem
		if err := rows.Scan(&item.DBOSCode, &item.InventoryName, &item.ProjectName, &item.MRFNumber, &item.QtyBackordered, &item.UOMAbbr); err == nil {
			list = append(list, item)
		}
	}
	return list, nil
}

type RFQQuoteLine struct {
	CanvassID          int     `json:"canvass_id"`
	MRFItemID          int     `json:"mrf_item_id"`
	DBOSCode           string  `json:"dbos_code"`
	InventoryName      string  `json:"inventory_name"`
	QtyBackordered     float64 `json:"qty_backordered"`
	UOMAbbr            string  `json:"uom_abbr"`
	QuotedUnitPrice    float64 `json:"quoted_unit_price"`
	QuotedLandedPrice  float64 `json:"quoted_landed_price"`
	QuotedSellingPrice float64 `json:"quoted_selling_price"`
	Remarks            string  `json:"remarks"`
	IsSelected         bool    `json:"is_selected"`
}

func GetQuotesByRFQ(rfqNumber string) ([]RFQQuoteLine, error) {
	query := `
		SELECT 
			q.canvass_id, q.mrf_item_id, 
			COALESCE(i.dbos_code, 'CUSTOM'), COALESCE(i.inventory_name, mi.custom_item_name), 
			mi.qty_backordered, COALESCE(u.uom_abbr, 'UNIT'), 
			q.quoted_unit_price, q.quoted_landed_price, q.quoted_selling_price, 
			COALESCE(q.remarks, ''), q.is_selected
		FROM tbl_canvass_quotations q
		JOIN tbl_mrf_items mi ON q.mrf_item_id = mi.mrf_item_id
		LEFT JOIN tbl_inventory i ON mi.inventory_id = i.inventory_id
		LEFT JOIN tbl_uom u ON i.uom_id = u.uom_id
		WHERE q.rfq_number = ?`

	rows, err := config.DB.Query(query, rfqNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []RFQQuoteLine
	for rows.Next() {
		var q RFQQuoteLine
		if err := rows.Scan(&q.CanvassID, &q.MRFItemID, &q.DBOSCode, &q.InventoryName, &q.QtyBackordered, &q.UOMAbbr, &q.QuotedUnitPrice, &q.QuotedLandedPrice, &q.QuotedSellingPrice, &q.Remarks, &q.IsSelected); err == nil {
			list = append(list, q)
		}
	}
	if list == nil {
		list = []RFQQuoteLine{}
	}
	return list, nil
}
