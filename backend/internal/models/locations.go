package models

import (
	"backend/internal/config"
)

type Island struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Region struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	IslandID int    `json:"island_group_id"`
}

type Province struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	RegionID int    `json:"region_id"`
}

type City struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	ProvinceID int    `json:"province_id"`
	RegionID   int    `json:"region_id"`
}

// Master struct to hold all location data
type LocationsData struct {
	Islands   []Island   `json:"islands"`
	Regions   []Region   `json:"regions"`
	Provinces []Province `json:"provinces"`
	Cities    []City     `json:"cities"`
}

func GetAllLocations() (LocationsData, error) {
	var data LocationsData

	// 1. Fetch Islands
	rows1, _ := config.DB.Query("SELECT island_group_id, COALESCE(island_group_name, '') FROM island_group")
	defer rows1.Close()
	for rows1.Next() {
		var i Island
		if err := rows1.Scan(&i.ID, &i.Name); err == nil {
			data.Islands = append(data.Islands, i)
		}
	}

	// 2. Fetch Regions
	rows2, _ := config.DB.Query("SELECT region_id, COALESCE(region_name, ''), COALESCE(island_group_id, 0) FROM tbl_regions")
	defer rows2.Close()
	for rows2.Next() {
		var r Region
		if err := rows2.Scan(&r.ID, &r.Name, &r.IslandID); err == nil {
			data.Regions = append(data.Regions, r)
		}
	}

	// 3. Fetch Provinces
	rows3, _ := config.DB.Query("SELECT province_id, COALESCE(province_name, ''), COALESCE(region_id, 0) FROM tbl_province")
	defer rows3.Close()
	for rows3.Next() {
		var p Province
		if err := rows3.Scan(&p.ID, &p.Name, &p.RegionID); err == nil {
			data.Provinces = append(data.Provinces, p)
		}
	}

	// 4. Fetch Cities
	rows4, _ := config.DB.Query("SELECT city_id, COALESCE(city_name, ''), COALESCE(province_id, 0), COALESCE(region_id, 0) FROM tbl_city")
	defer rows4.Close()
	for rows4.Next() {
		var c City
		if err := rows4.Scan(&c.ID, &c.Name, &c.ProvinceID, &c.RegionID); err == nil {
			data.Cities = append(data.Cities, c)
		}
	}

	return data, nil
}

// Structs for parsing incoming JSON requests
type NewRegionReq struct {
	Name     string `json:"name"`
	IslandID int    `json:"island_group_id"`
}

type NewProvinceReq struct {
	Name     string `json:"name"`
	RegionID int    `json:"region_id"`
}

type NewCityReq struct {
	Name       string `json:"name"`
	ProvinceID int    `json:"province_id"`
	RegionID   int    `json:"region_id"`
}

// Insert Region
func CreateRegion(req NewRegionReq) (Region, error) {
	res, err := config.DB.Exec("INSERT INTO tbl_regions (region_name, island_group_id) VALUES (?, ?)", req.Name, req.IslandID)
	if err != nil {
		return Region{}, err
	}
	id, _ := res.LastInsertId()
	return Region{ID: int(id), Name: req.Name, IslandID: req.IslandID}, nil
}

// Insert Province
func CreateProvince(req NewProvinceReq) (Province, error) {
	res, err := config.DB.Exec("INSERT INTO tbl_province (province_name, region_id) VALUES (?, ?)", req.Name, req.RegionID)
	if err != nil {
		return Province{}, err
	}
	id, _ := res.LastInsertId()
	return Province{ID: int(id), Name: req.Name, RegionID: req.RegionID}, nil
}

// Insert City (includes has_province = 1 default per your schema)
func CreateCity(req NewCityReq) (City, error) {
	res, err := config.DB.Exec("INSERT INTO tbl_city (city_name, province_id, region_id, has_province) VALUES (?, ?, ?, 1)", req.Name, req.ProvinceID, req.RegionID)
	if err != nil {
		return City{}, err
	}
	id, _ := res.LastInsertId()
	return City{ID: int(id), Name: req.Name, ProvinceID: req.ProvinceID, RegionID: req.RegionID}, nil
}
