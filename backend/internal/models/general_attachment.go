package models

import "backend/internal/config"

type GeneralAttachment struct {
	AttachmentsID        int    `json:"attachments_id"`
	DateUploaded         string `json:"date_uploaded"`
	AttachmentFileTypeID int    `json:"attachment_file_type_id"`
	HasExpiration        int    `json:"has_expiration"`
	ExpirationDate       string `json:"expiration_date"`
	Version              string `json:"version"`
	FilePath             string `json:"file_path"`
	FileName             string `json:"file_name"`
}

func GetAllGeneralAttachments() ([]GeneralAttachment, error) {
	query := `
		SELECT attachments_id, COALESCE(CAST(date_uploaded AS CHAR), ''), COALESCE(attachment_file_type_id, 0), 
		       COALESCE(has_expiration, 0), COALESCE(CAST(expiration_date AS CHAR), ''), 
		       COALESCE(version, ''), COALESCE(file_path, ''), COALESCE(file_name, '')
		FROM tbl_attachments
		ORDER BY attachments_id DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var atts []GeneralAttachment
	for rows.Next() {
		var a GeneralAttachment
		if err := rows.Scan(&a.AttachmentsID, &a.DateUploaded, &a.AttachmentFileTypeID, &a.HasExpiration, &a.ExpirationDate, &a.Version, &a.FilePath, &a.FileName); err == nil {
			atts = append(atts, a)
		}
	}
	return atts, nil
}

func CreateGeneralAttachment(a GeneralAttachment) error {
	_, err := config.DB.Exec(`
		INSERT INTO tbl_attachments (date_uploaded, attachment_file_type_id, has_expiration, expiration_date, version, file_path, file_name) 
		VALUES (NULLIF(?, ''), ?, ?, NULLIF(?, ''), ?, ?, ?)`,
		a.DateUploaded, a.AttachmentFileTypeID, a.HasExpiration, a.ExpirationDate, a.Version, a.FilePath, a.FileName)
	return err
}

func UpdateGeneralAttachment(id int, a GeneralAttachment) error {
	_, err := config.DB.Exec(`
		UPDATE tbl_attachments 
		SET date_uploaded=NULLIF(?, ''), attachment_file_type_id=?, has_expiration=?, expiration_date=NULLIF(?, ''), version=?, file_path=?, file_name=? 
		WHERE attachments_id=?`,
		a.DateUploaded, a.AttachmentFileTypeID, a.HasExpiration, a.ExpirationDate, a.Version, a.FilePath, a.FileName, id)
	return err
}

func DeleteGeneralAttachment(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_attachments WHERE attachments_id = ?", id)
	return err
}
