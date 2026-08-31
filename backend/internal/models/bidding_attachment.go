package models

import "backend/internal/config"

type BiddingAttachment struct {
	ID           int    `json:"bidding_attachments_id"`
	DateAttached string `json:"date_attached"`
	BiddingID    int    `json:"bidding_id"`
	FileTypeID   int    `json:"bidding_attachment_file_type_id"`
	FileTypeName string `json:"bidding_attachment_file_type"`
	FilePath     string `json:"file_path"`
	Filename     string `json:"filename"`
}

type BiddingAttachmentType struct {
	ID   int    `json:"bidding_attachment_file_type_id"`
	Type string `json:"bidding_attachment_file_type"`
}

func GetBiddingAttachments(biddingID int) ([]BiddingAttachment, error) {
	query := `
		SELECT a.bidding_attachments_id, COALESCE(CAST(a.date_attached AS CHAR), ''), a.bidding_id, 
		       a.bidding_attachment_file_type_id, COALESCE(t.bidding_attachment_file_type, 'Unknown'), 
		       COALESCE(a.file_path, ''), a.filename
		FROM tbl_bidding_attachments a
		LEFT JOIN tbl_bidding_attachment_file_type t ON a.bidding_attachment_file_type_id = t.bidding_attachment_file_type_id
		WHERE a.bidding_id = ? ORDER BY a.bidding_attachments_id DESC`

	rows, err := config.DB.Query(query, biddingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []BiddingAttachment
	for rows.Next() {
		var a BiddingAttachment
		if err := rows.Scan(&a.ID, &a.DateAttached, &a.BiddingID, &a.FileTypeID, &a.FileTypeName, &a.FilePath, &a.Filename); err == nil {
			attachments = append(attachments, a)
		}
	}
	if attachments == nil {
		attachments = []BiddingAttachment{}
	}
	return attachments, nil
}

func AddBiddingAttachment(a BiddingAttachment) error {
	query := `INSERT INTO tbl_bidding_attachments (date_attached, bidding_id, bidding_attachment_file_type_id, file_path, filename) 
			  VALUES (CURDATE(), ?, ?, ?, ?)`
	_, err := config.DB.Exec(query, a.BiddingID, a.FileTypeID, a.FilePath, a.Filename)
	return err
}

func DeleteBiddingAttachment(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_bidding_attachments WHERE bidding_attachments_id = ?", id)
	return err
}

func GetBiddingAttachmentTypes() ([]BiddingAttachmentType, error) {
	rows, err := config.DB.Query("SELECT bidding_attachment_file_type_id, bidding_attachment_file_type FROM tbl_bidding_attachment_file_type")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var types []BiddingAttachmentType
	for rows.Next() {
		var t BiddingAttachmentType
		if err := rows.Scan(&t.ID, &t.Type); err == nil {
			types = append(types, t)
		}
	}
	if types == nil {
		types = []BiddingAttachmentType{}
	}
	return types, nil
}
