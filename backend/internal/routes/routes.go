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
	r.Static("/bidding_attachments", "./bidding_attachments")

	// Bidding Routes
	r.GET("/api/biddings", handlers.HandleGetBiddings)
	r.GET("/api/biddings/:id", handlers.HandleGetBiddingByID)
	r.POST("/api/biddings", handlers.HandleAddBidding)
	r.PUT("/api/biddings/:id", handlers.HandleUpdateBidding)
	r.DELETE("/api/biddings/:id", handlers.HandleDeleteBidding)

	// Bidding Attachment Routes
	r.GET("/api/bidding-attachment-types", handlers.HandleGetBiddingAttachmentTypes)
	r.GET("/api/biddings/:id/attachments", handlers.HandleGetBiddingAttachments)
	r.POST("/api/biddings/:id/attachments", handlers.HandleAddBiddingAttachment)
	r.DELETE("/api/biddings/attachments/:att_id", handlers.HandleDeleteBiddingAttachment)

	// Project Routes
	r.GET("/api/projects", handlers.HandleGetProjects)
	r.GET("/api/projects/:id", handlers.HandleGetProjectByID)
	r.POST("/api/projects", handlers.HandleAddProject)
	r.PUT("/api/projects/:id", handlers.HandleUpdateProject)
	r.DELETE("/api/projects/:id", handlers.HandleDeleteProject)
	r.Static("/project_items", "./project_items")

	// Aux Routes for Projects
	r.GET("/api/departments", handlers.HandleGetDepartments)
	r.GET("/api/project-categories", handlers.HandleGetProjectCategories)

	// Project Items Routes
	r.GET("/api/projects/:id/items", handlers.HandleGetProjectItems)
	r.POST("/api/projects/:id/items", handlers.HandleAddProjectItem)
	r.PUT("/api/projects/:id/items/:item_id", handlers.HandleUpdateProjectItem)
	r.DELETE("/api/projects/items/:item_id", handlers.HandleDeleteProjectItem)

	// Component Routes
	r.GET("/api/suppliers/:supplier_id/products", handlers.HandleGetSupplierProductsBySupplier)
	r.GET("/api/project-items/:item_id/components", handlers.HandleGetItemComponents)
	r.POST("/api/project-items/components", handlers.HandleAddItemComponent)
	r.DELETE("/api/project-items/components/:comp_id", handlers.HandleDeleteItemComponent)

	r.POST("/api/login", handlers.HandleLogin)

	// (Add your  here once you migrate the auth handler)

	return r
}
