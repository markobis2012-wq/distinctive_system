package models

import (
	"backend/internal/config"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type BookingItem struct {
	BookingItemID          int     `json:"booking_item_id"`
	BookingID              int     `json:"booking_id"`
	ProjectItemComponentID int     `json:"project_item_component_id"`
	CustomItemName         string  `json:"custom_item_name"`
	QtyToDeliver           float64 `json:"qty_to_deliver"`
}

type BookingCrew struct {
	BookingCrewID int    `json:"booking_crew_id"`
	BookingID     int    `json:"booking_id"`
	ResourceID    int    `json:"resource_id"`
	StaffName     string `json:"staff_name"` // NEW: Sent to frontend for week/day views
	SpecificTask  string `json:"specific_task"`
}

type ScheduleBooking struct {
	BookingID           int           `json:"booking_id"`
	BookingNumber       string        `json:"booking_number"`
	ResourceID          int           `json:"resource_id"`
	GroupID             int           `json:"group_id"`
	ProjectID           int           `json:"project_id"`
	Title               string        `json:"title"`
	Subtitle            string        `json:"subtitle"`
	LocationVenue       string        `json:"location_venue"`
	Task                string        `json:"task"`
	Notes               string        `json:"notes"`
	StartDate           string        `json:"start_date"`
	EndDate             string        `json:"end_date"`
	StartTime           string        `json:"start_time"`
	EndTime             string        `json:"end_time"`
	ColorTheme          string        `json:"color_theme"`
	Status              string        `json:"status"`
	AccomplishmentNotes string        `json:"accomplishment_notes"`
	Items               []BookingItem `json:"items"`
	Crew                []BookingCrew `json:"crew"`
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

	entities = append(entities, ScheduleEntity{
		ID:       0,
		Type:     "general",
		Name:     "FSM Job Orders",
		Role:     "System",
		Bookings: []ScheduleBooking{},
	})

	bookingQuery := `
		SELECT booking_id, COALESCE(booking_number, ''), COALESCE(resource_id, 0), COALESCE(group_id, 0), COALESCE(project_id, 0), 
			   title, COALESCE(subtitle, ''), COALESCE(location_venue, ''), COALESCE(task, ''), COALESCE(notes, ''),
			   CAST(start_date AS CHAR), CAST(end_date AS CHAR), 
			   CAST(start_time AS CHAR), CAST(end_time AS CHAR), color_theme,
			   COALESCE(status, 'Scheduled'), COALESCE(accomplishment_notes, '')
		FROM tbl_schedule_bookings
		WHERE start_date <= ? AND end_date >= ?`

	bookingRows, err := config.DB.Query(bookingQuery, endDate, startDate)
	if err == nil {
		defer bookingRows.Close()
		var bookings []ScheduleBooking
		for bookingRows.Next() {
			var b ScheduleBooking
			if err := bookingRows.Scan(&b.BookingID, &b.BookingNumber, &b.ResourceID, &b.GroupID, &b.ProjectID, &b.Title, &b.Subtitle, &b.LocationVenue, &b.Task, &b.Notes, &b.StartDate, &b.EndDate, &b.StartTime, &b.EndTime, &b.ColorTheme, &b.Status, &b.AccomplishmentNotes); err == nil {
				bookings = append(bookings, b)
			}
		}

		// ---> NEW: Eager Load Items & Crew for the Frontend Calendar! <---
		itemsMap := make(map[int][]BookingItem)
		crewMap := make(map[int][]BookingCrew)

		if len(bookings) > 0 {
			var ids []string
			for _, b := range bookings {
				ids = append(ids, strconv.Itoa(b.BookingID))
			}
			idList := strings.Join(ids, ",")

			// Get Items
			itemQ := fmt.Sprintf("SELECT booking_item_id, booking_id, COALESCE(project_item_component_id, 0), COALESCE(custom_item_name, ''), qty_to_deliver FROM tbl_schedule_booking_items WHERE booking_id IN (%s)", idList)
			iRows, _ := config.DB.Query(itemQ)
			if iRows != nil {
				defer iRows.Close()
				for iRows.Next() {
					var i BookingItem
					iRows.Scan(&i.BookingItemID, &i.BookingID, &i.ProjectItemComponentID, &i.CustomItemName, &i.QtyToDeliver)
					itemsMap[i.BookingID] = append(itemsMap[i.BookingID], i)
				}
			}

			// Get Crew WITH Names
			crewQ := fmt.Sprintf("SELECT c.booking_crew_id, c.booking_id, c.resource_id, COALESCE(r.name, ''), COALESCE(c.specific_task, '') FROM tbl_schedule_booking_crew c LEFT JOIN tbl_schedule_resources r ON c.resource_id = r.resource_id WHERE c.booking_id IN (%s)", idList)
			cRows, _ := config.DB.Query(crewQ)
			if cRows != nil {
				defer cRows.Close()
				for cRows.Next() {
					var c BookingCrew
					cRows.Scan(&c.BookingCrewID, &c.BookingID, &c.ResourceID, &c.StaffName, &c.SpecificTask)
					crewMap[c.BookingID] = append(crewMap[c.BookingID], c)
				}
			}
		}

		// Attach them back
		for i := range bookings {
			if items, ok := itemsMap[bookings[i].BookingID]; ok {
				bookings[i].Items = items
			} else {
				bookings[i].Items = []BookingItem{}
			}
			if crew, ok := crewMap[bookings[i].BookingID]; ok {
				bookings[i].Crew = crew
			} else {
				bookings[i].Crew = []BookingCrew{}
			}
		}

		// Finalize mapping to entities
		for i := range entities {
			for _, b := range bookings {
				if entities[i].Type == "group" && b.GroupID == entities[i].ID {
					entities[i].Bookings = append(entities[i].Bookings, b)
				} else if entities[i].Type == "resource" && b.ResourceID == entities[i].ID {
					entities[i].Bookings = append(entities[i].Bookings, b)
				} else if entities[i].Type == "general" && b.ResourceID == 0 && b.GroupID == 0 {
					entities[i].Bookings = append(entities[i].Bookings, b)
				}
			}
		}
	}
	return entities, nil
}

func CreateBooking(b ScheduleBooking) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	res, err := tx.Exec(`
		INSERT INTO tbl_schedule_bookings 
		(booking_number, resource_id, group_id, project_id, title, subtitle, location_venue, task, notes, start_date, end_date, start_time, end_time, color_theme, status, accomplishment_notes) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		b.BookingNumber, b.ResourceID, b.GroupID, b.ProjectID, b.Title, b.Subtitle, b.LocationVenue, b.Task, b.Notes, b.StartDate, b.EndDate, b.StartTime, b.EndTime, b.ColorTheme, b.Status, b.AccomplishmentNotes)

	if err != nil {
		tx.Rollback()
		return err
	}
	bookingID, _ := res.LastInsertId()

	if b.BookingNumber == "" {
		joNumber := fmt.Sprintf("JO-%d-%04d", time.Now().Year(), bookingID)
		tx.Exec("UPDATE tbl_schedule_bookings SET booking_number = ? WHERE booking_id = ?", joNumber, bookingID)
	}

	for _, item := range b.Items {
		_, err := tx.Exec(`INSERT INTO tbl_schedule_booking_items (booking_id, project_item_component_id, custom_item_name, qty_to_deliver) VALUES (?, NULLIF(?, 0), ?, ?)`, bookingID, item.ProjectItemComponentID, item.CustomItemName, item.QtyToDeliver)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	for _, crew := range b.Crew {
		_, err := tx.Exec(`INSERT INTO tbl_schedule_booking_crew (booking_id, resource_id, specific_task) VALUES (?, ?, ?)`, bookingID, crew.ResourceID, crew.SpecificTask)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func UpdateBooking(b ScheduleBooking) error {
	tx, err := config.DB.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		UPDATE tbl_schedule_bookings 
		SET booking_number = ?, resource_id = ?, group_id = ?, project_id = ?, title = ?, subtitle = ?, location_venue = ?, task = ?, notes = ?, start_date = ?, end_date = ?, start_time = ?, end_time = ?, color_theme = ?, status = ?, accomplishment_notes = ?
		WHERE booking_id = ?`,
		b.BookingNumber, b.ResourceID, b.GroupID, b.ProjectID, b.Title, b.Subtitle, b.LocationVenue, b.Task, b.Notes, b.StartDate, b.EndDate, b.StartTime, b.EndTime, b.ColorTheme, b.Status, b.AccomplishmentNotes, b.BookingID)

	if err != nil {
		tx.Rollback()
		return err
	}

	tx.Exec("DELETE FROM tbl_schedule_booking_items WHERE booking_id = ?", b.BookingID)
	tx.Exec("DELETE FROM tbl_schedule_booking_crew WHERE booking_id = ?", b.BookingID)

	for _, item := range b.Items {
		_, err := tx.Exec(`INSERT INTO tbl_schedule_booking_items (booking_id, project_item_component_id, custom_item_name, qty_to_deliver) VALUES (?, NULLIF(?, 0), ?, ?)`, b.BookingID, item.ProjectItemComponentID, item.CustomItemName, item.QtyToDeliver)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	for _, crew := range b.Crew {
		_, err := tx.Exec(`INSERT INTO tbl_schedule_booking_crew (booking_id, resource_id, specific_task) VALUES (?, ?, ?)`, b.BookingID, crew.ResourceID, crew.SpecificTask)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func GetBookingDetails(bookingID int) ([]BookingItem, []BookingCrew, error) {
	var items []BookingItem
	var crew []BookingCrew

	itemRows, _ := config.DB.Query("SELECT booking_item_id, booking_id, COALESCE(project_item_component_id, 0), COALESCE(custom_item_name, ''), qty_to_deliver FROM tbl_schedule_booking_items WHERE booking_id = ?", bookingID)
	if itemRows != nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var i BookingItem
			if err := itemRows.Scan(&i.BookingItemID, &i.BookingID, &i.ProjectItemComponentID, &i.CustomItemName, &i.QtyToDeliver); err == nil {
				items = append(items, i)
			}
		}
	}

	crewRows, _ := config.DB.Query("SELECT c.booking_crew_id, c.booking_id, c.resource_id, COALESCE(r.name, ''), COALESCE(c.specific_task, '') FROM tbl_schedule_booking_crew c LEFT JOIN tbl_schedule_resources r ON c.resource_id = r.resource_id WHERE c.booking_id = ?", bookingID)
	if crewRows != nil {
		defer crewRows.Close()
		for crewRows.Next() {
			var c BookingCrew
			if err := crewRows.Scan(&c.BookingCrewID, &c.BookingID, &c.ResourceID, &c.StaffName, &c.SpecificTask); err == nil {
				crew = append(crew, c)
			}
		}
	}

	if items == nil {
		items = []BookingItem{}
	}
	if crew == nil {
		crew = []BookingCrew{}
	}

	return items, crew, nil
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
	StartTime  string `json:"start_time"` // NEW
	EndTime    string `json:"end_time"`   // NEW
	ResourceID int    `json:"resource_id"`
	GroupID    int    `json:"group_id"`
}

func MoveBooking(bookingID int, p MoveBookingPayload) error {
	// Added start_time and end_time to the UPDATE query
	_, err := config.DB.Exec("UPDATE tbl_schedule_bookings SET start_date = ?, end_date = ?, start_time = ?, end_time = ?, resource_id = ?, group_id = ? WHERE booking_id = ?",
		p.StartDate, p.EndDate, p.StartTime, p.EndTime, p.ResourceID, p.GroupID, bookingID)
	return err
}
