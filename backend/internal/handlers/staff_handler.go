package handlers

import (
	"backend/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetDepartments(c *gin.Context) {
	deps, err := models.GetAllDepartments()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, deps)
}

func GetStaff(c *gin.Context) {
	staff, err := models.GetAllStaff()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, staff)
}

func CreateStaff(c *gin.Context) {
	var s models.Staff
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := models.CreateStaff(s); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Staff created"})
}

func UpdateStaff(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var s models.Staff
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := models.UpdateStaff(id, s); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Staff updated"})
}

func DeleteStaff(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := models.DeleteStaff(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Staff deleted"})
}

// import ( "path/filepath" ; "time" ; "fmt" ; "os" )

func HandleUploadStaffAvatar(c *gin.Context) {
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}

	// Create the directory if it doesn't exist
	uploadDir := "./uploads/staff_avatars"
	os.MkdirAll(uploadDir, os.ModePerm)

	// Generate a unique filename using timestamp
	ext := filepath.Ext(file.Filename)
	newFileName := fmt.Sprintf("avatar_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, newFileName)

	// Save the file to the server
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save image"})
		return
	}

	// Return the relative path to be stored in the database
	dbPath := "/uploads/staff_avatars/" + newFileName
	c.JSON(200, gin.H{"avatar_url": dbPath})
}
