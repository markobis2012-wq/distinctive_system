import * as cheerio from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      cache: 'no-store'
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Convert the entire webpage into a single clean string of text
    const fullText = $('body').text().replace(/\s+/g, ' ');

    // Helper function that captures data up to the next specified keyword
    const regexExtract = (regex: RegExp) => {
      const match = fullText.match(regex);
      return match ? match[1].trim() : '';
    };

    // Extract text fields using flexible Regex stop-words
    const procuring_entity = regexExtract(/Procuring Entity\s+(.*?)\s+(?:Title|Printable Version)/i);
    const area_of_delivery = regexExtract(/Area of Delivery\s+(.*?)\s+(?:Printable Version|Status)/i);
    const solicitation_no = regexExtract(/Solicitation Number:\s*(.*?)\s+(?:Trade Agreement|Procurement Mode):/i);
    const procurement_mode = regexExtract(/Procurement Mode:\s*(.*?)\s+(?:Classification|Category):/i);
    const classification = regexExtract(/Classification:\s*(.*?)\s+(?:Category|Approved Budget):/i);
    
    // NEW: Trade Agreement and Delivery Period
    const trade_agreement = regexExtract(/Trade Agreement:\s*(.*?)\s+(?:Procurement Mode|Classification|Category):/i);
    const delivery_period = regexExtract(/Delivery Period:\s*(.*?)\s+(?:Client Agency|Contact Person|Funding Source):/i);
    
    const budgetMatch = fullText.match(/Approved Budget for the Contract:\s*(?:PHP)?\s*([\d,.]+)/i);
    const approved_budget = budgetMatch ? parseFloat(budgetMatch[1].replace(/[^0-9.]/g, '')) : 0;

    // Contact Person restored and safeguarded
    let contact_person = regexExtract(/Contact Person:\s*(.*?)\s+(?:Created By|Date Created|Status|Phone|Email|Fax)/i);
    if (contact_person.length > 35) {
      contact_person = contact_person.split(/(BAC|Provincial|City|Municipality|Department|Room|Bldg|Brgy|OIC|Member|Chairman)/i)[0].trim();
    }

    // Custom Date Parser
    const parseDate = (str: string, includeTime: boolean) => {
      if (!str) return '';
      const dateMatch = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!dateMatch) return '';
      
      const [_, day, month, year] = dateMatch;
      const ymd = `${year}-${month}-${day}`; 

      if (!includeTime) return ymd;

      const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const mins = timeMatch[2];
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const hh = hours.toString().padStart(2, '0');
        return `${ymd}T${hh}:${mins}`; 
      }
      return `${ymd}T00:00`;
    };

    const date_published = parseDate(regexExtract(/Date Published\s+(\d{2}\/\d{2}\/\d{4})/i), false);
    const closing_date_time = parseDate(regexExtract(/Closing Date \/ Time\s+(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s*[AM|PM]+)/i), true);
    
    const prebidSection = fullText.split('Pre-bid Conference')[1] || '';
    const prebidDateMatch = prebidSection.match(/\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AM|PM]+/i);
    const pre_bid_datetime = prebidDateMatch ? parseDate(prebidDateMatch[0], true) : '';

    return NextResponse.json({
      solicitation_no,
      approved_budget,
      date_published,
      closing_date_time,
      pre_bid_datetime,
      contact_person,
      procuring_entity_text: procuring_entity,
      area_of_delivery,
      classification,
      procurement_mode,
      trade_agreement,
      delivery_period
    });

  } catch (error: any) {
    console.error("Deep scrape error:", error);
    return NextResponse.json({ error: 'Failed to extract deep details.' }, { status: 500 });
  }
}