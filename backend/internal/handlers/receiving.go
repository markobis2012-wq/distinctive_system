package handlers

import (
	"backend/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HandleGetIncomingPO(c *gin.Context) {
	items, err := models.GetIncomingPOItems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func HandleReceiveGoods(c *gin.Context) {
	var req struct {
		POItemID    int     `json:"po_item_id"`
		QtyReceived float64 `json:"qty_received"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if err := models.ReceiveGoods(req.POItemID, req.QtyReceived); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Goods successfully received into inventory!"})
}

func HandleUpdatePOETA(c *gin.Context) {
	poNum := c.Param("po_number")
	var req struct {
		ETA string `json:"eta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.UpdatePOETA(poNum, req.ETA); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ETA Updated"})
}
