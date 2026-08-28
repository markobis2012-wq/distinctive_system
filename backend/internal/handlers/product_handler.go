package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetProducts(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	products, err := models.GetProductsByCompany(companyID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch products"})
		return
	}
	c.JSON(200, products)
}

// Helper to parse multipart form and save image
func parseProductForm(c *gin.Context, companyID int) (models.SupplierProduct, error) {
	var p models.SupplierProduct
	p.CompanyID = companyID
	p.SupCode = c.PostForm("sup_product_code")
	p.DbosCode = c.PostForm("dbos_code")
	p.ProductName = c.PostForm("supplier_product_name")
	p.Description = c.PostForm("prod_description")
	p.Price = c.PostForm("products_price")
	p.LandPrice, _ = strconv.ParseFloat(c.PostForm("land_price"), 64)

	// Handle file upload
	file, err := c.FormFile("product_image")
	if err == nil && file != nil {
		// Create directory: ./supplier_product/[companyID]/
		dir := fmt.Sprintf("./supplier_product/%d", companyID)
		os.MkdirAll(dir, 0755) // Creates folder if it doesn't exist

		// Generate safe path and save
		fileName := filepath.Base(file.Filename)
		savePath := filepath.Join(dir, fileName)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			// Save the URL path for the database
			p.Image = fmt.Sprintf("/supplier_product/%d/%s", companyID, fileName)
		}
	}
	return p, nil
}

func HandleAddProduct(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	p, _ := parseProductForm(c, companyID)

	if err := models.AddProduct(p); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save product"})
		return
	}
	c.JSON(200, gin.H{"message": "Product saved"})
}

func HandleUpdateProduct(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	prodID, _ := strconv.Atoi(c.Param("prod_id"))
	p, _ := parseProductForm(c, companyID)
	p.ProductID = prodID

	if err := models.UpdateProduct(p); err != nil {
		c.JSON(500, gin.H{"error": "Failed to update product"})
		return
	}
	c.JSON(200, gin.H{"message": "Product updated"})
}

func HandleDeleteProduct(c *gin.Context) {
	prodID, _ := strconv.Atoi(c.Param("prod_id"))
	models.DeleteProduct(prodID)
	c.JSON(200, gin.H{"message": "Product deleted"})
}
