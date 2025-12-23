import { NextResponse } from "next/server";

// This endpoint dumps the ACTUAL cache contents to help debug
// Import from the main route to access the cache
// Since we can't directly access the cache, let's create a test

export async function GET() {
  // Call the main jobs endpoint and analyze the response
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/firecrawl/jobs`);
    const data = await response.json();
    
    // Group jobs by company
    const byCompany: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const companies = new Set<string>();
    
    if (data.jobs && Array.isArray(data.jobs)) {
      data.jobs.forEach((job: any) => {
        companies.add(job.company);
        byCompany[job.company] = (byCompany[job.company] || 0) + 1;
        byCountry[job.country] = (byCountry[job.country] || 0) + 1;
      });
    }
    
    return NextResponse.json({
      totalJobs: data.jobs?.length || 0,
      cached: data.cached,
      cacheTimestamp: data.cacheTimestamp,
      companiesFound: Array.from(companies).sort(),
      jobsByCompany: byCompany,
      jobsByCountry: byCountry,
      coreweaveEuropeJobs: data.jobs?.filter((j: any) => 
        j.company.toLowerCase().includes('coreweave') && 
        j.company.toLowerCase().includes('europe')
      ) || [],
      allCoreweaveJobs: data.jobs?.filter((j: any) => 
        j.company.toLowerCase().includes('coreweave')
      ) || [],
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      note: "Could not fetch from main endpoint"
    }, { status: 500 });
  }
}
