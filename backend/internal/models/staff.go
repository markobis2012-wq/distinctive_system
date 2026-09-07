package models

import "backend/internal/config"

type Staff struct {
	ResourceID   int    `json:"resource_id"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	AvatarURL    string `json:"avatar_url"`
	IsActive     int    `json:"is_active"`
	DepartmentID int    `json:"department_id"`
	Department   string `json:"department"` // Brought in via SQL JOIN
	Position     string `json:"position"`
	Address      string `json:"address"`
	MobileNo     string `json:"mobile_no"`
	Email        string `json:"email"`
}

func GetAllDepartments() ([]Department, error) {
	rows, err := config.DB.Query("SELECT department_id, COALESCE(department, '') FROM tbl_department")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []Department
	for rows.Next() {
		var d Department
		// CHANGED: We now use d.ID and d.Name to match project_aux.go!
		if err := rows.Scan(&d.ID, &d.Name); err == nil {
			deps = append(deps, d)
		}
	}
	return deps, nil
}

func GetAllStaff() ([]Staff, error) {
	query := `
		SELECT r.resource_id, r.name, COALESCE(r.role, ''), COALESCE(r.avatar_url, ''), r.is_active, 
		       COALESCE(r.department_id, 0), COALESCE(d.department, 'Unassigned'), 
		       COALESCE(r.position, ''), COALESCE(r.address, ''), COALESCE(r.mobile_no, ''), COALESCE(r.email, '')
		FROM tbl_schedule_resources r
		LEFT JOIN tbl_department d ON r.department_id = d.department_id
		WHERE r.is_active = 1
		ORDER BY r.name ASC`

	rows, err := config.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var staff []Staff
	for rows.Next() {
		var s Staff
		if err := rows.Scan(&s.ResourceID, &s.Name, &s.Role, &s.AvatarURL, &s.IsActive, &s.DepartmentID, &s.Department, &s.Position, &s.Address, &s.MobileNo, &s.Email); err == nil {
			staff = append(staff, s)
		}
	}
	return staff, nil
}

func CreateStaff(s Staff) error {
	_, err := config.DB.Exec(`
		INSERT INTO tbl_schedule_resources (name, role, avatar_url, department_id, position, address, mobile_no, email, is_active) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
		s.Name, s.Role, s.AvatarURL, s.DepartmentID, s.Position, s.Address, s.MobileNo, s.Email)
	return err
}

func UpdateStaff(id int, s Staff) error {
	_, err := config.DB.Exec(`
		UPDATE tbl_schedule_resources 
		SET name=?, role=?, avatar_url=?, department_id=?, position=?, address=?, mobile_no=?, email=? 
		WHERE resource_id=?`,
		s.Name, s.Role, s.AvatarURL, s.DepartmentID, s.Position, s.Address, s.MobileNo, s.Email, id)
	return err
}

// Soft Delete so we don't break existing schedule records
func DeleteStaff(id int) error {
	_, err := config.DB.Exec("UPDATE tbl_schedule_resources SET is_active = 0 WHERE resource_id = ?", id)
	return err
}
