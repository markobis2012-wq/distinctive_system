package handlers

import (
	"backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetDeliveryItems(c *gin.Context) {
	deliveryID, _ := strconv.Atoi(c.Param("id"))
	items, _ := models.GetDeliveryItems(deliveryID)
	c.JSON(200, items)
}

func HandleGetAvailableProjectItems(c *gin.Context) {
	paramID := c.Param("id")
	projectID, err := strconv.Atoi(paramID)

	// DEBUG LOG
	println("--------------------------------------------------")
	println("[DEBUG API] /api/projects/:id/available-items called")
	println("[DEBUG API] Raw param ':id':", paramID, "| Parsed projectID:", projectID)
	if err != nil {
		println("[DEBUG API] Param parse error:", err.Error())
	}

	items, dbErr := models.GetAvailableProjectItems(projectID)
	if dbErr != nil {
		println("[DEBUG API] SQL Error:", dbErr.Error())
		c.JSON(500, gin.H{"error": "Database error: " + dbErr.Error()})
		return
	}

	println("[DEBUG API] Total available items found in DB:", len(items))
	println("--------------------------------------------------")

	c.JSON(200, items)
}

func HandleAddDeliveryItem(c *gin.Context) {
	var payload models.AddDeliveryItemPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}

	if err := models.AddDeliveryItem(payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Item added to shipment"})
}

func HandleUpdateDeliveryItem(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	var req struct {
		DeliverQty int    `json:"deliver_qty"`
		Remarks    string `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	models.UpdateDeliveryItem(itemID, req.DeliverQty, req.Remarks)
	c.JSON(200, gin.H{"message": "Item updated"})
}

func HandleDeleteDeliveryItem(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	models.DeleteDeliveryItem(itemID)
	c.JSON(200, gin.H{"message": "Item deleted"})
}

func HandleGetDeliveryByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	delivery, err := models.GetDeliveryByID(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "Delivery not found"})
		return
	}
	c.JSON(200, delivery)
}
