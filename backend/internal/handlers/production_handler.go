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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := models.AdvanceToReady(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Successfully advanced to Ready for Delivery"})
}
