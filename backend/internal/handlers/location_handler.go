package handlers

import (
	"backend/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HandleGetLocations(c *gin.Context) {
	data, err := models.GetAllLocations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load locations"})
		return
	}
	c.JSON(http.StatusOK, data)
}

func HandleCreateRegion(c *gin.Context) {
	var req models.NewRegionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	newRegion, err := models.CreateRegion(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create region"})
		return
	}
	c.JSON(200, newRegion)
}

func HandleCreateProvince(c *gin.Context) {
	var req models.NewProvinceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	newProv, err := models.CreateProvince(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create province"})
		return
	}
	c.JSON(200, newProv)
}

func HandleCreateCity(c *gin.Context) {
	var req models.NewCityReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	newCity, err := models.CreateCity(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create city"})
		return
	}
	c.JSON(200, newCity)
}
