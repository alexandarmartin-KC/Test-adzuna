import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";

// This endpoint will show us exactly what happens when we try to crawl a specific company
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const companyName = params.get("company") || "CoreWeave Europe";
  
  const company = COMPANIES.find(c => c.name.toLowerCase() === companyName.toLowerCase());
  
  if (!company) {
    return NextResponse.json({
      error: "Company not found",
      availableCompanies: COMPANIES.map(c => c.name),
    }, { status: 404 });
  }
  
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };
  
  log(`========== DEBUG CRAWL: ${company.name} ==========`);
  log(`URL: ${company.careersUrl}`);
  log(`Default Country: ${company.country || 'Not set'}`);
  
  // Step 1: Detect platform
  const url = company.careersUrl.toLowerCase();
  let platform = "unknown";
  if (url.includes('.emply.com') || url.includes('career.emply')) platform = "emply";
  else if (url.includes('successfactors') || url.includes('jobs.sap.com') || url.includes('careers.novonordisk')) platform = "successfactors";
  else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse')) platform = "greenhouse";
  else if (url.includes('myworkdayjobs.com') || url.includes('.wd')) platform = "workday";
  else if (url.includes('lever.co') || url.includes('jobs.lever')) platform = "lever";
  
  log(`Platform detected: ${platform}`);
  
  // Step 2: Extract board ID for Greenhouse
  if (platform === "greenhouse") {
    const boardMatch = company.careersUrl.match(/greenhouse\.io\/([^\/\?]+)/);
    if (boardMatch) {
      const boardId = boardMatch[1];
      log(`Board ID extracted: ${boardId}`);
      
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=false`;
      log(`API URL: ${apiUrl}`);
      
      try {
        log(`Fetching from Greenhouse API...`);
        const response = await fetch(apiUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });
        
        log(`Response status: ${response.status}`);
        log(`Response OK: ${response.ok}`);
        
        if (response.ok) {
          const data = await response.json();
          log(`Response has 'jobs' array: ${!!data.jobs}`);
          log(`Total jobs in response: ${data.jobs?.length || 0}`);
          
          if (data.jobs && data.jobs.length > 0) {
            // Count by country
            const byCountry: Record<string, number> = {};
            data.jobs.forEach((job: any) => {
              const locationName = job.location?.name || 'Unknown';
              const locLower = locationName.toLowerCase();
              
              let jobCountry = 'Unknown';
              if (locLower.includes('denmark') || locLower.includes('danmark') || 
                  locLower.includes('copenhagen') || locLower.includes('skovlunde')) {
                jobCountry = 'DK';
              } else if (locLower.includes('united kingdom') || locLower.includes('london')) {
                jobCountry = 'GB';
              } else if (locLower.includes('ireland') || locLower.includes('dublin')) {
                jobCountry = 'IE';
              } else if (locLower.includes('poland') || locLower.includes('warsaw')) {
                jobCountry = 'PL';
              } else if (locLower.includes('spain') || locLower.includes('españa')) {
                jobCountry = 'ES';
              } else if (locLower.includes('sweden') || locLower.includes('stockholm')) {
                jobCountry = 'SE';
              } else if (locLower.includes('norway') || locLower.includes('oslo')) {
                jobCountry = 'NO';
              }
              
              byCountry[jobCountry] = (byCountry[jobCountry] || 0) + 1;
            });
            
            log(`Jobs by country: ${JSON.stringify(byCountry, null, 2)}`);
            
            // Sample jobs
            const sample = data.jobs.slice(0, 5).map((job: any) => ({
              title: job.title,
              location: job.location?.name,
              url: job.absolute_url
            }));
            log(`Sample jobs: ${JSON.stringify(sample, null, 2)}`);
          }
        } else {
          const text = await response.text();
          log(`Error response body: ${text.substring(0, 500)}`);
        }
      } catch (error) {
        log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      log(`ERROR: Could not extract board ID from URL`);
    }
  }
  
  log(`========================================`);
  
  return NextResponse.json({
    company: company.name,
    url: company.careersUrl,
    platform,
    logs,
  });
}
