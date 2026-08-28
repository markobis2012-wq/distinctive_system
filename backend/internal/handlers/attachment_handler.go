package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetAttachments(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	attachments, err := models.GetAttachmentsByCompany(companyID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch attachments"})
		return
	}
	c.JSON(200, attachments)
}

func parseAttachmentForm(c *gin.Context, companyID int) (models.CompanyAttachment, error) {
	var a models.CompanyAttachment
	a.CompanyID = companyID
	a.FileName = c.PostForm("file_name")
	a.ReferenceNo = c.PostForm("reference_no")
	a.ExpirationDate = c.PostForm("expiration_date")
	a.HasExpiration, _ = strconv.Atoi(c.PostForm("has_expiration"))
	a.IsOverwritable, _ = strconv.Atoi(c.PostForm("is_overwritable"))
	a.IsCatalogue, _ = strconv.Atoi(c.PostForm("is_catalogue"))

	file, err := c.FormFile("file_path")
	if err == nil && file != nil {
		dir := fmt.Sprintf("./company_attachments/%d", companyID)
		os.MkdirAll(dir, 0755)
		fileName := filepath.Base(file.Filename)
		savePath := filepath.Join(dir, fileName)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			a.FilePath = fmt.Sprintf("/company_attachments/%d/%s", companyID, fileName)
		}
	}
	return a, nil
}

func HandleAddAttachment(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	a, _ := parseAttachmentForm(c, companyID)
	if err := models.AddAttachment(a); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save attachment"})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment saved"})
}

func HandleUpdateAttachment(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	attID, _ := strconv.Atoi(c.Param("att_id"))
	a, _ := parseAttachmentForm(c, companyID)
	a.ID = attID
	if err := models.UpdateAttachment(a); err != nil {
		c.JSON(500, gin.H{"error": "Failed to update attachment"})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment updated"})
}

func HandleDeleteAttachment(c *gin.Context) {
	attID, _ := strconv.Atoi(c.Param("att_id"))
	models.DeleteAttachment(attID)
	c.JSON(200, gin.H{"message": "Attachment deleted"})
}
