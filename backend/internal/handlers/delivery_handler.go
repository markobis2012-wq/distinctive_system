package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func HandleGetDeliveries(c *gin.Context) {
	deliveries, _ := models.GetDeliveries()
	c.JSON(200, deliveries)
}

func HandleCreateDelivery(c *gin.Context) {
	var req struct {
		DeliveryDate  string `json:"delivery_date"`
		ProjectID     int    `json:"project_id"`
		ProjectNumber string `json:"project_number"`
		IsLoadingList int    `json:"is_loading_list"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid payload"})
		return
	}

	err := models.CreateDelivery(req.DeliveryDate, req.ProjectID, req.ProjectNumber, req.IsLoadingList)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create delivery"})
		return
	}

	c.JSON(200, gin.H{"message": "Delivery created successfully"})
}

func HandleDeleteDelivery(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	models.DeleteDelivery(id)
	c.JSON(200, gin.H{"message": "Delivery deleted"})
}

func HandleGenerateDeliveryFromBooking(c *gin.Context) {
	bookingID, _ := strconv.Atoi(c.Param("id"))

	// Add console log here
	println("--------------------------------------------------")
	println("[DEBUG API] POST /api/delivery/generate-from-booking/" + c.Param("id") + " called")

	err := models.GenerateDeliveryFromBooking(bookingID)
	if err != nil {
		println("[DEBUG API] BRIDGE FAILED with error:", err.Error())
		println("--------------------------------------------------")
		c.JSON(500, gin.H{"error": "Failed to bridge Job Order to Delivery: " + err.Error()})
		return
	}

	println("[DEBUG API] BRIDGE SUCCESSFUL!")
	println("--------------------------------------------------")
	c.JSON(200, gin.H{"message": "Delivery and Loading List generated successfully!"})
}

func HandleUpdateDeliveryStatus(c *gin.Context) {
	deliveryID, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	err := models.UpdateDeliveryStatus(deliveryID, req.Status)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Status successfully updated to " + req.Status})
}

func HandleGetClientHandoverReport(c *gin.Context) {
	deliveryID, _ := strconv.Atoi(c.Param("id"))
	items, err := models.GetClientHandoverReport(deliveryID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, items)
}

func HandleCompleteDelivery(c *gin.Context) {
	deliveryID, _ := strconv.Atoi(c.Param("id"))
	notes := c.PostForm("notes")

	var imagePath string

	// Check for file upload (the signed DR photo)
	file, err := c.FormFile("dr_image")
	if err == nil && file != nil {
		// Create safe filename and directory
		filename := fmt.Sprintf("dr_%d_%d_%s", deliveryID, time.Now().Unix(), file.Filename)
		saveDir := "uploads/accomplishments"
		os.MkdirAll(saveDir, 0755) // Ensure directory exists

		savePath := filepath.Join(saveDir, filename)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			imagePath = "/" + strings.ReplaceAll(savePath, "\\", "/")
		}
	}

	// Trigger Phase 4 Logic
	err = models.CompleteDeliveryAndDeduct(deliveryID, notes, imagePath)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Delivery completed and inventory deducted!"})
}
