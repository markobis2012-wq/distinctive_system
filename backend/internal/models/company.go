package models

import (
	"backend/internal/config"
	"database/sql"
)

type Contact struct {
	Type    string `json:"type"`
	Details string `json:"details"`
}

// NEW: Struct for the primary contact person
type ContactPerson struct {
	Name       string `json:"name"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
	Mobile     string `json:"mobile"`
	Email      string `json:"email"`
}

type Company struct {
	CompanyID     int            `json:"company_id"`
	CompanyName   string         `json:"company_name"`
	FullAddress   string         `json:"full_address"`
	IslandGroup   string         `json:"island_group"`
	Region        string         `json:"region"`
	Province      string         `json:"province"`
	City          string         `json:"city"`
	Zipcode       int            `json:"zipcode"`
	CompanyType   string         `json:"company_type"`
	WebsiteURL    string         `json:"website_url"`
	Contacts      []Contact      `json:"contacts"`
	PrimaryPerson *ContactPerson `json:"primary_person,omitempty"` // NEW
}

func GetAllCompanies() ([]Company, error) {
	companyMap := make(map[int]*Company)
	var companyIDs []int

	query := `
		SELECT 
			c.company_id, 
			COALESCE(c.company_name, 'Unknown'), 
			c.full_address,
			COALESCE(ig.island_group_name, 'N/A'), 
			COALESCE(r.region_name, 'N/A'), 
			COALESCE(p.province_name, 'N/A'), 
			COALESCE(ct.city_name, 'N/A'),
			c.zipcode, 
			c.company_type, 
			c.website_url,
			COALESCE(cc.contact_type, ''),
			COALESCE(cc.contact_details, ''),
			COALESCE(cp.contact_person_name, ''),
			COALESCE(cp.department, ''),
			COALESCE(cp.phone, ''),
			COALESCE(cp.mobile, ''),
			COALESCE(cp.email, '')
		FROM tbl_company c
		LEFT JOIN island_group ig ON c.island_group_id = ig.island_group_id
		LEFT JOIN tbl_regions r ON c.region_id = r.region_id
		LEFT JOIN tbl_province p ON c.province_id = p.province_id
		LEFT JOIN tbl_city ct ON c.city_id = ct.city_id
		LEFT JOIN tbl_company_contacts cc ON c.company_id = cc.company_id
		LEFT JOIN tbl_company_contact_person cp ON c.company_id = cp.company_id AND cp.is_primary = 1 AND cp.is_active = 1
		WHERE c.is_active = 1
		ORDER BY c.company_name ASC
	`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var compID, zip int
		var cName, fAddr, iGrp, reg, prov, city, cType, web string
		var ctType, ctDetails string
		var cpName, cpDept, cpPhone, cpMobile, cpEmail string

		if err := rows.Scan(
			&compID, &cName, &fAddr, &iGrp, &reg, &prov, &city, &zip, &cType, &web,
			&ctType, &ctDetails,
			&cpName, &cpDept, &cpPhone, &cpMobile, &cpEmail,
		); err != nil {
			continue
		}

		if _, exists := companyMap[compID]; !exists {
			company := &Company{
				CompanyID:   compID,
				CompanyName: cName,
				FullAddress: fAddr,
				IslandGroup: iGrp,
				Region:      reg,
				Province:    prov,
				City:        city,
				Zipcode:     zip,
				CompanyType: cType,
				WebsiteURL:  web,
				Contacts:    []Contact{},
			}

			// If a primary person exists, attach them
			if cpName != "" {
				company.PrimaryPerson = &ContactPerson{
					Name:       cpName,
					Department: cpDept,
					Phone:      cpPhone,
					Mobile:     cpMobile,
					Email:      cpEmail,
				}
			}

			companyMap[compID] = company
			companyIDs = append(companyIDs, compID)
		}

		// Prevent duplicate contacts caused by the SQL JOIN Cartesian product
		if ctType != "" && ctDetails != "" {
			isDuplicate := false
			for _, existing := range companyMap[compID].Contacts {
				if existing.Type == ctType && existing.Details == ctDetails {
					isDuplicate = true
					break
				}
			}
			if !isDuplicate {
				companyMap[compID].Contacts = append(companyMap[compID].Contacts, Contact{
					Type:    ctType,
					Details: ctDetails,
				})
			}
		}
	}

	var companies []Company
	for _, id := range companyIDs {
		companies = append(companies, *companyMap[id])
	}

	if companies == nil {
		companies = []Company{}
	}
	return companies, nil
}

// Struct to match the incoming JSON payload from Next.js
type NewCompany struct {
	CompanyName   string `json:"company_name"`
	FullAddress   string `json:"full_address"`
	IslandGroupID int    `json:"island_group_id"`
	RegionID      int    `json:"region_id"`
	ProvinceID    int    `json:"province_id"`
	CityID        int    `json:"city_id"`
	Zipcode       int    `json:"zipcode"`
	CompanyType   string `json:"company_type"`
	WebsiteURL    string `json:"website_url"`
}

// Change the return signature to (int, error)
func CreateCompany(c NewCompany) (int, error) {
	query := `
		INSERT INTO tbl_company 
		(company_name, full_address, island_group_id, region_id, province_id, city_id, zipcode, company_type, website_url, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
	`
	res, err := config.DB.Exec(query,
		c.CompanyName, c.FullAddress, c.IslandGroupID,
		c.RegionID, c.ProvinceID, c.CityID,
		c.Zipcode, c.CompanyType, c.WebsiteURL,
	)
	if err != nil {
		return 0, err
	}

	id, err := res.LastInsertId()
	return int(id), err
}

// Fetch a single company by ID
func GetCompanyByID(id int) (Company, error) {
	query := `
		SELECT 
			c.company_id, 
			COALESCE(c.company_name, 'Unknown'), 
			c.full_address,
			COALESCE(ig.island_group_name, 'N/A'), 
			COALESCE(r.region_name, 'N/A'), 
			COALESCE(p.province_name, 'N/A'), 
			COALESCE(ct.city_name, 'N/A'),
			c.zipcode, 
			c.company_type, 
			c.website_url,
			COALESCE(cc.contact_type, ''),
			COALESCE(cc.contact_details, ''),
			COALESCE(cp.contact_person_name, ''),
			COALESCE(cp.department, ''),
			COALESCE(cp.phone, ''),
			COALESCE(cp.mobile, ''),
			COALESCE(cp.email, '')
		FROM tbl_company c
		LEFT JOIN island_group ig ON c.island_group_id = ig.island_group_id
		LEFT JOIN tbl_regions r ON c.region_id = r.region_id
		LEFT JOIN tbl_province p ON c.province_id = p.province_id
		LEFT JOIN tbl_city ct ON c.city_id = ct.city_id
		LEFT JOIN tbl_company_contacts cc ON c.company_id = cc.company_id
		LEFT JOIN tbl_company_contact_person cp ON c.company_id = cp.company_id AND cp.is_primary = 1 AND cp.is_active = 1
		WHERE c.is_active = 1 AND c.company_id = ?
	`

	rows, err := config.DB.Query(query, id)
	if err != nil {
		return Company{}, err
	}
	defer rows.Close()

	var company *Company

	for rows.Next() {
		var compID, zip int
		var cName, fAddr, iGrp, reg, prov, city, cType, web, ctType, ctDetails, cpName, cpDept, cpPhone, cpMobile, cpEmail string

		if err := rows.Scan(&compID, &cName, &fAddr, &iGrp, &reg, &prov, &city, &zip, &cType, &web, &ctType, &ctDetails, &cpName, &cpDept, &cpPhone, &cpMobile, &cpEmail); err != nil {
			continue
		}

		if company == nil {
			company = &Company{
				CompanyID: compID, CompanyName: cName, FullAddress: fAddr, IslandGroup: iGrp, Region: reg,
				Province: prov, City: city, Zipcode: zip, CompanyType: cType, WebsiteURL: web, Contacts: []Contact{},
			}
			if cpName != "" {
				company.PrimaryPerson = &ContactPerson{Name: cpName, Department: cpDept, Phone: cpPhone, Mobile: cpMobile, Email: cpEmail}
			}
		}

		if ctType != "" && ctDetails != "" {
			isDuplicate := false
			for _, existing := range company.Contacts {
				if existing.Type == ctType && existing.Details == ctDetails {
					isDuplicate = true
					break
				}
			}
			if !isDuplicate {
				company.Contacts = append(company.Contacts, Contact{Type: ctType, Details: ctDetails})
			}
		}
	}

	if company == nil {
		return Company{}, sql.ErrNoRows
	}
	return *company, nil
}

// Struct matching your new table
type CompanyContactPerson struct {
	ContactPersonID   int    `json:"contact_person_id"`
	CompanyID         int    `json:"company_id"`
	Department        string `json:"department"`
	ContactPersonName string `json:"contact_person_name"`
	Phone             string `json:"phone"`
	Mobile            string `json:"mobile"`
	Email             string `json:"email"`
	IsPrimary         int    `json:"is_primary"`
}

// Fetch all active contacts for a company
func GetContactPersons(companyID int) ([]CompanyContactPerson, error) {
	query := `
		SELECT contact_person_id, company_id, COALESCE(department, ''), 
		       COALESCE(contact_person_name, ''), COALESCE(phone, ''), 
		       COALESCE(mobile, ''), COALESCE(email, ''), is_primary 
		FROM tbl_company_contact_person 
		WHERE company_id = ? AND is_active = 1
	`
	rows, err := config.DB.Query(query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []CompanyContactPerson
	for rows.Next() {
		var cp CompanyContactPerson
		if err := rows.Scan(&cp.ContactPersonID, &cp.CompanyID, &cp.Department, &cp.ContactPersonName, &cp.Phone, &cp.Mobile, &cp.Email, &cp.IsPrimary); err == nil {
			contacts = append(contacts, cp)
		}
	}
	if contacts == nil {
		contacts = []CompanyContactPerson{}
	}
	return contacts, nil
}

// Insert a new contact person
func AddContactPerson(cp CompanyContactPerson) error {
	// If set to primary, remove primary status from others in this company
	if cp.IsPrimary == 1 {
		config.DB.Exec("UPDATE tbl_company_contact_person SET is_primary = 0 WHERE company_id = ?", cp.CompanyID)
	}
	query := `INSERT INTO tbl_company_contact_person (company_id, department, contact_person_name, phone, mobile, email, is_primary, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
	_, err := config.DB.Exec(query, cp.CompanyID, cp.Department, cp.ContactPersonName, cp.Phone, cp.Mobile, cp.Email, cp.IsPrimary)
	return err
}

// Update an existing contact person
func UpdateContactPerson(cp CompanyContactPerson) error {
	if cp.IsPrimary == 1 {
		config.DB.Exec("UPDATE tbl_company_contact_person SET is_primary = 0 WHERE company_id = ?", cp.CompanyID)
	}
	query := `UPDATE tbl_company_contact_person SET department = ?, contact_person_name = ?, phone = ?, mobile = ?, email = ?, is_primary = ? WHERE contact_person_id = ?`
	_, err := config.DB.Exec(query, cp.Department, cp.ContactPersonName, cp.Phone, cp.Mobile, cp.Email, cp.IsPrimary, cp.ContactPersonID)
	return err
}

// Soft delete a contact person by setting is_active = 0
func DeleteContactPerson(contactPersonID int) error {
	_, err := config.DB.Exec("UPDATE tbl_company_contact_person SET is_active = 0 WHERE contact_person_id = ?", contactPersonID)
	return err
}
