package handlers

import (
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAttributes(c *gin.Context) {
	attrs, err := models.GetAllAttributes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, attrs)
}

func CreateAttribute(c *gin.Context) {
	var attr models.Attribute
	if err := c.ShouldBindJSON(&attr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}
	if err := models.CreateAttribute(attr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Attribute created"})
}

func DeleteAttribute(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteAttribute(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Attribute deleted"})
}

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
	attributesJSON := c.PostForm("attributes")
	classificationsJSON := c.PostForm("classifications")

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
		IsActive:      true,
	}

	id, err := models.CreateInventory(inv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create item."})
		return
	}

	// Save Dynamic Attributes
	if attributesJSON != "" {
		var attrs []models.InvAttribute
		if err := json.Unmarshal([]byte(attributesJSON), &attrs); err == nil {
			models.SaveInventoryAttributes(id, attrs)
		}
	}

	// Save Dynamic Classifications
	if classificationsJSON != "" {
		var classIDs []int
		if err := json.Unmarshal([]byte(classificationsJSON), &classIDs); err == nil {
			models.SaveInventoryClassifications(id, classIDs)
		}
	}

	inv.InventoryID = id
	c.JSON(http.StatusOK, inv)
}

func UpdateInventoryItem(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	isActive, _ := strconv.ParseBool(c.PostForm("is_active"))
	attributesJSON := c.PostForm("attributes")
	classificationsJSON := c.PostForm("classifications")

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

	// Save Dynamic Attributes
	if attributesJSON != "" {
		var attrs []models.InvAttribute
		if err := json.Unmarshal([]byte(attributesJSON), &attrs); err == nil {
			models.SaveInventoryAttributes(id, attrs)
		}
	}

	// Save Dynamic Classifications
	if classificationsJSON != "" {
		var classIDs []int
		if err := json.Unmarshal([]byte(classificationsJSON), &classIDs); err == nil {
			models.SaveInventoryClassifications(id, classIDs)
		}
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
	c.JSON(http.StatusOK, gin.H{"message": "Stock added successfully"})
}

func GetStockHistory(c *gin.Context) {
	inventoryID, _ := strconv.Atoi(c.Param("id"))
	history, err := models.GetInventoryLedgerHistory(inventoryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func UpdateAddedStock(c *gin.Context) {
	ledgerID, _ := strconv.Atoi(c.Param("added_id"))

	var req struct {
		QtyChange float64 `json:"qty_change"`
		Remarks   string  `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	if err := models.UpdateInventoryLedgerStock(ledgerID, req.QtyChange, req.Remarks); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Ledger record updated successfully"})
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

func GetClassifications(c *gin.Context) {
	classes, err := models.GetAllClassifications()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, classes)
}

func CreateClassification(c *gin.Context) {
	var class models.Classification
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}
	id, err := models.CreateClassification(class)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	class.ClassificationID = id
	c.JSON(http.StatusOK, class)
}

func HandleGetItemLedger(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	ledger, err := models.GetInventoryLedgerHistory(id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, ledger)
}

func HandleGetItemSuppliers(c *gin.Context) {
	dbosCode := c.Param("dbos_code")
	suppliers, err := models.GetSuppliersForItem(dbosCode)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, suppliers)
}

func HandleGetItemMRFHistory(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	mrfs, err := models.GetItemMRFHistory(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mrfs)
}

func HandleGetInventorySuppliers(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	data, err := models.GetInventorySuppliers(id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func HandleGetCatalogOptions(c *gin.Context) {
	dbosCode := c.Param("dbos_code")
	data, err := models.GetCatalogOptionsForMapping(dbosCode)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, data)
}

func HandleAddInventorySupplier(c *gin.Context) {
	var req models.InventorySupplier
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AddInventorySupplier(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Supplier mapped successfully"})
}

func HandleDeleteInventorySupplier(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("mapping_id"))
	models.DeleteInventorySupplier(id)
	c.JSON(200, gin.H{"message": "Supplier removed"})
}

func HandleSetPreferredSupplier(c *gin.Context) {
	invID, _ := strconv.Atoi(c.Param("id"))
	mapID, _ := strconv.Atoi(c.Param("mapping_id"))
	models.SetPreferredSupplier(invID, mapID)
	c.JSON(200, gin.H{"message": "Preferred supplier updated"})
}
