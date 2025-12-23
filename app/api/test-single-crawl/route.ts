import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";

// Test crawling a single company with full logging
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
  
  try {
    log(`========== SINGLE COMPANY CRAWL TEST ==========`);
    log(`Company: ${company.name}`);
    log(`URL: ${company.careersUrl}`);
    log(`Default Country: ${company.country || 'Not set'}`);
    
    // Import and run the actual crawl function
    const url = company.careersUrl.toLowerCase();
    let platform = "unknown";
    if (url.includes('.emply.com') || url.includes('career.emply')) platform = "emply";
    else if (url.includes('successfactors') || url.includes('jobs.sap.com') || url.includes('careers.novonordisk')) platform = "successfactors";
    else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse')) platform = "greenhouse";
    else if (url.includes('myworkdayjobs.com') || url.includes('.wd')) platform = "workday";
    else if (url.includes('lever.co') || url.includes('jobs.lever')) platform = "lever";
    
    log(`Platform detected: ${platform}`);
    
    if (platform === "greenhouse") {
      log(`Calling Greenhouse scraper...`);
      
      const boardMatch = company.careersUrl.match(/greenhouse\.io\/([^\/\?]+)/);
      if (!boardMatch) {
        log(`ERROR: Could not extract board ID`);
        return NextResponse.json({ logs, error: "No board ID" });
      }
      
      const boardId = boardMatch[1];
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=false`;
      log(`API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      
      log(`Response status: ${response.status}`);
      log(`Response OK: ${response.ok}`);
      
      if (response.ok) {
        const data = await response.json();
        log(`Jobs array exists: ${!!data.jobs}`);
        log(`Jobs count: ${data.jobs?.length || 0}`);
        
        if (data.jobs && data.jobs.length > 0) {
          const mapped = data.jobs.map((job: any) => {
            const locationName = job.location?.name || 'Unknown';
            const locLower = locationName.toLowerCase();
            
            let jobCountry = 'Unknown';
            if (locLower.includes('denmark') || locLower.includes('danmark') || 
                locLower.includes('copenhagen') || locLower.includes('skovlunde')) {
              jobCountry = 'DK';
            }
            
            return {
              title: job.title || 'Unknown',
              company: company.name,
              country: jobCountry,
              location: locationName,
              department: job.departments && job.departments.length > 0 ? job.departments[0].name : undefined,
              url: job.absolute_url || `https://boards.greenhouse.io/embed/job_app?token=${job.id}`
            };
          });
          
          log(`Mapped ${mapped.length} jobs successfully`);
          log(`Sample: ${JSON.stringify(mapped[0])}`);
          
          return NextResponse.json({
            success: true,
            logs,
            jobCount: mapped.length,
            sampleJobs: mapped.slice(0, 3),
          });
        }
      } else {
        const text = await response.text();
        log(`Error response: ${text.substring(0, 200)}`);
      }
    }
    
    return NextResponse.json({ logs });
    
  } catch (error) {
    log(`EXCEPTION: ${error instanceof Error ? error.message : String(error)}`);
    log(`Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
    return NextResponse.json({ logs, error: String(error) }, { status: 500 });
  }
}
