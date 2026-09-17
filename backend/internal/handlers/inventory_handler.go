package handlers

import (
	"backend/internal/models"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetInventory(c *gin.Context) {
	items, err := models.GetAllInventory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func CreateInventoryItem(c *gin.Context) {
	dbosCode := c.PostForm("dbos_code")
	inventoryName := c.PostForm("inventory_name")
	desc := c.PostForm("description")

	var imagePath string
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savePath := filepath.Join("uploads", filename)
		os.MkdirAll("uploads", os.ModePerm)
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			imagePath = "/" + savePath
		}
	}

	inv := models.Inventory{
		DBOSCode:      dbosCode,
		InventoryName: inventoryName,
		Description:   desc,
		UOMID:         1,
		ImagePath:     imagePath,
	}

	id, err := models.CreateInventory(inv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create item."})
		return
	}
	inv.InventoryID = id
	c.JSON(http.StatusOK, inv)
}

func UpdateInventoryItem(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	isActive, _ := strconv.ParseBool(c.PostForm("is_active"))

	var imagePath string
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savePath := filepath.Join("uploads", filename)
		c.SaveUploadedFile(file, savePath)
		imagePath = "/" + savePath
	}

	inv := models.Inventory{
		InventoryID:   id,
		InventoryName: c.PostForm("inventory_name"),
		Description:   c.PostForm("description"),
		ImagePath:     imagePath,
		IsActive:      isActive,
	}

	if err := models.UpdateInventory(inv); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Updated successfully"})
}

func AddStock(c *gin.Context) {
	inventoryID, _ := strconv.Atoi(c.Param("id"))
	var req models.AddStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	if err := models.AddInventoryStock(inventoryID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Stock added"})
}

func GetStockHistory(c *gin.Context) {
	inventoryID, _ := strconv.Atoi(c.Param("id"))
	history, err := models.GetInventoryAddedHistory(inventoryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func UpdateAddedStock(c *gin.Context) {
	addID, _ := strconv.Atoi(c.Param("added_id"))

	var req struct {
		QtyAdded float64 `json:"qty_added"`
		Remarks  string  `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	if err := models.UpdateInventoryAddedStock(addID, req.QtyAdded, req.Remarks); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Stock record updated"})
}

// --- PHASE 5: RETURN TO STOCK (RTS) ---
func ReturnToStock(c *gin.Context) {
	var req models.RTSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := models.ProcessReturnToStock(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inventory successfully returned to stock!"})
}
