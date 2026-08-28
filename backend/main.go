package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwtSecret = []byte("your-super-secret-key")

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type User struct {
	LoginID    int    `json:"login_id"`
	Username   string `json:"username"`
	Password   string `json:"-"`
	UserTypeID int    `json:"user_type_id"`
	IsActive   int    `json:"is_active"`
}

type Company struct {
	CompanyID   int    `json:"company_id"`
	CompanyName string `json:"company_name"`
	FullAddress string `json:"full_address"`
	IslandGroup string `json:"island_group"`
	Region      string `json:"region"`
	Province    string `json:"province"`
	City        string `json:"city"`
	Zipcode     int    `json:"zipcode"`
	CompanyType string `json:"company_type"`
	WebsiteURL  string `json:"website_url"`
}

func main() {
	var err error
	// Point to the new database name
	dsn := "root:P@ssw0rd2026@tcp(127.0.0.1:3306)/distinctive_new_db"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.POST("/api/login", handleLogin)
	r.GET("/api/companies", handleGetCompanies)

	log.Println("Go API Server running on port 8081...")
	r.Run(":8081")

}

func handleLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var user User
	query := "SELECT login_id, username, password, user_type_id, is_active FROM tbl_login WHERE username = ? LIMIT 1"
	err := db.QueryRow(query, req.Username).Scan(&user.LoginID, &user.Username, &user.Password, &user.UserTypeID, &user.IsActive)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if user.IsActive != 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account is inactive"})
		return
	}

	// Bcrypt verification for encrypted passwords
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":          user.LoginID,
		"username":     user.Username,
		"user_type_id": user.UserTypeID,
		"exp":          time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":        tokenString,
		"user_type_id": user.UserTypeID,
		"username":     user.Username,
	})
}

func handleGetCompanies(c *gin.Context) {
	query := `
        SELECT 
            c.company_id, 
            COALESCE(c.company_name, 'Unknown') as company_name, 
            c.full_address,
            COALESCE(ig.island_group_name, 'N/A') as island_group, 
            COALESCE(r.region_name, 'N/A') as region, 
            COALESCE(p.province_name, 'N/A') as province, 
            COALESCE(ct.city_name, 'N/A') as city,
            c.zipcode, 
            c.company_type, 
            c.website_url
        FROM tbl_company c
        LEFT JOIN island_group ig ON c.island_group_id = ig.island_group_id
        LEFT JOIN tbl_regions r ON c.region_id = r.region_id
        LEFT JOIN tbl_province p ON c.province_id = p.province_id
        LEFT JOIN tbl_city ct ON c.city_id = ct.city_id
        WHERE c.is_active = 1
    `

	rows, err := db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch companies"})
		return
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		var comp Company
		if err := rows.Scan(&comp.CompanyID, &comp.CompanyName, &comp.FullAddress, &comp.IslandGroup, &comp.Region, &comp.Province, &comp.City, &comp.Zipcode, &comp.CompanyType, &comp.WebsiteURL); err != nil {
			continue
		}
		companies = append(companies, comp)
	}

	// If table is empty, return empty array instead of null
	if companies == nil {
		companies = []Company{}
	}

	c.JSON(http.StatusOK, companies)
}
