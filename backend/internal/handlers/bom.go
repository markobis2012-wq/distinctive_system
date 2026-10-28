package handlers

import (
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

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
	debugJSON, _ := json.MarshalIndent(parts, "", "  ")
	log.Printf("🛠️ BACKEND SENDING PARTS: \n%s\n", string(debugJSON))
	c.JSON(http.StatusOK, parts)
}

func HandleAddProjectPart(c *gin.Context) {
	// 1. Parse Multipart Form (10 MB limit)
	err := c.Request.ParseMultipartForm(10 << 20)
	if err != nil {
		log.Printf("❌ API Error parsing multipart form: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	// 2. Extract Text Fields
	projectItemsID, _ := strconv.Atoi(c.PostForm("project_items_id"))
	inventoryID, _ := strconv.Atoi(c.PostForm("inventory_id"))
	partName := c.PostForm("part_name")
	description := c.PostForm("description")
	qtyPerItem, _ := strconv.ParseFloat(c.PostForm("qty_per_item"), 64)
	prodQty, _ := strconv.ParseFloat(c.PostForm("prod_qty"), 64)
	uomID, _ := strconv.Atoi(c.PostForm("uom_id"))

	// 3. Handle File Upload (Optional field)
	var imagePath string
	file, err := c.FormFile("image_path")
	if err == nil && file != nil {
		// Create directory if it doesn't exist
		// Note: we place it in your existing static "project_items" folder
		uploadDir := "./project_items/parts"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			log.Printf("❌ Failed to create upload directory: %v\n", err)
		} else {
			// Generate unique filename
			ext := filepath.Ext(file.Filename)
			filename := fmt.Sprintf("part_%d_%d%s", projectItemsID, time.Now().Unix(), ext)
			fullPath := filepath.Join(uploadDir, filename)

			// Save file
			if err := c.SaveUploadedFile(file, fullPath); err != nil {
				log.Printf("❌ Failed to save part image: %v\n", err)
			} else {
				imagePath = "project_items/parts/" + filename
			}
		}
	}

	// 4. Construct Model Payload
	req := models.ProjectItemComponent{
		ProjectItemsID: projectItemsID,
		InventoryID:    inventoryID,
		PartName:       partName,
		Description:    description,
		QtyPerItem:     qtyPerItem,
		ProdQty:        prodQty,
		UomID:          uomID,
		ImagePath:      imagePath,
	}

	// 5. Save to Database
	if err := models.AddProjectItemComponent(req); err != nil {
		log.Printf("❌ API Error saving component to DB: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Part/Component added successfully"})
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
