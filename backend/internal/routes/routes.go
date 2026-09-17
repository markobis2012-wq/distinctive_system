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
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"},
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

	// Attachment Routes
	r.GET("/api/attachment-types", handlers.HandleGetAttachmentFileTypes)
	r.GET("/api/projects/:id/attachments", handlers.HandleGetProjectAttachments)
	r.POST("/api/projects/:id/attachments", handlers.HandleUploadProjectAttachment)
	r.DELETE("/api/projects/attachments/:attach_id", handlers.HandleDeleteProjectAttachment)

	// Delivery Routes
	r.GET("/api/deliveries", handlers.HandleGetDeliveries)
	r.POST("/api/deliveries", handlers.HandleCreateDelivery)
	r.DELETE("/api/deliveries/:id", handlers.HandleDeleteDelivery)

	// Delivery Item Routes
	r.GET("/api/deliveries/:id/items", handlers.HandleGetDeliveryItems)
	r.GET("/api/projects/:id/available-items", handlers.HandleGetAvailableProjectItems)
	r.POST("/api/deliveries/items", handlers.HandleAddDeliveryItem)
	r.PUT("/api/deliveries/items/:item_id", handlers.HandleUpdateDeliveryItem)
	r.DELETE("/api/deliveries/items/:item_id", handlers.HandleDeleteDeliveryItem)
	r.GET("/api/deliveries/:id", handlers.HandleGetDeliveryByID)

	// Loading List Routes
	r.GET("/api/loading-lists/:id/items", handlers.HandleGetLoadingListItems)
	r.POST("/api/loading-lists/items", handlers.HandleAddLoadingListItem)
	r.DELETE("/api/loading-lists/items/:item_id", handlers.HandleDeleteLoadingListItem)

	// Schedule & Resources Routes
	r.GET("/api/schedule", handlers.HandleGetSchedule)
	r.POST("/api/schedule/bookings", handlers.HandleCreateBooking)
	r.POST("/api/schedule/groups", handlers.HandleCreateGroup)
	r.DELETE("/api/schedule/bookings/:id", handlers.HandleDeleteBooking)
	r.PUT("/api/schedule/bookings/:id/move", handlers.HandleMoveBooking)
	r.GET("/api/schedule/bookings/:id/details", handlers.HandleGetBookingDetails) // <-- NEW FSM ROUTE

	// Add these with your other routes
	r.GET("/api/staff", handlers.GetStaff)
	r.POST("/api/staff", handlers.CreateStaff)
	r.PUT("/api/staff/:id", handlers.UpdateStaff)
	r.DELETE("/api/staff/:id", handlers.DeleteStaff)
	r.POST("/api/staff/upload-avatar", handlers.HandleUploadStaffAvatar)

	// General attachments page:
	r.GET("/api/attachments", handlers.HandleGetGeneralAttachments)
	r.POST("/api/attachments", handlers.HandleCreateGeneralAttachment)
	r.PUT("/api/attachments/:id", handlers.HandleUpdateGeneralAttachment)
	r.DELETE("/api/attachments/:id", handlers.HandleDeleteGeneralAttachment)
	r.POST("/api/attachments/upload", handlers.HandleUploadGeneralFile)
	r.GET("/api/biddings/ai-search", handlers.HandleAISearchPhilGEPS)

	// Inventory Routes
	r.GET("/api/inventory", handlers.GetInventory)
	r.POST("/api/inventory", handlers.CreateInventoryItem)
	r.PUT("/api/inventory/:id", handlers.UpdateInventoryItem)
	r.POST("/api/inventory/:id/add-stock", handlers.AddStock)
	r.GET("/api/inventory/:id/history", handlers.GetStockHistory)
	r.PUT("/api/inventory/history/:added_id", handlers.UpdateAddedStock)
	r.POST("/api/inventory/return", handlers.ReturnToStock)

	// MRF Warehouse Routes
	r.GET("/api/warehouse/mrfs/pending", handlers.GetPendingMRFs)
	r.GET("/api/warehouse/mrfs/:id/items", handlers.GetMRFItemsForFulfillment)
	r.POST("/api/warehouse/mrfs/fulfill", handlers.FulfillMRF)

	r.GET("/api/projects/:id/mrfs", handlers.GetProjectMRFs)
	r.POST("/api/projects/:id/mrfs", handlers.CreateProjectMRF)

	r.GET("/api/warehouse/mrfs/history", handlers.GetMRFHistory)
	r.GET("/api/projects/:id/components", handlers.HandleGetAllProjectComponents)

	// Canvassing & RFQ Routes
	r.GET("/api/canvass/items", handlers.HandleGetItemsForCanvassing)
	r.GET("/api/canvass/component/:component_id/quotes", handlers.HandleGetQuotations)
	r.POST("/api/canvass/quotes", handlers.HandleAddQuotation)
	r.POST("/api/canvass/award", handlers.HandleAwardQuotation)
	r.PUT("/api/canvass/quotes/:canvass_id", handlers.HandleUpdateQuotation)
	r.POST("/api/canvass/quotes/bulk", handlers.HandleAddBulkQuotations)
	r.GET("/api/po/awarded-items", handlers.HandleGetAwardedComponents)
	r.POST("/api/po/generate", handlers.HandleGeneratePO)
	r.POST("/api/canvass/cancel-award", handlers.HandleCancelAward)
	r.PUT("/api/schedule/bookings/:id", handlers.HandleUpdateBooking)

	r.GET("/api/production/pipeline", handlers.HandleGetProductionPipeline)
	r.PUT("/api/production/items/:id/advance", handlers.HandleAdvanceProduction)

	r.POST("/api/delivery/generate-from-booking/:id", handlers.HandleGenerateDeliveryFromBooking)

	r.PUT("/api/deliveries/:id/status", handlers.HandleUpdateDeliveryStatus)

	r.GET("/api/deliveries/:id/client-report", handlers.HandleGetClientHandoverReport)

	r.POST("/api/deliveries/:id/complete", handlers.HandleCompleteDelivery)

	r.Static("/uploads", "./uploads")
	r.POST("/api/login", handlers.HandleLogin)

	return r
}
