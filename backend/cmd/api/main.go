package main

import (
	"backend/internal/config"
	"backend/internal/routes"
	"log"
)

func main() {
	// 1. Initialize Database Connection
	config.ConnectDatabase()

	// 2. Setup the Router
	r := routes.SetupRouter()

	// 3. Start the Server
	log.Println("Go API Server running on port 8081...")
	r.Run(":8081")
}
