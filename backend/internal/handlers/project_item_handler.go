package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetProjectItems(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	items, err := models.GetProjectItems(id)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch project items"})
		return
	}
	c.JSON(200, items)
}

func parseProjectItemForm(c *gin.Context, projectID int) (models.ProjectItem, error) {
	var i models.ProjectItem
	i.ProjectID = projectID
	i.ProductName = c.PostForm("product_name")
	i.ProductDescription = c.PostForm("product_description")
	i.SuppliersDescription = c.PostForm("suppliers_description")
	i.Qty, _ = strconv.Atoi(c.PostForm("qty"))
	i.Uom, _ = strconv.Atoi(c.PostForm("uom"))
	i.UnitPrice, _ = strconv.ParseFloat(c.PostForm("unit_price"), 64)
	i.TotalPrice, _ = strconv.ParseFloat(c.PostForm("total_price"), 64)
	i.SupProdID, _ = strconv.Atoi(c.PostForm("sup_prod_id"))
	i.ProjectComponentsTotal = c.PostForm("project_components_total")
	i.Location = c.PostForm("location")

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
