package routes

import (
	"backend/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Setup CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"}, // <-- Added PUT and DELETE
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Define API Routes
	r.GET("/api/companies", handlers.HandleGetCompanies)
	r.POST("/api/companies", handlers.HandleCreateCompany)
	r.GET("/api/locations", handlers.HandleGetLocations)
	r.POST("/api/locations/region", handlers.HandleCreateRegion)
	r.POST("/api/locations/province", handlers.HandleCreateProvince)
	r.POST("/api/locations/city", handlers.HandleCreateCity)
	r.GET("/api/companies/:id", handlers.HandleGetCompanyByID)

	// Contact Person Routes
	r.GET("/api/companies/:id/contacts", handlers.HandleGetContactPersons)
	r.POST("/api/companies/:id/contacts", handlers.HandleAddContactPerson)
	r.PUT("/api/companies/contacts/:cp_id", handlers.HandleUpdateContactPerson)
	r.DELETE("/api/companies/contacts/:cp_id", handlers.HandleDeleteContactPerson)

	// Product Routes
	r.GET("/api/companies/:id/products", handlers.HandleGetProducts)
	r.POST("/api/companies/:id/products", handlers.HandleAddProduct)
	r.PUT("/api/companies/:id/products/:prod_id", handlers.HandleUpdateProduct)
	r.DELETE("/api/companies/products/:prod_id", handlers.HandleDeleteProduct)

	// Attachment Routes
	r.GET("/api/companies/:id/attachments", handlers.HandleGetAttachments)
	r.POST("/api/companies/:id/attachments", handlers.HandleAddAttachment)
	r.PUT("/api/companies/:id/attachments/:att_id", handlers.HandleUpdateAttachment)
	r.DELETE("/api/companies/attachments/:att_id", handlers.HandleDeleteAttachment)

	// Expose directories for images
	r.Static("/supplier_product", "./supplier_product")
	r.Static("/company_attachments", "./company_attachments")

	// Bidding Routes
	r.GET("/api/biddings", handlers.HandleGetBiddings)
	r.POST("/api/biddings", handlers.HandleAddBidding)
	r.PUT("/api/biddings/:id", handlers.HandleUpdateBidding)
	r.DELETE("/api/biddings/:id", handlers.HandleDeleteBidding)
	r.POST("/api/login", handlers.HandleLogin)

	// (Add your  here once you migrate the auth handler)

	return r
}
