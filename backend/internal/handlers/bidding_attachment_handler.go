package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetBiddingAttachments(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	attachments, err := models.GetBiddingAttachments(id)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch attachments"})
		return
	}
	c.JSON(200, attachments)
}

func HandleGetBiddingAttachmentTypes(c *gin.Context) {
	types, err := models.GetBiddingAttachmentTypes()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch attachment types"})
		return
	}
	c.JSON(200, types)
}

func HandleAddBiddingAttachment(c *gin.Context) {
	biddingID, _ := strconv.Atoi(c.Param("id"))
	var a models.BiddingAttachment
	a.BiddingID = biddingID
	a.Filename = c.PostForm("filename")
	a.FileTypeID, _ = strconv.Atoi(c.PostForm("bidding_attachment_file_type_id"))

	file, err := c.FormFile("file")
	if err == nil && file != nil {
		dir := fmt.Sprintf("./bidding_attachments/%d", biddingID)
		os.MkdirAll(dir, 0755)
		fileName := filepath.Base(file.Filename)
		savePath := filepath.Join(dir, fileName)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			a.FilePath = fmt.Sprintf("/bidding_attachments/%d/%s", biddingID, fileName)
		}
	}

	if err := models.AddBiddingAttachment(a); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save attachment"})
		return
	}
	c.JSON(200, gin.H{"message": "Attachment saved"})
}

func HandleDeleteBiddingAttachment(c *gin.Context) {
	attID, _ := strconv.Atoi(c.Param("att_id"))
	models.DeleteBiddingAttachment(attID)
	c.JSON(200, gin.H{"message": "Deleted"})
}
