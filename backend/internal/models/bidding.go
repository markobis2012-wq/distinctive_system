package models

import (
	"backend/internal/config"
)

type Bidding struct {
	BiddingID           int     `json:"bidding_id"`
	DateInputted        string  `json:"date_inputted"`
	ReferenceNo         string  `json:"reference_no"`
	SolicitationNo      string  `json:"solicitation_no"`
	ProcuringEntity     string  `json:"procuring_entity"`
	ClientID            int     `json:"client_id"`
	Title               string  `json:"title"`
	FullAddress         string  `json:"full_address"`
	IslandGroupID       int     `json:"island_group_id"`
	RegionID            int     `json:"region_id"`
	ProvinceID          int     `json:"province_id"`
	CityID              int     `json:"city_id"`
	TradeAgreement      string  `json:"trade_agreement"`
	ProcurementMode     string  `json:"procurement_mode"`
	Classification      string  `json:"classification"`
	Category            string  `json:"category"`
	ContactNumbers      string  `json:"contact_numbers"`
	ApprovedBudget      float64 `json:"approved_budget"`
	DeliveryPeriod      string  `json:"delivery_period"`
	DatePublished       string  `json:"date_published"`
	LastUpdateTime      string  `json:"last_update_time"`
	ClosingDateTime     string  `json:"closing_date_time"`
	ContactPerson       string  `json:"contact_person"`
	ContactPersonDept   string  `json:"contact_person_dept"`
	ContactNumber       string  `json:"contact_number"`
	Email               string  `json:"email"`
	AlternateContPerson string  `json:"alternate_cont_person"`
	AlternateContDept   string  `json:"alternate_cont_dept"`
	AltContContacts     string  `json:"alt_cont_contacts"`
	AltContEmail        string  `json:"alt_cont_email"`
	PreBidDatetime      string  `json:"pre_bid_datetime"`
	Venue               string  `json:"venue"`
	ItbStatus           string  `json:"itb_status"`
	IsActive            int     `json:"is_active"`
	MustJoin            int     `json:"must_join"`
	IsRfq               int     `json:"is_rfq"`
	NoteDesc            string  `json:"note_desc"`

	// Joined Fields for Display
	IslandGroupName string `json:"island_group_name"`
	RegionName      string `json:"region_name"`
}

type BiddingFilters struct {
	Search      string
	Page        int
	Limit       int
	SortField   string
	SortOrder   string
	CompanyID   int
	IslandID    int
	RegionID    int
	ProvinceID  int
	CityID      int
	PreBidStart string
	PreBidEnd   string
	BidStart    string
	BidEnd      string
}

