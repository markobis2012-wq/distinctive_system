package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "Password123!"
	// Generate a bcrypt hash with a cost of 12
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), 12)

	fmt.Println("Copy this hash into HeidiSQL:")
	fmt.Println(string(hash))
}
