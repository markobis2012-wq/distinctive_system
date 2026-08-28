package config

import (
	"database/sql"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDatabase() {
	var err error
	dsn := "root:P@ssw0rd2026@tcp(127.0.0.1:3306)/distinctive_new_db"

	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}
}
