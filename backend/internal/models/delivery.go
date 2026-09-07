package models

import (
	"backend/internal/config"
	"fmt"
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
