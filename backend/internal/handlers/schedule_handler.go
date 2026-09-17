package handlers

import (
	"backend/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetSchedule(c *gin.Context) {
	startDate := c.Query("start")
	endDate := c.Query("end")
	if startDate == "" || endDate == "" {
		c.JSON(400, gin.H{"error": "Dates required"})
		return
	}

	schedule, err := models.GetSchedule(startDate, endDate)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, schedule)
}

func HandleCreateBooking(c *gin.Context) {
	var req models.ScheduleBooking
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid payload"})
		return
	}
	if err := models.CreateBooking(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Booking created"})
}

func HandleGetBookingDetails(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	items, crew, err := models.GetBookingDetails(id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{
		"items": items,
		"crew":  crew,
	})
}

func HandleCreateGroup(c *gin.Context) {
	var req models.GroupPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid payload"})
		return
	}
	if err := models.CreateGroup(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Group created"})
}

func HandleDeleteBooking(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	models.DeleteBooking(id)
	c.JSON(200, gin.H{"message": "Booking deleted"})
}

func HandleMoveBooking(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req models.MoveBookingPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid payload"})
		return
	}

	if err := models.MoveBooking(id, req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Booking moved successfully"})
}

func HandleUpdateBooking(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.ScheduleBooking
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid payload"})
		return
	}
	req.BookingID = id
	if err := models.UpdateBooking(req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Booking updated"})
}
