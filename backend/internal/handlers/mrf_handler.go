package handlers

import (
	"backend/internal/models"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetPendingMRFs(c *gin.Context) {
	mrfs, err := models.GetPendingMRFs()
	if err != nil {
		log.Printf("❌ API ERROR /api/warehouse/mrfs/pending: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mrfs)
}

func GetMRFItemsForFulfillment(c *gin.Context) {
	mrfID, _ := strconv.Atoi(c.Param("id"))
	items, err := models.GetMRFItemsForFulfillment(mrfID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func FulfillMRF(c *gin.Context) {
	var req models.FulfillMRFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := models.FulfillMRF(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "MRF Approved and Stock Consumed!"})
}

func CreateProjectMRF(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))

	var req models.CreateMRFRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot submit an empty MRF"})
		return
	}

	if err := models.CreateMRF(projectID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create MRF: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "MRF successfully created"})
}

func GetProjectMRFs(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	mrfs, err := models.GetMRFsByProject(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch MRFs: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mrfs)
}

func GetMRFHistory(c *gin.Context) {
	mrfs, err := models.GetMRFHistory()
	if err != nil {
		log.Printf("❌ API ERROR /api/warehouse/mrfs/history: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mrfs)
}
