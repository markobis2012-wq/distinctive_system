package models

import (
	"backend/internal/config"
	"time"
)

// Struct for the Dropdown
type FileTypeOption struct {
	ID             int    `json:"attachment_file_type_id"`
	Name           string `json:"attachment_file_type"`
	IsOverwritable int    `json:"is_overwritable"`
}

// Struct for the Table
type ProjectAttachment struct {
	ReqID        int    `json:"project_required_attachment_id"`
	AttachmentID int    `json:"attachments_id"`
	FileType     string `json:"attachment_file_type"`
	FileName     string `json:"file_name"`
	FilePath     string `json:"file_path"`
	DateUploaded string `json:"date_uploaded"`
	HasExp       int    `json:"has_expiration"`
	ExpDate      string `json:"expiration_date"`
	Version      string `json:"version"`
}

func GetAttachmentFileTypes() ([]FileTypeOption, error) {
	rows, err := config.DB.Query("SELECT attachment_file_type_id, attachment_file_type, is_overwritable FROM tbl_attachment_file_type ORDER BY attach_order ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []FileTypeOption
	for rows.Next() {
		var t FileTypeOption
		if err := rows.Scan(&t.ID, &t.Name, &t.IsOverwritable); err == nil {
			list = append(list, t)
		}
	}
	if list == nil {
		list = []FileTypeOption{}
	}
	return list, nil
}

func GetProjectAttachments(projectID int) ([]ProjectAttachment, error) {
	query := `
		SELECT 
			pra.project_required_attachment_id, a.attachments_id, 
			COALESCE(ft.attachment_file_type, 'Unknown'), COALESCE(a.file_name, ''), 
			COALESCE(a.file_path, ''), COALESCE(CAST(a.date_uploaded AS CHAR), ''), 
			COALESCE(a.has_expiration, 0), COALESCE(CAST(a.expiration_date AS CHAR), ''), COALESCE(a.version, '')
		FROM tbl_project_required_attachment pra
		JOIN tbl_attachments a ON pra.attachment_id = a.attachments_id
		JOIN tbl_attachment_file_type ft ON pra.attachement_file_type_id = ft.attachment_file_type_id
		WHERE pra.projects_id = ?
		ORDER BY pra.project_required_attachment_id DESC`

	rows, err := config.DB.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []ProjectAttachment
	for rows.Next() {
		var f ProjectAttachment
		if err := rows.Scan(&f.ReqID, &f.AttachmentID, &f.FileType, &f.FileName, &f.FilePath, &f.DateUploaded, &f.HasExp, &f.ExpDate, &f.Version); err == nil {
			files = append(files, f)
		}
	}
	if files == nil {
		files = []ProjectAttachment{}
	}
	return files, nil
}

func UploadProjectAttachment(projectID int, fileTypeID int, hasExp int, expDate string, version string, filePath string, fileName string) error {
	dateUploaded := time.Now().Format("2006-01-02")

	// 1. Insert into tbl_attachments
	res, err := config.DB.Exec(
		"INSERT INTO tbl_attachments (date_uploaded, attachment_file_type_id, has_expiration, expiration_date, version, file_path, file_name) VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?)",
		dateUploaded, fileTypeID, hasExp, expDate, version, filePath, fileName,
	)
	if err != nil {
		return err
	}

	newAttachID, _ := res.LastInsertId()

	// 2. Check Overwritable rules
	var isOverwritable int
	config.DB.QueryRow("SELECT is_overwritable FROM tbl_attachment_file_type WHERE attachment_file_type_id = ?", fileTypeID).Scan(&isOverwritable)

	var exists int
	config.DB.QueryRow("SELECT COUNT(*) FROM tbl_project_required_attachment WHERE projects_id = ? AND attachement_file_type_id = ?", projectID, fileTypeID).Scan(&exists)

	// 3. Insert or Update linking table based on rules
	if exists > 0 && isOverwritable == 1 {
		// Replace the existing requirement link with the new file
		_, err = config.DB.Exec("UPDATE tbl_project_required_attachment SET attachment_id = ? WHERE projects_id = ? AND attachement_file_type_id = ?", newAttachID, projectID, fileTypeID)
	} else {
		// Add as a new requirement line
		_, err = config.DB.Exec("INSERT INTO tbl_project_required_attachment (projects_id, attachement_file_type_id, attachment_id) VALUES (?, ?, ?)", projectID, fileTypeID, newAttachID)
	}

	return err
}

func DeleteProjectAttachment(attachID int) error {
	// Delete the link
	config.DB.Exec("DELETE FROM tbl_project_required_attachment WHERE attachment_id = ?", attachID)
	// Delete the actual file record
	_, err := config.DB.Exec("DELETE FROM tbl_attachments WHERE attachments_id = ?", attachID)
	return err
}
