package handlers

import (
	"backend/internal/models"
	"strconv"

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
