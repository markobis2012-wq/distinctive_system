package handlers

import (
	"backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// --- CURRENCIES ---
func HandleGetCurrencies(c *gin.Context) {
	currencies, err := models.GetCurrencies()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, currencies)
}

// --- PROJECT PARTS (LOADING LIST) ---
func HandleGetProjectParts(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))
	parts, err := models.GetPartsByProject(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, parts)
}

func HandleAddProjectPart(c *gin.Context) {
	var part models.ProjectPart
	if err := c.ShouldBindJSON(&part); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}
	if err := models.AddProjectPart(part); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Part added successfully"})
}

func HandleDeleteProjectPart(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteProjectPart(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Part deleted"})
}

// --- MASTER PROJECT BOM ---
func HandleGetMasterBOM(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))
	bom, err := models.GetMasterBOM(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bom)
}

func HandleAddMasterBOM(c *gin.Context) {
	var req models.AddBOMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format"})
		return
	}
	if err := models.AddMasterBOM(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "BOM material added successfully"})
}

func HandleDeleteMasterBOM(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteMasterBOM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "BOM material deleted"})
}

func HandleGetUOMs(c *gin.Context) {
	uoms, err := models.GetUOMs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, uoms)
}
