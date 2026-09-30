package handlers

import (
	"backend/internal/models"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetProjectItems(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)

	log.Printf("---------------------------------------------------")
	log.Printf("📥 [API HIT] GET /api/projects/%s/items", idStr)
	log.Printf("⚙️ Parsed Project ID: %d (Error: %v)", id, err)

	items, err := models.GetProjectItems(id)
	if err != nil {
		log.Printf("❌ [HANDLER ERROR] Failed to fetch items: %v", err)
		c.JSON(500, gin.H{"error": "Failed to fetch project items"})
		return
	}

	log.Printf("📤 [API SUCCESS] Sending %d items back to frontend", len(items))
	log.Printf("---------------------------------------------------")

	c.JSON(200, items)
}

func parseProjectItemForm(c *gin.Context, projectID int) (models.ProjectItem, error) {
	var i models.ProjectItem
	i.ProjectID = projectID
	i.ProductName = c.PostForm("product_name")
	i.ProductDescription = c.PostForm("product_description")
	i.Qty, _ = strconv.Atoi(c.PostForm("qty"))

	// FIXED: Updated to UomID to match the model and database
	i.UomID, _ = strconv.Atoi(c.PostForm("uom_id"))

	i.UnitPrice, _ = strconv.ParseFloat(c.PostForm("unit_price"), 64)
	i.TotalPrice, _ = strconv.ParseFloat(c.PostForm("total_price"), 64)
	i.ProjectComponentsTotal = c.PostForm("project_components_total")
	i.Location = c.PostForm("location")

	// Parse the cached columns sent from the frontend
	i.QtyInProduction, _ = strconv.ParseFloat(c.PostForm("qty_in_production"), 64)
	i.QtyReadyForDelivery, _ = strconv.ParseFloat(c.PostForm("qty_ready_for_delivery"), 64)
	i.QtyDelivered, _ = strconv.ParseFloat(c.PostForm("qty_delivered"), 64)

	dir := fmt.Sprintf("./project_items/%d", projectID)
	os.MkdirAll(dir, 0755)

	if file, err := c.FormFile("image_path"); err == nil && file != nil {
		fileName := "prod_" + filepath.Base(file.Filename)
		if err := c.SaveUploadedFile(file, filepath.Join(dir, fileName)); err == nil {
			i.ImagePath = fmt.Sprintf("/project_items/%d/%s", projectID, fileName)
		}
	}

	if file, err := c.FormFile("dbos_image_path"); err == nil && file != nil {
		fileName := "dbos_" + filepath.Base(file.Filename)
		if err := c.SaveUploadedFile(file, filepath.Join(dir, fileName)); err == nil {
			i.DbosImagePath = fmt.Sprintf("/project_items/%d/%s", projectID, fileName)
		}
	}
	return i, nil
}

func HandleAddProjectItem(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))
	item, _ := parseProjectItemForm(c, projectID)
	if err := models.AddProjectItem(item); err != nil {
		c.JSON(500, gin.H{"error": "Failed to add item"})
		return
	}
	c.JSON(200, gin.H{"message": "Item added"})
}

func HandleUpdateProjectItem(c *gin.Context) {
	projectID, _ := strconv.Atoi(c.Param("id"))
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	item, _ := parseProjectItemForm(c, projectID)
	item.ItemID = itemID
	if err := models.UpdateProjectItem(item); err != nil {
		c.JSON(500, gin.H{"error": "Failed to update item"})
		return
	}
	c.JSON(200, gin.H{"message": "Item updated"})
}

func HandleDeleteProjectItem(c *gin.Context) {
	itemID, _ := strconv.Atoi(c.Param("item_id"))
	models.DeleteProjectItem(itemID)
	c.JSON(200, gin.H{"message": "Item deleted"})
}
