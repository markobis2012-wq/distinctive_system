package models

import (
	"backend/internal/config"
)

type ScheduleBooking struct {
	BookingID  int    `json:"booking_id"`
	ResourceID int    `json:"resource_id"`
	GroupID    int    `json:"group_id"`
	ProjectID  int    `json:"project_id"`
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle"`
	Task       string `json:"task"`
	Notes      string `json:"notes"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	StartTime  string `json:"start_time"` // NEW
	EndTime    string `json:"end_time"`   // NEW
	ColorTheme string `json:"color_theme"`
}

type ScheduleEntity struct {
	ID        int               `json:"id"`
	Type      string            `json:"type"`
	Name      string            `json:"name"`
	Role      string            `json:"role"`
	AvatarURL string            `json:"avatar_url"`
	Bookings  []ScheduleBooking `json:"bookings"`
}

type GroupPayload struct {
	Name        string `json:"name"`
	ResourceIDs []int  `json:"resource_ids"`
}

func GetSchedule(startDate string, endDate string) ([]ScheduleEntity, error) {
	var entities []ScheduleEntity

	groupRows, _ := config.DB.Query("SELECT group_id, name FROM tbl_schedule_groups")
	if groupRows != nil {
		defer groupRows.Close()
		for groupRows.Next() {
			var e ScheduleEntity
			e.Type = "group"
			if err := groupRows.Scan(&e.ID, &e.Name); err == nil {
				e.Bookings = []ScheduleBooking{}
				entities = append(entities, e)
			}
		}
	}

	resourceRows, _ := config.DB.Query("SELECT resource_id, name, COALESCE(role, ''), COALESCE(avatar_url, '') FROM tbl_schedule_resources WHERE is_active = 1")
	if resourceRows != nil {
		defer resourceRows.Close()
		for resourceRows.Next() {
			var e ScheduleEntity
			e.Type = "resource"
			if err := resourceRows.Scan(&e.ID, &e.Name, &e.Role, &e.AvatarURL); err == nil {
				e.Bookings = []ScheduleBooking{}
				entities = append(entities, e)
			}
		}
	}

	// Updated query to fetch start_time and end_time
	bookingQuery := `
		SELECT booking_id, COALESCE(resource_id, 0), COALESCE(group_id, 0), COALESCE(project_id, 0), 
		       title, COALESCE(subtitle, ''), COALESCE(task, ''), COALESCE(notes, ''),
		       CAST(start_date AS CHAR), CAST(end_date AS CHAR), 
		       CAST(start_time AS CHAR), CAST(end_time AS CHAR), color_theme
		FROM tbl_schedule_bookings
		WHERE start_date <= ? AND end_date >= ?`

	bookingRows, err := config.DB.Query(bookingQuery, endDate, startDate)
	if err == nil {
		defer bookingRows.Close()
		var bookings []ScheduleBooking
		for bookingRows.Next() {
			var b ScheduleBooking
			if err := bookingRows.Scan(&b.BookingID, &b.ResourceID, &b.GroupID, &b.ProjectID, &b.Title, &b.Subtitle, &b.Task, &b.Notes, &b.StartDate, &b.EndDate, &b.StartTime, &b.EndTime, &b.ColorTheme); err == nil {
				bookings = append(bookings, b)
			}
		}

		for i := range entities {
			for _, b := range bookings {
				if entities[i].Type == "group" && b.GroupID == entities[i].ID {
					entities[i].Bookings = append(entities[i].Bookings, b)
				} else if entities[i].Type == "resource" && b.ResourceID == entities[i].ID {
					entities[i].Bookings = append(entities[i].Bookings, b)
				}
			}
		}
	}
	return entities, nil
}

func CreateBooking(b ScheduleBooking) error {
	_, err := config.DB.Exec(`
		INSERT INTO tbl_schedule_bookings (resource_id, group_id, project_id, title, subtitle, task, notes, start_date, end_date, start_time, end_time, color_theme) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		b.ResourceID, b.GroupID, b.ProjectID, b.Title, b.Subtitle, b.Task, b.Notes, b.StartDate, b.EndDate, b.StartTime, b.EndTime, b.ColorTheme)
	return err
}

func CreateGroup(g GroupPayload) error {
	res, err := config.DB.Exec("INSERT INTO tbl_schedule_groups (name) VALUES (?)", g.Name)
	if err != nil {
		return err
	}
	groupID, _ := res.LastInsertId()
	for _, resID := range g.ResourceIDs {
		config.DB.Exec("INSERT INTO tbl_schedule_group_members (group_id, resource_id) VALUES (?, ?)", groupID, resID)
	}
	return nil
}

func DeleteBooking(id int) error {
	_, err := config.DB.Exec("DELETE FROM tbl_schedule_bookings WHERE booking_id = ?", id)
	return err
}

type MoveBookingPayload struct {
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	ResourceID int    `json:"resource_id"`
	GroupID    int    `json:"group_id"`
}

func MoveBooking(bookingID int, p MoveBookingPayload) error {
	_, err := config.DB.Exec("UPDATE tbl_schedule_bookings SET start_date = ?, end_date = ?, resource_id = ?, group_id = ? WHERE booking_id = ?",
		p.StartDate, p.EndDate, p.ResourceID, p.GroupID, bookingID)
	return err
}
