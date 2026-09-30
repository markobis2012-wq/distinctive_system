package handlers

import (
	"backend/internal/models"
	"log"
	"net/http"
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
	mrfItemID, err := strconv.Atoi(c.Param("mrf_item_id")) // Updated Param name
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid MRF Item ID"})
		return
	}
	quotes, err := models.GetQuotationsForComponent(mrfItemID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, quotes)
}

func HandleAddQuotation(c *gin.Context) {
	var q models.AddQuoteRequest
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
		CanvassID int `json:"canvass_id"`
		MRFItemID int `json:"mrf_item_id"` // Updated payload mapping
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AwardQuotation(body.CanvassID, body.MRFItemID); err != nil {
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
	items, err := models.GetAwardedItemsForPO()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, items)
}

func HandleGeneratePO(c *gin.Context) {
	var req models.GeneratePORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.GeneratePO(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "PO successfully generated!"})
}

func HandleCancelAward(c *gin.Context) {
	var body struct {
		MRFItemID int `json:"mrf_item_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.CancelAward(body.MRFItemID); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Award cancelled successfully!"})
}

func HandleDeleteCompany(c *gin.Context) {
	idParam := c.Param("id")
	companyID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
		return
	}

	if err := models.DeleteCompany(companyID); err != nil {
		log.Printf("==> [DB ERROR] Failed to delete company %d: %v\n", companyID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete company"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Company deleted successfully"})
}
