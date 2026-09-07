package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetAttachmentFileTypes(c *gin.Context) {
	types, _ := models.GetAttachmentFileTypes()
	c.JSON(200, types)
}

func HandleGetProjectAttachments(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	files, _ := models.GetProjectAttachments(id)
	c.JSON(200, files)
}

func HandleUploadProjectAttachment(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))
	fileTypeID, _ := strconv.Atoi(c.PostForm("file_type_id"))
	hasExp, _ := strconv.Atoi(c.PostForm("has_expiration"))
	expDate := c.PostForm("expiration_date")
	version := c.PostForm("version")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "File is required"})
		return
	}

	dir := fmt.Sprintf("./uploads/project_attachments/%d", projectID)
	os.MkdirAll(dir, 0755)

	fileName := filepath.Base(file.Filename)
	// Add version to filename if provided
	if version != "" {
		ext := filepath.Ext(fileName)
		nameWithoutExt := fileName[0 : len(fileName)-len(ext)]
		fileName = fmt.Sprintf("%s_v%s%s", nameWithoutExt, version, ext)
	}

	savePath := filepath.Join(dir, fileName)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file physically"})
		return
	}

	dbPath := fmt.Sprintf("/uploads/project_attachments/%d/%s", projectID, fileName)

	err = models.UploadProjectAttachment(projectID, fileTypeID, hasExp, expDate, version, dbPath, fileName)
	if err != nil {
		c.JSON(500, gin.H{"error": "Database error saving attachment info"})
		return
	}

	c.JSON(200, gin.H{"message": "File successfully uploaded"})
}

func HandleDeleteProjectAttachment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("attach_id"))
	models.DeleteProjectAttachment(id)
	c.JSON(200, gin.H{"message": "Attachment deleted"})
}
