import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Job data model
interface Job {
  title: string;
  company: "Orsted" | "Canon" | string;
  country: string;
  location: string;
  department?: string;
  url: string;
}

// In-memory cache for crawled jobs
let cachedJobs: Job[] | null = null;
let cacheTimestamp: number | null = null;

// URLs to crawl
const CRAWL_URLS = [
  "https://orsted.com/en/careers/vacancies-list",
  "https://www.canon.dk/careers/",
  "https://www.canon.no/careers/",
  "https://www.canon.se/careers/",
];

// Firecrawl extraction schema (JSON Schema draft-07 compatible)
const EXTRACTION_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          country: { type: "string" },
          location: { type: "string" },
          department: { type: "string" },
          url: { type: "string" }
        },
        required: ["title", "company", "url"],
        additionalProperties: false
      }
    }
  },
  required: ["jobs"],
  additionalProperties: false
};

// Extraction prompt
const EXTRACTION_PROMPT = `You are extracting ONLY ACTIVE/OPEN job postings from Ørsted and Canon career pages. 

For each ACTIVE job listing visible on the page:
- title: the exact job title/position name
- department: department or team if mentioned
- location: city/office location
- country: infer from location or domain (.dk = Denmark, .se = Sweden, .no = Norway)
- company: "Orsted" for orsted.com, "Canon" for canon sites
- url: Extract the unique identifier or path from the job's link (e.g., "job/12345" or the job ID). If you can see a full URL to the specific job posting, use that. DO NOT use placeholder URLs like example.com. If you cannot find a valid URL, use the job ID or a descriptive identifier.

IMPORTANT: 
- Only include jobs that are clearly marked as active/open
- Skip expired, closed, or filled positions
- Each job must have a real, unique identifier

Return a JSON object with a "jobs" array.`;

/**
 * Crawl jobs from Firecrawl API (one-time operation)
 */
async function crawlJobs(): Promise<Job[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const allJobs: Job[] = [];

  // Process each URL
  for (const url of CRAWL_URLS) {
    try {
      console.log(`Crawling ${url}...`);
      
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: url,
          formats: ["extract", "links"],
          extract: {
            prompt: EXTRACTION_PROMPT,
            schema: EXTRACTION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        console.error(`Failed to crawl ${url}: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`Response from ${url}:`, JSON.stringify(data, null, 2));
      
      // Extract jobs from response (Firecrawl v1/scrape format)
      if (data.success && data.data && data.data.extract && data.data.extract.jobs) {
        // Get links from the page to help construct proper URLs
        const pageLinks = data.data.links || [];
        
        const jobs = data.data.extract.jobs
          .map((job: any) => {
            let jobUrl = job.url || url;
            
            // Try to find a matching link from the page if URL looks invalid
            if (!jobUrl || jobUrl.includes('example.com') || !jobUrl.startsWith('http')) {
              // Look for links that might match this job
              const jobId = job.url || job.title;
              const matchingLink = pageLinks.find((link: string) => 
                link.toLowerCase().includes('job') || 
                link.toLowerCase().includes('vacanc') ||
                link.toLowerCase().includes('career')
              );
              
              if (matchingLink && matchingLink.startsWith('http')) {
                jobUrl = matchingLink;
              } else if (jobId && !jobId.includes('example.com')) {
                // Construct URL from base and job ID
                const baseUrl = new URL(url);
                jobUrl = `${baseUrl.origin}${jobId.startsWith('/') ? jobId : '/' + jobId}`;
              }
            }
            
            return {
              title: job.title || "Unknown Title",
              company: normalizeCompany(job.company || url),
              country: normalizeCountry(job.country || job.location || url),
              location: job.location || "Not specified",
              department: job.department,
              url: jobUrl,
            };
          })
          // Filter out jobs with invalid URLs
          .filter((job: Job) => 
            job.url && 
            !job.url.includes('example.com') && 
            job.url.startsWith('http')
          );
        
        allJobs.push(...jobs);
      }
      
      console.log(`Successfully crawled ${url}, found ${allJobs.length} jobs so far`);
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  return allJobs;
}

/**
 * Normalize company name from domain or extracted data
 */
function normalizeCompany(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("orsted") || lower.includes("ørsted")) {
    return "Orsted";
  }
  if (lower.includes("canon")) {
    return "Canon";
  }
  return input;
}

/**
 * Normalize country code
 */
function normalizeCountry(input: string): string {
  const lower = input.toLowerCase();
  
  // Check for country codes
  if (lower.includes(".dk") || lower.includes("denmark") || lower === "dk") {
    return "DK";
  }
  if (lower.includes(".se") || lower.includes("sweden") || lower === "se") {
    return "SE";
  }
  if (lower.includes(".no") || lower.includes("norway") || lower === "no") {
    return "NO";
  }
  
  // Return uppercase version if it's already a code
  if (input.length <= 3) {
    return input.toUpperCase();
  }
  
  return input;
}

/**
 * Filter jobs based on query parameters
 */
function filterJobs(jobs: Job[], filters: {
  company?: string;
  country?: string;
  q?: string;
}): Job[] {
  return jobs.filter(job => {
    // Company filter
    if (filters.company) {
      const companyMatch = job.company.toLowerCase() === filters.company.toLowerCase();
      if (!companyMatch) return false;
    }

    // Country filter
    if (filters.country) {
      const countryMatch = job.country.toLowerCase() === filters.country.toLowerCase();
      if (!countryMatch) return false;
    }

    // Text search filter (title or location)
    if (filters.q) {
      const searchLower = filters.q.toLowerCase();
      const titleMatch = job.title.toLowerCase().includes(searchLower);
      const locationMatch = job.location.toLowerCase().includes(searchLower);
      if (!titleMatch && !locationMatch) return false;
    }

    return true;
  });
}

/**
 * GET /api/firecrawl/jobs
 * Fetch crawled job listings with optional filters
 * Query parameters:
 * - company: "orsted" | "canon" (optional)
 * - country: "dk" | "se" | "no" (optional)
 * - q: free text search (optional)
 * - recrawl: force a new crawl (optional, for testing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company = searchParams.get("company") || undefined;
    const country = searchParams.get("country") || undefined;
    const q = searchParams.get("q") || undefined;
    const recrawl = searchParams.get("recrawl") === "true";

    // Check if we need to crawl
    if (!cachedJobs || recrawl) {
      console.log("Initiating Firecrawl job crawl...");
      cachedJobs = await crawlJobs();
      cacheTimestamp = Date.now();
      console.log(`Crawl complete. Total jobs cached: ${cachedJobs.length}`);
    }

    // Filter jobs based on query parameters
    const filteredJobs = filterJobs(cachedJobs, {
      company,
      country,
      q,
    });

    return NextResponse.json({
      jobs: filteredJobs,
      total: filteredJobs.length,
      cached: !recrawl,
      cacheTimestamp: cacheTimestamp,
    });

  } catch (error) {
    console.error("Error in /api/firecrawl/jobs:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch jobs",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
