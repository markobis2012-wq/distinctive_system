package handlers

import (
	"backend/internal/models"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Formats HTML datetime-local (T) to MySQL format (space)
func formatDateTime(dt string) string {
	return strings.Replace(dt, "T", " ", 1)
}

func HandleGetBiddings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	companyID, _ := strconv.Atoi(c.DefaultQuery("company", "0"))
	islandID, _ := strconv.Atoi(c.DefaultQuery("island", "0"))
	regionID, _ := strconv.Atoi(c.DefaultQuery("region", "0"))
	provID, _ := strconv.Atoi(c.DefaultQuery("province", "0"))
	cityID, _ := strconv.Atoi(c.DefaultQuery("city", "0"))

	filters := models.BiddingFilters{
		Search:      c.DefaultQuery("search", ""),
		Page:        page,
		Limit:       limit,
		SortField:   c.DefaultQuery("sortField", ""),
		SortOrder:   c.DefaultQuery("sortOrder", "desc"),
		CompanyID:   companyID,
		IslandID:    islandID,
		RegionID:    regionID,
		ProvinceID:  provID,
		CityID:      cityID,
		PreBidStart: c.DefaultQuery("preBidStart", ""),
		PreBidEnd:   c.DefaultQuery("preBidEnd", ""),
		BidStart:    c.DefaultQuery("bidStart", ""),
		BidEnd:      c.DefaultQuery("bidEnd", ""),
	}

	biddings, total, upcomingBids, upcomingPreBids, err := models.GetBiddings(filters)
	if err != nil {
		fmt.Println("DB ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch biddings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":              biddings,
		"total":             total,
		"upcoming_bids":     upcomingBids,
		"upcoming_pre_bids": upcomingPreBids,
	})
}

func HandleAddBidding(c *gin.Context) {
	var req models.Bidding
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	req.LastUpdateTime = formatDateTime(req.LastUpdateTime)
	req.ClosingDateTime = formatDateTime(req.ClosingDateTime)
	req.PreBidDatetime = formatDateTime(req.PreBidDatetime)

	if err := models.AddBidding(req); err != nil {
		fmt.Println("DB ERROR:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add bidding"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func HandleUpdateBidding(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.Bidding
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.BiddingID = id
	req.LastUpdateTime = formatDateTime(req.LastUpdateTime)
	req.ClosingDateTime = formatDateTime(req.ClosingDateTime)
	req.PreBidDatetime = formatDateTime(req.PreBidDatetime)

	if err := models.UpdateBidding(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bidding"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func HandleDeleteBidding(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteBidding(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func HandleGetBiddingByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	bidding, err := models.GetBiddingByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bidding not found"})
		return
	}
	c.JSON(http.StatusOK, bidding)
}