func GetBiddings(f BiddingFilters) ([]Bidding, int, error) {
	offset := (f.Page - 1) * f.Limit

	whereClauses := []string{"b.is_active = 1"}
	var args []interface{}

	// 1. Global Search (Expanded to include Title)
	if f.Search != "" {
		searchParam := "%" + f.Search + "%"
		whereClauses = append(whereClauses, "(b.reference_no LIKE ? OR b.solicitation_no LIKE ? OR b.procuring_entity LIKE ? OR b.title LIKE ?)")
		args = append(args, searchParam, searchParam, searchParam, searchParam)
	}

	// 2. Dropdown Filters
	if f.CompanyID > 0 {
		whereClauses = append(whereClauses, "b.client_id = ?")
		args = append(args, f.CompanyID)
	}
	if f.IslandID > 0 {
		whereClauses = append(whereClauses, "b.island_group_id = ?")
		args = append(args, f.IslandID)
	}
	if f.RegionID > 0 {
		whereClauses = append(whereClauses, "b.region_id = ?")
		args = append(args, f.RegionID)
	}
	if f.ProvinceID > 0 {
		whereClauses = append(whereClauses, "b.province_id = ?")
		args = append(args, f.ProvinceID)
	}
	if f.CityID > 0 {
		whereClauses = append(whereClauses, "b.city_id = ?")
		args = append(args, f.CityID)
	}

	// 3. Date Range Filters
	if f.PreBidStart != "" {
		whereClauses = append(whereClauses, "DATE(b.pre_bid_datetime) >= ?")
		args = append(args, f.PreBidStart)
	}
	if f.PreBidEnd != "" {
		whereClauses = append(whereClauses, "DATE(b.pre_bid_datetime) <= ?")
		args = append(args, f.PreBidEnd)
	}
	if f.BidStart != "" {
		whereClauses = append(whereClauses, "DATE(b.closing_date_time) >= ?")
		args = append(args, f.BidStart)
	}
	if f.BidEnd != "" {
		whereClauses = append(whereClauses, "DATE(b.closing_date_time) <= ?")
		args = append(args, f.BidEnd)
	}

	// Combine all WHERE clauses safely
	whereString := ""
	for i, clause := range whereClauses {
		if i == 0 {
			whereString += "WHERE " + clause
		} else {
			whereString += " AND " + clause
		}
	}

	// 4. Secure Sorting Logic
	sortCol := "b.bidding_id"
	allowedSorts := map[string]string{
		"category":         "b.category",
		"reference_no":     "b.reference_no",
		"approved_budget":  "b.approved_budget",
		"solicitation_no":  "b.solicitation_no",
		"procuring_entity": "b.procuring_entity",
		"island_group":     "ig.island_group_name",
		"region":           "r.region_name",
		"pre_bid_date":     "b.pre_bid_datetime",
		"bidding_date":     "b.closing_date_time",
		"status":           "b.itb_status",
	}
	if col, exists := allowedSorts[f.SortField]; exists {
		sortCol = col
	}

	order := "DESC"
	if f.SortOrder == "asc" {
		order = "ASC"
	}

	// Execute COUNT Query
	var total int
	countQuery := "SELECT COUNT(*) FROM tbl_bidding b LEFT JOIN island_group ig ON b.island_group_id = ig.island_group_id LEFT JOIN tbl_regions r ON b.region_id = r.region_id " + whereString
	if err := config.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Execute DATA Query
	dataQuery := `
		SELECT 
			b.bidding_id, COALESCE(CAST(b.date_inputted AS CHAR), ''), COALESCE(b.reference_no, ''), COALESCE(b.solicitation_no, ''),
			COALESCE(b.procuring_entity, ''), COALESCE(b.client_id, 0), COALESCE(b.title, ''), COALESCE(b.full_address, ''),
			COALESCE(b.island_group_id, 0), COALESCE(b.region_id, 0), COALESCE(b.province_id, 0), COALESCE(b.city_id, 0),
			COALESCE(b.trade_agreement, ''), COALESCE(b.procurement_mode, ''), COALESCE(b.classification, ''), COALESCE(b.category, ''),
			COALESCE(b.contact_numbers, ''), COALESCE(b.approved_budget, 0), COALESCE(b.delivery_period, ''),
			COALESCE(CAST(b.date_published AS CHAR), ''), COALESCE(CAST(b.last_update_time AS CHAR), ''), COALESCE(CAST(b.closing_date_time AS CHAR), ''),
			COALESCE(b.contact_person, ''), COALESCE(b.contact_person_dept, ''), COALESCE(b.contact_number, ''), COALESCE(b.email, ''),
			COALESCE(b.alternate_cont_person, ''), COALESCE(b.alternate_cont_dept, ''), COALESCE(b.alt_cont_contacts, ''), COALESCE(b.alt_cont_email, ''),
			COALESCE(CAST(b.pre_bid_datetime AS CHAR), ''), COALESCE(b.venue, ''), COALESCE(b.itb_status, ''), COALESCE(b.is_active, 1),
			COALESCE(b.must_join, 0), COALESCE(b.is_rfq, 0), COALESCE(b.note_desc, ''),
			COALESCE(ig.island_group_name, 'N/A'), COALESCE(r.region_name, 'N/A')
		FROM tbl_bidding b
		LEFT JOIN island_group ig ON b.island_group_id = ig.island_group_id
		LEFT JOIN tbl_regions r ON b.region_id = r.region_id 
		` + whereString + ` ORDER BY ` + sortCol + ` ` + order + ` LIMIT ? OFFSET ?`

	// Add limit and offset to args
	args = append(args, f.Limit, offset)

	rows, err := config.DB.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var biddings []Bidding
	for rows.Next() {
		var b Bidding
		if err := rows.Scan(
			&b.BiddingID, &b.DateInputted, &b.ReferenceNo, &b.SolicitationNo, &b.ProcuringEntity, &b.ClientID, &b.Title, &b.FullAddress,
			&b.IslandGroupID, &b.RegionID, &b.ProvinceID, &b.CityID, &b.TradeAgreement, &b.ProcurementMode, &b.Classification, &b.Category,
			&b.ContactNumbers, &b.ApprovedBudget, &b.DeliveryPeriod, &b.DatePublished, &b.LastUpdateTime, &b.ClosingDateTime,
			&b.ContactPerson, &b.ContactPersonDept, &b.ContactNumber, &b.Email, &b.AlternateContPerson, &b.AlternateContDept, &b.AltContContacts, &b.AltContEmail,
			&b.PreBidDatetime, &b.Venue, &b.ItbStatus, &b.IsActive, &b.MustJoin, &b.IsRfq, &b.NoteDesc,
			&b.IslandGroupName, &b.RegionName,
		); err == nil {
			biddings = append(biddings, b)
		}
	}
	if biddings == nil {
		biddings = []Bidding{}
	}

	return biddings, total, nil
}

