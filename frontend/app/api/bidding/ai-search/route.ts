import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Read the requested category ID from the URL (default to 4 for Furniture if missing)
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category') || '4';

    // Inject the dynamic category ID into the PhilGEPS URL
    const philgepsUrl = `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&BusCatID=${categoryId}&type=category&ClickFrom=OpenOpp`;
    
    const response = await fetch(philgepsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      cache: 'no-store' 
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const scrapedBids: Array<{title: string, budget: string, link: string, reason: string}> = [];
    
    $('a').each((i, element) => {
      const rawHref = $(element).attr('href') || '';
      const title = $(element).text().trim();
      
      if (rawHref.toLowerCase().includes('refid=') && title.length > 10) {
        const cleanHref = rawHref.replace('../Tender/', '').replace('../', '');
        const link = `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/${cleanHref}`;
        
        const row = $(element).closest('tr');
        const colTexts = row.find('td').map((_, td) => $(td).text().trim()).get();
        
        const publishDate = colTexts.length >= 2 ? colTexts[1] : 'Recent';
        const closingDate = colTexts.length >= 3 ? colTexts[2] : 'Unknown';
        
        scrapedBids.push({ 
          title: title, 
          budget: `Closes: ${closingDate}`,
          link: link,
          reason: `Published: ${publishDate} - Extracted directly from PhilGEPS.`
        });
      }
    });

    if (scrapedBids.length === 0) {
      return NextResponse.json({ error: "No active bids found for this category today." }, { status: 404 });
    }

    return NextResponse.json({
      recommended_bids: scrapedBids
    });

  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: 'Failed to process PhilGEPS data.' }, { status: 500 });
  }
}