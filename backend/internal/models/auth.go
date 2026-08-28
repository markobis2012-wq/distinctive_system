package models

import (
	"backend/internal/config"
)

type User struct {
	LoginID    int    `json:"login_id"`
	Username   string `json:"username"`
	Password   string `json:"-"` // Hidden from JSON response
	UserTypeID int    `json:"user_type_id"`
	IsActive   int    `json:"is_active"`
}

func GetUserByUsername(username string) (User, error) {
	var user User

	query := "SELECT login_id, username, password, user_type_id, is_active FROM tbl_login WHERE username = ? LIMIT 1"
	err := config.DB.QueryRow(query, username).Scan(&user.LoginID, &user.Username, &user.Password, &user.UserTypeID, &user.IsActive)

	return user, err
}