func AddBidding(b Bidding) error {
	query := `
		INSERT INTO tbl_bidding (
			date_inputted, reference_no, solicitation_no, procuring_entity, client_id, title, full_address,
			island_group_id, region_id, province_id, city_id, trade_agreement, procurement_mode, classification, category,
			contact_numbers, approved_budget, delivery_period, date_published, last_update_time, closing_date_time,
			contact_person, contact_person_dept, contact_number, email, alternate_cont_person, alternate_cont_dept, alt_cont_contacts, alt_cont_email,
			pre_bid_datetime, venue, itb_status, is_active, must_join, is_rfq, note_desc
		) VALUES (
			CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''),
			?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, 1, ?, ?, ?
		)`

	_, err := config.DB.Exec(query,
		b.ReferenceNo, b.SolicitationNo, b.ProcuringEntity, b.ClientID, b.Title, b.FullAddress,
		b.IslandGroupID, b.RegionID, b.ProvinceID, b.CityID, b.TradeAgreement, b.ProcurementMode, b.Classification, b.Category,
		b.ContactNumbers, b.ApprovedBudget, b.DeliveryPeriod, b.DatePublished, b.LastUpdateTime, b.ClosingDateTime,
		b.ContactPerson, b.ContactPersonDept, b.ContactNumber, b.Email, b.AlternateContPerson, b.AlternateContDept, b.AltContContacts, b.AltContEmail,
		b.PreBidDatetime, b.Venue, b.ItbStatus, b.MustJoin, b.IsRfq, b.NoteDesc,
	)
	return err
}

func UpdateBidding(b Bidding) error {
	query := `
		UPDATE tbl_bidding SET
			reference_no=?, solicitation_no=?, procuring_entity=?, client_id=?, title=?, full_address=?,
			island_group_id=?, region_id=?, province_id=?, city_id=?, trade_agreement=?, procurement_mode=?, classification=?, category=?,
			contact_numbers=?, approved_budget=?, delivery_period=?, date_published=NULLIF(?, ''), last_update_time=NULLIF(?, ''), closing_date_time=NULLIF(?, ''),
			contact_person=?, contact_person_dept=?, contact_number=?, email=?, alternate_cont_person=?, alternate_cont_dept=?, alt_cont_contacts=?, alt_cont_email=?,
			pre_bid_datetime=NULLIF(?, ''), venue=?, itb_status=?, must_join=?, is_rfq=?, note_desc=?
		WHERE bidding_id=?`

	_, err := config.DB.Exec(query,
		b.ReferenceNo, b.SolicitationNo, b.ProcuringEntity, b.ClientID, b.Title, b.FullAddress,
		b.IslandGroupID, b.RegionID, b.ProvinceID, b.CityID, b.TradeAgreement, b.ProcurementMode, b.Classification, b.Category,
		b.ContactNumbers, b.ApprovedBudget, b.DeliveryPeriod, b.DatePublished, b.LastUpdateTime, b.ClosingDateTime,
		b.ContactPerson, b.ContactPersonDept, b.ContactNumber, b.Email, b.AlternateContPerson, b.AlternateContDept, b.AltContContacts, b.AltContEmail,
		b.PreBidDatetime, b.Venue, b.ItbStatus, b.MustJoin, b.IsRfq, b.NoteDesc,
		b.BiddingID,
	)
	return err
}

func DeleteBidding(id int) error {
	_, err := config.DB.Exec("UPDATE tbl_bidding SET is_active = 0 WHERE bidding_id = ?", id)
	return err
}
