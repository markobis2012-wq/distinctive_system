package handlers

import (
	"backend/internal/models"
	"log"      // <-- Add this
	"net/http" // <-- Add this
	"strconv"

	"github.com/gin-gonic/gin"
)

func HandleGetCompanies(c *gin.Context) {
	// Ask the model for the data
	companies, err := models.GetAllCompanies()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch companies"})
		return
	}

	// Return the JSON response
	c.JSON(http.StatusOK, companies)
}

func HandleCreateCompany(c *gin.Context) {
	var req models.NewCompany
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input format"})
		return
	}

	// Capture the new ID
	newID, err := models.CreateCompany(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create company"})
		return
	}

	// Return the new ID to Next.js
	c.JSON(http.StatusOK, gin.H{
		"message":    "Company created successfully",
		"company_id": newID, // <-- NEW
	})
}

func HandleGetCompanyByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
		return
	}

	company, err := models.GetCompanyByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	c.JSON(http.StatusOK, company)
}

func HandleGetContactPersons(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	contacts, err := models.GetContactPersons(companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contacts"})
		return
	}
	c.JSON(http.StatusOK, contacts)
}

func HandleAddContactPerson(c *gin.Context) {
	companyID, _ := strconv.Atoi(c.Param("id"))
	var req models.CompanyContactPerson
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.CompanyID = companyID
	if err := models.AddContactPerson(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add contact"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func HandleUpdateContactPerson(c *gin.Context) {
	cpID, _ := strconv.Atoi(c.Param("cp_id"))
	var req models.CompanyContactPerson
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.ContactPersonID = cpID
	if err := models.UpdateContactPerson(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update contact"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// Delete Contact Person
func HandleDeleteContactPerson(c *gin.Context) {
	// Safely convert the string ID from the URL into an integer
	cpID, err := strconv.Atoi(c.Param("cp_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
		return
	}

	// Call the new Model function
	if err := models.DeleteContactPerson(cpID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contact person"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
}

// In handlers/company.go (or wherever HandleUpdateCompany is)
func HandleUpdateCompany(c *gin.Context) {
	idParam := c.Param("id")
	companyID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID"})
		return
	}

	var req models.CompanyUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input format: " + err.Error()})
		return
	}

	// Call the model function to update the database
	if err := models.UpdateCompany(companyID, req); err != nil {
		// THIS LOG WILL SHOW IN YOUR GO TERMINAL
		log.Printf("==> [DB ERROR] Failed to update company %d: %v\n", companyID, err)

		// THIS WILL SEND THE ERROR TO YOUR BROWSER NETWORK TAB
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Company updated successfully"})
}
