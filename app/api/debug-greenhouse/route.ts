import { NextResponse } from "next/server";

export async function GET() {
  try {
    const boardId = "coreweaveu";
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=false`;
    
    console.log("Fetching from Greenhouse API:", apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        error: `Greenhouse API returned ${response.status}`,
        url: apiUrl
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    const jobs = data.jobs.map((job: any) => {
      const locationName = job.location?.name || 'Unknown';
      let jobCountry = 'Unknown';
      
      const locLower = locationName.toLowerCase();
      if (locLower.includes('denmark') || locLower.includes('danmark') || 
          locLower.includes('copenhagen') || locLower.includes('skovlunde')) {
        jobCountry = 'DK';
      } else if (locLower.includes('norway') || locLower.includes('norge') || 
                 locLower.includes('oslo') || locLower.includes('porsgrunn')) {
        jobCountry = 'NO';
      } else if (locLower.includes('sweden') || locLower.includes('stockholm')) {
        jobCountry = 'SE';
      } else if (locLower.includes('united kingdom') || locLower.includes('london') || 
                 locLower.includes('england')) {
        jobCountry = 'GB';
      }
      
      return {
        title: job.title,
        location: locationName,
        country: jobCountry,
        url: job.absolute_url
      };
    });
    
    const dkJobs = jobs.filter((j: any) => j.country === 'DK');
    
    return NextResponse.json({
      success: true,
      totalJobs: jobs.length,
      denmarkJobs: dkJobs.length,
      denmarkJobsList: dkJobs,
      timestamp: new Date().toISOString(),
      deploymentCheck: "Latest code is deployed if you see this"
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to fetch",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
