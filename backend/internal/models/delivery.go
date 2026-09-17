package models

import (
	"backend/internal/config"
	"errors"
	"fmt"
	"log"
	"time"
)

type Delivery struct {
	DeliveryID     int     `json:"delivery_id"`
	DeliveryDate   string  `json:"delivery_date"`
	ProjectID      int     `json:"project_id"`
	DeliveryNo     string  `json:"delivery_no"`
	IsLoadingList  int     `json:"is_loading_list"`
	ProjectName    string  `json:"project_name"`
	ProjectNumber  string  `json:"project_number"`
	CompanyName    string  `json:"company_name"`
	ContractAmount float64 `json:"contract_amount"`
	BookingID      *int    `json:"booking_id"`
}

func GetDeliveries() ([]Delivery, error) {
	query := `
		SELECT a.delivery_id, CAST(a.delivery_date AS CHAR), a.project_id, a.delivery_no, a.is_loading_list,
		       COALESCE(b.project_name, ''), COALESCE(b.project_number, ''), 
		       COALESCE(c.company_name, ''), COALESCE(b.contract_amount, 0)
		FROM tbl_delivery a
		LEFT JOIN projects b ON b.projects_id = a.project_id
		LEFT JOIN tbl_company c ON c.company_id = b.client_id
		ORDER BY a.delivery_date DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Delivery
	for rows.Next() {
		var d Delivery
		if err := rows.Scan(&d.DeliveryID, &d.DeliveryDate, &d.ProjectID, &d.DeliveryNo, &d.IsLoadingList, &d.ProjectName, &d.ProjectNumber, &d.CompanyName, &d.ContractAmount); err == nil {
			list = append(list, d)
		}
	}
	if list == nil {
		list = []Delivery{}
	}
	return list, nil
}

func CreateDelivery(deliveryDate string, projectID int, projectNumber string, isLoadingList int) error {
	// 1. Get Project Reference No (Last 3 chars)
	var refNo string
	config.DB.QueryRow("SELECT COALESCE(reference_no, '') FROM projects WHERE projects_id = ?", projectID).Scan(&refNo)
	lastThree := "000"
	if len(refNo) >= 3 {
		lastThree = refNo[len(refNo)-3:]
	}

	// 2. Count existing records for this project to format the suffix (e.g., -001)
	var count int
	config.DB.QueryRow("SELECT COUNT(*) FROM tbl_delivery WHERE project_id = ? AND is_loading_list = ?", projectID, isLoadingList).Scan(&count)
	count += 1

	// 3. Auto-generate the Delivery Number exactly like your PHP logic
	var deliveryNo string
	year := time.Now().Format("2006")

	if isLoadingList == 1 {
		deliveryNo = fmt.Sprintf("%s-%s-%s-%03d", projectNumber, year, lastThree, count)
	} else {
		deliveryNo = fmt.Sprintf("%s-%03d", projectNumber, count)
	}

	// 4. Insert into database
	_, err := config.DB.Exec("INSERT INTO tbl_delivery (delivery_date, project_id, delivery_no, is_loading_list) VALUES (?, ?, ?, ?)",
		deliveryDate, projectID, deliveryNo, isLoadingList)
	return err
}

func DeleteDelivery(deliveryID int) error {
	// Cascade delete items and delivery
	config.DB.Exec("DELETE FROM tbl_delivery_item WHERE delivery_id = ?", deliveryID)
	_, err := config.DB.Exec("DELETE FROM tbl_delivery WHERE delivery_id = ?", deliveryID)
	return err
}

func GenerateDeliveryFromBooking(bookingID int) error {
	log.Printf("==> [BRIDGE DEBUG] Starting unified generation for Booking ID: %d\n", bookingID)

	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// 1. Get Job Order info
	var projectID int
	var startDate string
	err = tx.QueryRow("SELECT COALESCE(project_id, 0), COALESCE(CAST(start_date AS CHAR), '') FROM tbl_schedule_bookings WHERE booking_id = ?", bookingID).Scan(&projectID, &startDate)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Auto-generate Delivery No
	var projectNumber string
	tx.QueryRow("SELECT COALESCE(project_number, '') FROM projects WHERE projects_id = ?", projectID).Scan(&projectNumber)

	var count int
	tx.QueryRow("SELECT COUNT(*) FROM tbl_delivery WHERE project_id = ?", projectID).Scan(&count)
	count++
	deliveryNo := fmt.Sprintf("%s-%03d", projectNumber, count)

	// 3. Create SINGLE Delivery Record (We ignore is_loading_list entirely now, defaulting to 0)
	res, err := tx.Exec("INSERT INTO tbl_delivery (delivery_date, project_id, delivery_no, is_loading_list, booking_id) VALUES (?, ?, ?, 0, ?)", startDate, projectID, deliveryNo, bookingID)
	if err != nil {
		tx.Rollback()
		return err
	}
	deliveryID, _ := res.LastInsertId()

	// 4. Fetch FSM Payload Items
	rows, err := tx.Query("SELECT COALESCE(project_item_component_id, 0), COALESCE(custom_item_name, ''), COALESCE(qty_to_deliver, 0) FROM tbl_schedule_booking_items WHERE booking_id = ?", bookingID)
	if err != nil {
		tx.Rollback()
		return err
	}

	type FSMItem struct {
		CompID     int
		CustomName string
		Qty        float64
	}
	var payloadItems []FSMItem
	for rows.Next() {
		var item FSMItem
		if err := rows.Scan(&item.CompID, &item.CustomName, &item.Qty); err == nil {
			payloadItems = append(payloadItems, item)
		}
	}
	rows.Close()

	// 5. Populate tbl_delivery_item
	for _, item := range payloadItems {
		parentProjectItemID := 0

		if item.CompID > 0 {
			tx.QueryRow("SELECT COALESCE(project_items_id, 0) FROM tbl_project_item_component WHERE project_item_component_id = ?", item.CompID).Scan(&parentProjectItemID)
		}

		remarks := "Auto-generated from FSM"
		if item.CustomName != "" {
			remarks = "Custom Item: " + item.CustomName
		}

		// Insert with BOTH Parent ID and Component ID! This is the magic that allows two different printouts.
		_, err = tx.Exec("INSERT INTO tbl_delivery_item (delivery_id, project_item_id, project_item_component_id, deliver_qty, remarks) VALUES (?, ?, ?, ?, ?)", deliveryID, parentProjectItemID, item.CompID, item.Qty, remarks)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	log.Println("==> [BRIDGE DEBUG] Success! Unified Delivery created.")
	return tx.Commit()
}

// Updates the FSM Job Order status using the Delivery ID
func UpdateDeliveryStatus(deliveryID int, status string) error {
	var bookingID *int

	// 1. Find the FSM Job Order linked to this Delivery
	err := config.DB.QueryRow("SELECT booking_id FROM tbl_delivery WHERE delivery_id = ?", deliveryID).Scan(&bookingID)
	if err != nil {
		return err
	}
	if bookingID == nil {
		return errors.New("this delivery is not linked to an FSM Job Order")
	}

	// 2. Update the Job Order status so the Dispatcher sees it on their calendar!
	_, err = config.DB.Exec("UPDATE tbl_schedule_bookings SET status = ? WHERE booking_id = ?", status, *bookingID)
	return err
}

type ClientHandoverItem struct {
	ProjectItemID  int    `json:"project_item_id"`
	ProductName    string `json:"product_name"`
	Description    string `json:"description"`
	ImagePath      string `json:"image_path"`
	UOMAbbr        string `json:"uom_abbr"`
	ComponentsList string `json:"components_list"`
}

func GetClientHandoverReport(deliveryID int) ([]ClientHandoverItem, error) {
	// We GROUP BY the parent Project Item.
	// The components are grouped into a single text string separated by the pipe "|" character so React can format it as bullets!
	query := `
		SELECT 
			a.project_item_id,
			COALESCE(MAX(p.product_name), MAX(a.remarks), 'Custom / Unlinked Item') as product_name,
			COALESCE(MAX(p.product_description), '') as description,
			COALESCE(MAX(p.dbos_image_path), MAX(p.image_path), '') as image_path,
			COALESCE(MAX(u.uom_abbr), 'Lot') as uom_abbr,
			GROUP_CONCAT(CONCAT('• ', COALESCE(inv.inventory_name, sp.supplier_product_name, a.remarks, 'Part'), ' (Qty: ', a.deliver_qty, ')') SEPARATOR '|') as components_list
		FROM tbl_delivery_item a
		LEFT JOIN tbl_project_items p ON p.project_items_id = a.project_item_id
		LEFT JOIN tbl_uom u ON u.uom_id = p.uom
		LEFT JOIN tbl_project_item_component c ON c.project_item_component_id = a.project_item_component_id
		LEFT JOIN tbl_inventory inv ON inv.inventory_id = c.inventory_id
		LEFT JOIN tbl_supplier_products sp ON sp.supplier_product_id = c.supplier_product_id
		WHERE a.delivery_id = ?
		GROUP BY a.project_item_id
		ORDER BY a.project_item_id ASC`

	rows, err := config.DB.Query(query, deliveryID)
	if err != nil {
		log.Println("==> [HANDOVER DEBUG] SQL Error:", err)
		return nil, err
	}
	defer rows.Close()

	var items []ClientHandoverItem
	for rows.Next() {
		var i ClientHandoverItem
		err := rows.Scan(&i.ProjectItemID, &i.ProductName, &i.Description, &i.ImagePath, &i.UOMAbbr, &i.ComponentsList)
		if err == nil {
			items = append(items, i)
		}
	}
	if items == nil {
		items = []ClientHandoverItem{}
	}
	return items, nil
}

func CompleteDeliveryAndDeduct(deliveryID int, notes string, imagePath string) error {
	log.Printf("==> [PHASE 4] Closing Delivery %d and Deducting Inventory...\n", deliveryID)

	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	// STEP 1: Find the linked FSM Job Order
	var bookingID int
	err = tx.QueryRow("SELECT COALESCE(booking_id, 0) FROM tbl_delivery WHERE delivery_id = ?", deliveryID).Scan(&bookingID)
	if err != nil {
		tx.Rollback()
		log.Printf("==> [PHASE 4 ERROR] Step 1 Failed (Finding Booking ID): %v\n", err)
		return errors.New("could not find linked FSM job order")
	}

	// STEP 2: Update FSM Job Order to Completed (Using accomplishment_notes!)
	if bookingID > 0 {

		// Combine the crew's text notes with the uploaded image link
		fullNotes := notes
		if imagePath != "" {
			fullNotes += "\n\n[Attached DR Image]: " + imagePath
		}

		updateScd := `
			UPDATE tbl_schedule_bookings 
			SET status = 'Completed', 
			    accomplishment_notes = CONCAT(COALESCE(accomplishment_notes, ''), '\n\n[Accomplishment Report]:\n', ?)
			WHERE booking_id = ?`

		_, err = tx.Exec(updateScd, fullNotes, bookingID)
		if err != nil {
			tx.Rollback()
			log.Printf("==> [PHASE 4 ERROR] Step 2 Failed (Updating tbl_schedule_bookings): %v\n", err)
			return err
		}
	}

	// STEP 3: THE CRUCIAL DEDUCTION! (Tracking qty_ready_for_delivery)
	deductionQuery := `
		UPDATE tbl_project_items p
		JOIN (
			SELECT project_item_id, MIN(deliver_qty) as parent_qty_delivered
			FROM tbl_delivery_item
			WHERE delivery_id = ? AND project_item_id > 0
			GROUP BY project_item_id
		) d ON p.project_items_id = d.project_item_id
		SET 
			p.qty_delivered = COALESCE(p.qty_delivered, 0) + d.parent_qty_delivered,
			p.qty_ready_for_delivery = GREATEST(COALESCE(p.qty_ready_for_delivery, 0) - d.parent_qty_delivered, 0)
	`

	_, err = tx.Exec(deductionQuery, deliveryID)
	if err != nil {
		log.Printf("==> [PHASE 4 ERROR] Step 3 Failed (Inventory Deduction SQL): %v\n", err)
		tx.Rollback()
		return err
	}

	log.Println("==> [PHASE 4 SUCCESS] Delivery Closed. Inventory Deducted.")
	return tx.Commit()
}
