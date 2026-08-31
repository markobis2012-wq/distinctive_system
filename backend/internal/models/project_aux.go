package models

import "backend/internal/config"

type Department struct {
	ID   int    `json:"department_id"`
	Name string `json:"department"`
}

type ProjectCategory struct {
	ID       int    `json:"projects_category_id"`
	Category string `json:"category"`
}

func GetDepartments() ([]Department, error) {
	rows, err := config.DB.Query("SELECT department_id, department FROM tbl_department")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Department
	for rows.Next() {
		var item Department
		if err := rows.Scan(&item.ID, &item.Name); err == nil {
			list = append(list, item)
		}
	}
	return list, nil
}

func GetProjectCategories() ([]ProjectCategory, error) {
	rows, err := config.DB.Query("SELECT projects_category_id, category FROM tbl_projects_category")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ProjectCategory
	for rows.Next() {
		var item ProjectCategory
		if err := rows.Scan(&item.ID, &item.Category); err == nil {
			list = append(list, item)
		}
	}
	return list, nil
}
