package handlers

import (
	"backend/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetProjects(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	clientID, _ := strconv.Atoi(c.DefaultQuery("client_id", "0"))
	deptID, _ := strconv.Atoi(c.DefaultQuery("department_id", "0"))

	filters := models.ProjectFilters{
		Search:       c.DefaultQuery("search", ""),
		Page:         page,
		Limit:        limit,
		SortField:    c.DefaultQuery("sortField", "project_number"),
		SortOrder:    c.DefaultQuery("sortOrder", "desc"),
		ClientID:     clientID,
		DepartmentID: deptID,
		Status:       c.DefaultQuery("status", ""),
		Category:     c.DefaultQuery("category", ""),
	}

	projects, total, err := models.GetProjects(filters)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch projects"})
		return
	}
	c.JSON(200, gin.H{"data": projects, "total": total})
}

func HandleAddProject(c *gin.Context) {
	var req models.Project
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if err := models.AddProject(req); err != nil {
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}
	c.JSON(200, gin.H{"message": "Project added"})
}

func HandleUpdateProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.Project
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	req.ProjectID = id
	if err := models.UpdateProject(req); err != nil {
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}
	c.JSON(200, gin.H{"message": "Project updated"})
}

func HandleDeleteProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	models.DeleteProject(id)
	c.JSON(200, gin.H{"message": "Project deleted"})
}

// Aux Handlers
func HandleGetDepartments(c *gin.Context) {
	list, _ := models.GetDepartments()
	c.JSON(200, list)
}
func HandleGetProjectCategories(c *gin.Context) {
	list, _ := models.GetProjectCategories()
	c.JSON(200, list)
}
