package handlers

import (
	"backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetProductionPipeline(c *gin.Context) {
	items, err := models.GetProductionPipeline()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func HandleAdvanceProduction(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req models.AdvanceProductionPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}

	// Validation
	if req.QtyToMove <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity to move must be greater than zero"})
		return
	}

	if req.InsertToLedger && (req.InventoryID == nil || *req.InventoryID <= 0) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Inventory ID is required when inserting a finished good into the master ledger."})
		return
	}

	// Execute Transaction
	if err := models.AdvanceToReady(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully advanced to Ready for Delivery"})
}

func HandleStartProduction(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req models.StartProductionPayload
	if err := c.ShouldBindJSON(&req); err != nil || req.QtyToStart <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}

	if err := models.StartProduction(id, req.QtyToStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Production started successfully"})
}
