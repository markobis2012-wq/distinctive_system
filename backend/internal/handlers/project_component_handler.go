package handlers

import (
	"backend/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetSupplierProductsBySupplier(c *gin.Context) {
	supID, _ := strconv.Atoi(c.Param("supplier_id"))
	prods, err := models.GetComponentSupplierProducts(supID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch products"})
		return
	}
	c.JSON(200, prods)
}

func HandleGetItemComponents(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	comps, err := models.GetProjectItemComponents(itemID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch components"})
		return
	}
	c.JSON(200, comps)
}

func HandleAddItemComponent(c *gin.Context) {
	var req models.ProjectItemComponent
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AddProjectItemComponent(req); err != nil {
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}
	c.JSON(200, gin.H{"message": "Component added"})
}

func HandleDeleteItemComponent(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("comp_id"))
	models.DeleteProjectItemComponent(id)
	c.JSON(200, gin.H{"message": "Component deleted"})
}
