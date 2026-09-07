package handlers

import (
	"backend/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetLoadingListItems(c *gin.Context) {
	deliveryID, _ := strconv.Atoi(c.Param("id"))
	items, err := models.GetLoadingListItems(deliveryID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, items)
}

func HandleAddLoadingListItem(c *gin.Context) {
	var req struct {
		DeliveryID    int `json:"delivery_id"`
		ProjectItemID int `json:"project_item_id"`
		DeliverQty    int `json:"deliver_qty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	err := models.AddLoadingListItems(req.DeliveryID, req.ProjectItemID, req.DeliverQty)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Components added to loading list"})
}

func HandleDeleteLoadingListItem(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	models.DeleteLoadingListItem(itemID)
	c.JSON(200, gin.H{"message": "Item deleted"})
}
