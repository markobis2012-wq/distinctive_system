package models

import (
	"backend/internal/config"
)

type CompanyAttachment struct {
	ID             int    `json:"comp_attachments_id"`
	CompanyID      int    `json:"company_id"`
	FilePath       string `json:"file_path"`
	FileName       string `json:"file_name"`
	HasExpiration  int    `json:"has_expiration"`
	ExpirationDate string `json:"expiration_date"` // Stored as string to easily parse YYYY-MM-DD
	IsOverwritable int    `json:"is_overwritable"`
	IsCatalogue    int    `json:"is_catalogue"`
	ReferenceNo    string `json:"reference_no"`
}

func GetAttachmentsByCompany(companyID int) ([]CompanyAttachment, error) {
	// We cast expiration_date to CHAR so Go can read it easily as a string
	query := `SELECT comp_attachments_id, company_id, COALESCE(file_path, ''), COALESCE(file_name, ''), 
			  COALESCE(has_expiration, 0), COALESCE(CAST(expiration_date AS CHAR), ''), 
			  COALESCE(is_overwritable, 0), COALESCE(is_catalogue, 0), COALESCE(reference_no, '') 
			  FROM tbl_comp_attachments WHERE company_id = ?`
	rows, err := config.DB.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []CompanyAttachment
	for rows.Next() {
		var a CompanyAttachment
		if err := rows.Scan(&a.ID, &a.CompanyID, &a.FilePath, &a.FileName, &a.HasExpiration, &a.ExpirationDate, &a.IsOverwritable, &a.IsCatalogue, &a.ReferenceNo); err == nil {
			attachments = append(attachments, a)
		}
	}
	if attachments == nil {
		attachments = []CompanyAttachment{}
	}
	return attachments, nil
}

func AddAttachment(a CompanyAttachment) error {
	var expDate interface{} = nil
	if a.HasExpiration == 1 && a.ExpirationDate != "" {
		expDate = a.ExpirationDate
	}

	query := `INSERT INTO tbl_comp_attachments (company_id, file_path, file_name, has_expiration, expiration_date, is_overwritable, is_catalogue, reference_no) 
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := config.DB.Exec(query, a.CompanyID, a.FilePath, a.FileName, a.HasExpiration, expDate, a.IsOverwritable, a.IsCatalogue, a.ReferenceNo)
	return err
}

func UpdateAttachment(a CompanyAttachment) error {
	var expDate interface{} = nil
	if a.HasExpiration == 1 && a.ExpirationDate != "" {
		expDate = a.ExpirationDate
	}

	if a.FilePath != "" {
		query := `UPDATE tbl_comp_attachments SET file_path=?, file_name=?, has_expiration=?, expiration_date=?, is_overwritable=?, is_catalogue=?, reference_no=? WHERE comp_attachments_id=?`
		_, err := config.DB.Exec(query, a.FilePath, a.FileName, a.HasExpiration, expDate, a.IsOverwritable, a.IsCatalogue, a.ReferenceNo, a.ID)
		return err
	}
	query := `UPDATE tbl_comp_attachments SET file_name=?, has_expiration=?, expiration_date=?, is_overwritable=?, is_catalogue=?, reference_no=? WHERE comp_attachments_id=?`
	_, err := config.DB.Exec(query, a.FileName, a.HasExpiration, expDate, a.IsOverwritable, a.IsCatalogue, a.ReferenceNo, a.ID)
	return err
}

func DeleteAttachment(id int) error {
	// Hard delete because there is no is_active column
	_, err := config.DB.Exec("DELETE FROM tbl_comp_attachments WHERE comp_attachments_id = ?", id)
	return err
}
