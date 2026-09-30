package handlers

import (
	"backend/internal/models"
	"fmt"
	"net/http"
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

// Fetches products filtered by DBOS Code (Used by Purchasing Page)
func HandleGetSupplierProductsByDBOS(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("supplier_id"))
	dbosCode := c.Param("dbos_code")

	prods, err := models.GetProductsByCompanyAndDBOS(companyID, dbosCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, prods)
}

// Helper to parse multipart form and save image (Used by Company Management page)
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
		dir := fmt.Sprintf("./supplier_product/%d", companyID)
		os.MkdirAll(dir, 0755)

		fileName := filepath.Base(file.Filename)
		savePath := filepath.Join(dir, fileName)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			p.Image = fmt.Sprintf("/supplier_product/%d/%s", companyID, fileName)
		}
	}
	return p, nil
}

// Handle Add Product from Company Management (Multipart Form)
func HandleAddProduct(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	p, _ := parseProductForm(c, companyID)

	if _, err := models.AddProduct(p); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save product"})
		return
	}
	c.JSON(200, gin.H{"message": "Product saved"})
}

// Handle Add Product from Canvassing Board (Raw JSON)
func HandleCreateSupplierProductForCanvass(c *gin.Context) {
	var p models.SupplierProduct
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if p.Image == "" {
		p.Image = ""
	}
	if p.Description == "" {
		p.Description = ""
	}
	if p.Price == "" {
		p.Price = "0"
	}
	if p.SupCode == "" {
		p.SupCode = ""
	}

	id, err := models.AddProduct(p)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product mapped successfully!", "supplier_product_id": id})
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
