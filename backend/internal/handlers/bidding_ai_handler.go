package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mxschmitt/playwright-go"
	openai "github.com/sashabaranov/go-openai"
)

type PhilGEPSBid struct {
	Title  string `json:"title"`
	Link   string `json:"link"`
	Budget string `json:"budget"`
}

func HandleAISearchPhilGEPS(c *gin.Context) {
	// ==========================================
	// 1. SETUP: YOUR FREE OPENROUTER API KEY
	// ==========================================
	//openRouterKey := ""
	openRouterKey := os.Getenv("OPENROUTER_API_KEY")
	if strings.TrimSpace(openRouterKey) == "" {
		c.JSON(500, gin.H{"error": "OPENROUTER_API_KEY is not set"})
		return
	}
	// ==========================================
	// 2. SCRAPE PHILGEPS (REAL DATA VIA PLAYWRIGHT)
	// ==========================================
	var scrapedBids []PhilGEPSBid

	pw, err := playwright.Run()
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("could not start playwright: %v", err)})
		return
	}
	defer pw.Stop()

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("could not launch browser: %v", err)})
		return
	}
	defer browser.Close()

	// CRITICAL FIX: Apply a real Google Chrome User-Agent so the firewall doesn't block us
	bCtx, err := browser.NewContext(playwright.BrowserNewContextOptions{
		UserAgent: playwright.String("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("could not create context: %v", err)})
		return
	}
	defer bCtx.Close()

	page, err := bCtx.NewPage()
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("could not create page: %v", err)})
		return
	}

	// 1. Use the exact direct-load URL you found!
	log.Println("Navigating directly to PhilGEPS Open Opportunities...")
	if _, err = page.Goto("https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&DirectFrom=OpenOpp&SearchDirectFrom=SearchOpenOpp", playwright.PageGotoOptions{
		WaitUntil: playwright.WaitUntilStateDomcontentloaded,
	}); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("could not visit PhilGEPS: %v", err)})
		return
	}

	// 2. Wait for the data table to appear (Extended timeout to 15 seconds for slow government servers)
	log.Println("Waiting for bidding table to appear...")
	if _, err := page.WaitForSelector("table#dgBiddingItems", playwright.PageWaitForSelectorOptions{
		Timeout: playwright.Float(15000),
	}); err != nil {
		c.JSON(500, gin.H{"error": "PhilGEPS loaded, but the bidding table didn't appear. The firewall may still be blocking the request."})
		return
	}

	// Extract the rows
	rows, err := page.QuerySelectorAll("table#dgBiddingItems tr")
	if err != nil {
		c.JSON(500, gin.H{"error": "could not find bidding table"})
		return
	}

	log.Printf("Found %d rows on PhilGEPS.\n", len(rows))

	for i, row := range rows {
		if i == 0 || i > 25 { // Bumped up to 25 to give the AI more options to filter!
			continue
		}

		titleElement, _ := row.QuerySelector("td:nth-child(2) a")
		budgetElement, _ := row.QuerySelector("td:nth-child(5)")

		if titleElement != nil && budgetElement != nil {
			title, _ := titleElement.InnerText()
			href, _ := titleElement.GetAttribute("href")
			budget, _ := budgetElement.InnerText()

			if title != "" && href != "" {
				scrapedBids = append(scrapedBids, PhilGEPSBid{
					Title:  strings.TrimSpace(title),
					Link:   "https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/" + href,
					Budget: strings.TrimSpace(budget),
				})
			}
		}
	}

	if len(scrapedBids) == 0 {
		c.JSON(500, gin.H{"error": "Successfully connected to PhilGEPS, but no bids were found in the table."})
		return
	}

	// ==========================================
	// 3. SEND TO OPENROUTER AI FOR FILTERING
	// ==========================================

	log.Println("Sending real data to AI for filtering...")

	config := openai.DefaultConfig(openRouterKey)
	config.BaseURL = "https://openrouter.ai/api/v1"
	client := openai.NewClientWithConfig(config)

	prompt := `You are the lead procurement officer for "Distinctive Blinds & Office Systems, Inc." in the Philippines. 
Our products include: Window coverings (fabric/PVC blinds, roman shades, roll-up shades), office furniture (modular partitions, desks, storage cabinets), and office seating (executive, staff, auditorium).
Review this list of real, live government bids scraped from PhilGEPS:
`
	for i, b := range scrapedBids {
		prompt += fmt.Sprintf("%d. %s (Budget: %s) - Link: %s\n", i+1, b.Title, b.Budget, b.Link)
	}

	prompt += `
Analyze these bids. Return a JSON object with exactly one key called "recommended_bids". 
This key must contain a JSON array of ONLY the bids we are qualified to win based on our specific product line. 
For each matched bid, include these fields: "title", "budget", "link", and "reason" (a 1-sentence explanation of why our company is a perfect fit).`

	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "openrouter/free",
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: "You are a helpful AI that strictly outputs valid JSON. Never output conversational text. Always format the output exactly as requested."},
				{Role: openai.ChatMessageRoleUser, Content: prompt},
			},
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": "AI Processing Failed: " + err.Error()})
		return
	}

	// ==========================================
	// 4. CLEAN AND RETURN AI JSON
	// ==========================================
	rawJSON := resp.Choices[0].Message.Content

	rawJSON = strings.TrimSpace(rawJSON)
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")

	var aiResponse map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &aiResponse); err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse AI output", "raw": rawJSON})
		return
	}

	c.JSON(200, aiResponse)
}
