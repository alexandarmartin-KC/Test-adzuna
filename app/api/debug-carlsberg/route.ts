import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const careersUrl = 'https://careers.carlsberg.com/CarlsbergDK/search/?q=&locale=en_GB';
  const seenUrls = new Set<string>();
  const logs: string[] = [];
  
  const isPaginated = careersUrl.includes('careers.carlsberg.com');
  logs.push(`isPaginated: ${isPaginated}`);
  
  let startRow = 0;
  let hasMore = true;
  
  while (hasMore && startRow <= 30) {
    const pageUrl = isPaginated && startRow > 0
      ? `${careersUrl}&startrow=${startRow}`
      : careersUrl;
    
    logs.push(`Fetching: ${pageUrl}`);
    
    try {
      const resp = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (!resp.ok) {
        logs.push(`HTTP error: ${resp.status}`);
        break;
      }
      
      const html = await resp.text();
      logs.push(`HTML length: ${html.length}`);
      
      const beforeCount = seenUrls.size;
      
      // Test regex
      const altRegex = /class="jobTitle-link[^"]*"[^>]*href="(\/(?:[^"\/]+\/)?job\/[^"]+)"[^>]*>\s*([^<]+)/gi;
      let match;
      let matchCount = 0;
      
      while ((match = altRegex.exec(html)) !== null) {
        matchCount++;
        if (!seenUrls.has(match[1])) {
          seenUrls.add(match[1]);
        }
      }
      
      const newJobs = seenUrls.size - beforeCount;
      logs.push(`Matches: ${matchCount}, New unique: ${newJobs}, Total: ${seenUrls.size}`);
      
      if (newJobs === 0) {
        hasMore = false;
      } else {
        startRow += 10;
      }
    } catch (e) {
      logs.push(`Error: ${e}`);
      break;
    }
  }
  
  return NextResponse.json({
    totalJobs: seenUrls.size,
    jobs: Array.from(seenUrls).slice(0, 5),
    logs
  });
}
