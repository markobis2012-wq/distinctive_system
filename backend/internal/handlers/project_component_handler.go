package handlers

import (
	"backend/internal/models"
	"log" // <-- Added for better debugging
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetSupplierProductsBySupplier(c *gin.Context) {
	supID, _ := strconv.Atoi(c.Param("supplier_id"))
	prods, err := models.GetComponentSupplierProducts(supID)
	if err != nil {
		log.Printf("❌ API Error fetching supplier products: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to fetch products"})
		return
	}
	c.JSON(200, prods)
}

func HandleGetItemComponents(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	comps, err := models.GetProjectItemComponents(itemID)
	if err != nil {
		log.Printf("❌ API Error fetching components: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to fetch components"})
		return
	}
	c.JSON(200, comps)
}

func HandleAddItemComponent(c *gin.Context) {
	var req models.ProjectItemComponent
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ API Error binding component JSON: %v\n", err)
		c.JSON(400, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if err := models.AddProjectItemComponent(req); err != nil {
		log.Printf("❌ API Error saving component to DB: %v\n", err)
		c.JSON(500, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Component added"})
}

func HandleDeleteItemComponent(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("comp_id"))
	if err := models.DeleteProjectItemComponent(id); err != nil {
		log.Printf("❌ API Error deleting component: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to delete"})
		return
	}
	c.JSON(200, gin.H{"message": "Component deleted"})
}

func HandleGetAllProjectComponents(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid project ID"})
		return
	}

	bom, err := models.GetAllProjectComponents(projectID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch project BOM"})
		return
	}
	c.JSON(200, bom)
}
