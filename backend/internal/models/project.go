package models

import (
	"backend/internal/config"
	"database/sql"
	"fmt"
	"time"
)

type Project struct {
	ProjectID          int     `json:"projects_id"`
	DbosDepartmentID   int     `json:"dbos_department_id"`
	ProjectsCategory   string  `json:"projects_category"`
	ProjectYear        int     `json:"project_year"`
	ProjectCounter     int     `json:"project_counter"`
	ProjectNumber      string  `json:"project_number"`
	ProjectDateCreated string  `json:"project_date_created"`
	ProjectStartDate   string  `json:"project_date_start_date"`
	ProjectEndDate     string  `json:"project_date_end_date"`
	ContractAmount     float64 `json:"contract_amount"`
	ProjectName        string  `json:"project_name"`
	BiddingID          int     `json:"bidding_id"`
	ClientID           int     `json:"client_id"`
	ProjectStatus      string  `json:"project_status"`
	IsActive           int     `json:"is_active"`

	// Joined Fields for the UI table
	ClientName       string `json:"client_name"`
	DepartmentName   string `json:"department_name"`
	BiddingReference string `json:"bidding_reference"`
}

type ProjectFilters struct {
	Search       string
	Page         int
	Limit        int
	SortField    string
	SortOrder    string
	ClientID     int
	DepartmentID int
	Status       string
	Category     string
}

func GetProjects(f ProjectFilters) ([]Project, int, error) {
	offset := (f.Page - 1) * f.Limit
	whereClauses := []string{"p.is_active = 1"}
	var args []interface{}

	if f.Search != "" {
		searchParam := "%" + f.Search + "%"
		whereClauses = append(whereClauses, "(p.project_number LIKE ? OR p.project_name LIKE ? OR c.company_name LIKE ?)")
		args = append(args, searchParam, searchParam, searchParam)
	}
	if f.ClientID > 0 {
		whereClauses = append(whereClauses, "p.client_id = ?")
		args = append(args, f.ClientID)
	}
	if f.DepartmentID > 0 {
		whereClauses = append(whereClauses, "p.dbos_department_id = ?")
		args = append(args, f.DepartmentID)
	}
	if f.Status != "" {
		whereClauses = append(whereClauses, "p.project_status = ?")
		args = append(args, f.Status)
	}
	if f.Category != "" {
		whereClauses = append(whereClauses, "p.projects_category = ?")
		args = append(args, f.Category)
	}

	whereString := ""
	for i, clause := range whereClauses {
		if i == 0 {
			whereString += "WHERE " + clause
		} else {
			whereString += " AND " + clause
		}
	}

	sortCol := "p.projects_id"
	allowedSorts := map[string]string{
		"project_number":  "p.project_number",
		"project_name":    "p.project_name",
		"contract_amount": "p.contract_amount",
		"client_name":     "c.company_name",
		"start_date":      "p.project_date_start_date",
		"status":          "p.project_status",
	}
	if col, ok := allowedSorts[f.SortField]; ok {
		sortCol = col
	}
	order := "DESC"
	if f.SortOrder == "asc" {
		order = "ASC"
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM projects p LEFT JOIN tbl_company c ON p.client_id = c.company_id " + whereString
	if err := config.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
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
		` + whereString + ` ORDER BY ` + sortCol + ` ` + order + ` LIMIT ? OFFSET ?`

	args = append(args, f.Limit, offset)
	rows, err := config.DB.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(
			&p.ProjectID, &p.DbosDepartmentID, &p.ProjectsCategory, &p.ProjectYear, &p.ProjectCounter, &p.ProjectNumber,
			&p.ProjectDateCreated, &p.ProjectStartDate, &p.ProjectEndDate, &p.ContractAmount, &p.ProjectName,
			&p.BiddingID, &p.ClientID, &p.ProjectStatus, &p.IsActive,
			&p.ClientName, &p.DepartmentName, &p.BiddingReference,
		); err == nil {
			projects = append(projects, p)
		}
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, total, nil
}

func AddProject(p Project) error {
	year := time.Now().Year()
	var currentMax sql.NullInt64

	// Safely calculate the next counter for the current year
	err := config.DB.QueryRow("SELECT MAX(project_counter) FROM projects WHERE project_year = ?", year).Scan(&currentMax)
	counter := 1
	if err == nil && currentMax.Valid {
		counter = int(currentMax.Int64) + 1
	}
	projectNum := fmt.Sprintf("%d-%03d", year, counter)

	query := `INSERT INTO projects (
		dbos_department_id, projects_category, project_year, project_counter, project_number, project_date_created, 
		project_date_start_date, project_date_end_date, contract_amount, project_name, bidding_id, client_id, project_status, is_active
	) VALUES (?, ?, ?, ?, ?, CURDATE(), NULLIF(?, ''), NULLIF(?, ''), ?, ?, NULLIF(?, 0), NULLIF(?, 0), ?, 1)`

	_, err = config.DB.Exec(query,
		p.DbosDepartmentID, p.ProjectsCategory, year, counter, projectNum, p.ProjectStartDate, p.ProjectEndDate,
		p.ContractAmount, p.ProjectName, p.BiddingID, p.ClientID, p.ProjectStatus,
	)
	return err
}

func UpdateProject(p Project) error {
	query := `UPDATE projects SET 
		dbos_department_id=?, projects_category=?, project_date_start_date=NULLIF(?, ''), project_date_end_date=NULLIF(?, ''), 
		contract_amount=?, project_name=?, bidding_id=NULLIF(?, 0), client_id=NULLIF(?, 0), project_status=? 
		WHERE projects_id=?`
	_, err := config.DB.Exec(query,
		p.DbosDepartmentID, p.ProjectsCategory, p.ProjectStartDate, p.ProjectEndDate, p.ContractAmount,
		p.ProjectName, p.BiddingID, p.ClientID, p.ProjectStatus, p.ProjectID,
	)
	return err
}

func DeleteProject(id int) error {
	_, err := config.DB.Exec("UPDATE projects SET is_active = 0 WHERE projects_id = ?", id)
	return err
}
