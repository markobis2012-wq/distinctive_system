package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func HandleGetGeneralAttachments(c *gin.Context) {
	atts, err := models.GetAllGeneralAttachments()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, atts)
}

func HandleCreateGeneralAttachment(c *gin.Context) {
	var a models.GeneralAttachment
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := models.CreateGeneralAttachment(a); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment saved"})
}

func HandleUpdateGeneralAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var a models.GeneralAttachment
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := models.UpdateGeneralAttachment(id, a); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment updated"})
}

func HandleDeleteGeneralAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteGeneralAttachment(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment deleted"})
}

func HandleUploadGeneralFile(c *gin.Context) {
	file, err := c.FormFile("document")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}

	uploadDir := "./uploads/general_attachments"
	os.MkdirAll(uploadDir, os.ModePerm)

	ext := filepath.Ext(file.Filename)
	newFileName := fmt.Sprintf("doc_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, newFileName)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file"})
		return
	}

	dbPath := "/uploads/general_attachments/" + newFileName
	// We also return the original filename so the frontend can auto-fill the "File Name" field!
	c.JSON(200, gin.H{"file_path": dbPath, "original_name": file.Filename})
}
