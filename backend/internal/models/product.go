package models

import (
	"backend/internal/config"
)

type SupplierProduct struct {
	ProductID   int     `json:"supplier_product_id"`
	CompanyID   int     `json:"company_id"`
	SupCode     string  `json:"sup_product_code"`
	DbosCode    string  `json:"dbos_code"`
	ProductName string  `json:"supplier_product_name"`
	Description string  `json:"prod_description"`
	Price       string  `json:"products_price"`
	LandPrice   float64 `json:"land_price"`
	Image       string  `json:"product_image"`
}

func GetProductsByCompany(companyID int) ([]SupplierProduct, error) {
	query := `SELECT supplier_product_id, company_id, sup_product_code, dbos_code, COALESCE(supplier_product_name, ''), prod_description, products_price, land_price, product_image 
			  FROM tbl_supplier_products WHERE company_id = ? AND is_active = 1`
	rows, err := config.DB.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []SupplierProduct
	for rows.Next() {
		var p SupplierProduct
		if err := rows.Scan(&p.ProductID, &p.CompanyID, &p.SupCode, &p.DbosCode, &p.ProductName, &p.Description, &p.Price, &p.LandPrice, &p.Image); err == nil {
			products = append(products, p)
		}
	}
	if products == nil {
		products = []SupplierProduct{}
	}
	return products, nil
}

func AddProduct(p SupplierProduct) error {
	query := `INSERT INTO tbl_supplier_products (company_id, sup_product_code, dbos_code, supplier_product_name, prod_description, products_price, land_price, product_image, is_active) 
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
	_, err := config.DB.Exec(query, p.CompanyID, p.SupCode, p.DbosCode, p.ProductName, p.Description, p.Price, p.LandPrice, p.Image)
	return err
}

func UpdateProduct(p SupplierProduct) error {
	// If no new image was uploaded, we don't overwrite the existing one
	if p.Image != "" {
		query := `UPDATE tbl_supplier_products SET sup_product_code=?, dbos_code=?, supplier_product_name=?, prod_description=?, products_price=?, land_price=?, product_image=? WHERE supplier_product_id=?`
		_, err := config.DB.Exec(query, p.SupCode, p.DbosCode, p.ProductName, p.Description, p.Price, p.LandPrice, p.Image, p.ProductID)
		return err
	}

	query := `UPDATE tbl_supplier_products SET sup_product_code=?, dbos_code=?, supplier_product_name=?, prod_description=?, products_price=?, land_price=? WHERE supplier_product_id=?`
	_, err := config.DB.Exec(query, p.SupCode, p.DbosCode, p.ProductName, p.Description, p.Price, p.LandPrice, p.ProductID)
	return err
}

func DeleteProduct(productID int) error {
	_, err := config.DB.Exec("UPDATE tbl_supplier_products SET is_active = 0 WHERE supplier_product_id = ?", productID)
	return err
}

func GetProjectByID(id int) (Project, error) {
	query := `
		SELECT 
			p.projects_id, COALESCE(p.dbos_department_id, 0), COALESCE(p.projects_category, ''), p.project_year, p.project_counter,
			COALESCE(p.project_number, ''), COALESCE(CAST(p.project_date_created AS CHAR), ''), COALESCE(CAST(p.project_date_start_date AS CHAR), ''),
			COALESCE(CAST(p.project_date_end_date AS CHAR), ''), COALESCE(p.contract_amount, 0), COALESCE(p.project_name, ''),
			COALESCE(p.bidding_id, 0), COALESCE(p.client_id, 0), COALESCE(p.project_status, 'Today'), p.is_active,
			COALESCE(c.company_name, 'Unknown'), COALESCE(d.department, 'N/A'), COALESCE(b.reference_no, 'N/A')
		FROM projects p
		LEFT JOIN tbl_company c ON p.client_id = c.company_id
		LEFT JOIN tbl_department d ON p.dbos_department_id = d.department_id
		LEFT JOIN tbl_bidding b ON p.bidding_id = b.bidding_id
		WHERE p.projects_id = ? AND p.is_active = 1`

	var p Project
	err := config.DB.QueryRow(query, id).Scan(
		&p.ProjectID, &p.DbosDepartmentID, &p.ProjectsCategory, &p.ProjectYear, &p.ProjectCounter, &p.ProjectNumber,
		&p.ProjectDateCreated, &p.ProjectStartDate, &p.ProjectEndDate, &p.ContractAmount, &p.ProjectName,
		&p.BiddingID, &p.ClientID, &p.ProjectStatus, &p.IsActive,
		&p.ClientName, &p.DepartmentName, &p.BiddingReference,
	)
	return p, err
}
