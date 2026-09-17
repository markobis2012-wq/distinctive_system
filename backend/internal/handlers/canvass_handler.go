package handlers

import (
	"backend/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetItemsForCanvassing(c *gin.Context) {
	items, err := models.GetItemsForCanvassing()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, items)
}

func HandleGetQuotations(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("component_id"))
	quotes, err := models.GetQuotationsForComponent(compID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, quotes)
}

func HandleAddQuotation(c *gin.Context) {
	var q models.Quotation
	if err := c.ShouldBindJSON(&q); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AddQuotation(q); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Quotation recorded"})
}

func HandleAwardQuotation(c *gin.Context) {
	var body struct {
		CanvassID   int `json:"canvass_id"`
		ComponentID int `json:"project_item_component_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AwardQuotation(body.CanvassID, body.ComponentID); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Supplier awarded successfully!"})
}

func HandleUpdateQuotation(c *gin.Context) {
	canvassID, _ := strconv.Atoi(c.Param("canvass_id"))

	var body struct {
		QuotedUnitPrice    float64 `json:"quoted_unit_price"`
		QuotedLandedPrice  float64 `json:"quoted_landed_price"`
		QuotedSellingPrice float64 `json:"quoted_selling_price"`
		Remarks            string  `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	if err := models.UpdateQuotationPrices(canvassID, body.QuotedUnitPrice, body.QuotedLandedPrice, body.QuotedSellingPrice, body.Remarks); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Prices successfully updated!"})
}

func HandleAddBulkQuotations(c *gin.Context) {
	var req models.BulkRFQRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	if err := models.AddBulkQuotations(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Bulk RFQ successfully created!"})
}

func HandleGetAwardedComponents(c *gin.Context) {
	items, err := models.GetAwardedComponents()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, items)
}

func HandleGeneratePO(c *gin.Context) {
	var req struct {
		PONumber     string `json:"po_number"`
		ComponentIDs []int  `json:"component_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.GeneratePO(req.PONumber, req.ComponentIDs); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "PO successfully generated!"})
}

func HandleCancelAward(c *gin.Context) {
	var body struct {
		ComponentID int `json:"project_item_component_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.CancelAward(body.ComponentID); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Award cancelled successfully!"})
}
