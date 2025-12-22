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
// Company configuration - just need base domain and country
interface CompanyConfig {
  name: "Orsted" | "Canon" | string;
  domain: string;
  country?: string;
  careersPath?: string; // Optional: if we know the careers path
}

const COMPANIES: CompanyConfig[] = [
  { 
    name: "Orsted", 
    domain: "https://orsted.com",
    careersPath: "/en/careers/vacancies-list"
  },
  { 
    name: "Novo Nordisk", 
    domain: "https://www.novonordisk.com"
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.dk",
    country: "DK"
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.no",
    country: "NO"
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.se",
    country: "SE"
  },
];

let cachedJobs: Job[] | null = null;
let cacheTimestamp: number | null = null;

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
const EXTRACTION_PROMPT = `Extract ALL currently ACTIVE/OPEN job postings from this Ørsted or Canon career page. 

For each active job listing you can see:
- title: the exact job title/position name (REQUIRED)
- department: department or team if visible
- location: city/office location if specified
- country: Denmark for .dk, Sweden for .se, Norway for .no
- company: "Orsted" for orsted.com, "Canon" for canon sites
- url: if you can see a direct link to this specific job, include it. Otherwise leave blank or use a job ID if visible.

IMPORTANT: 
- Include ALL active job postings you can find on the page
- Only skip jobs that are explicitly marked as closed/filled/expired
- Job title is required for each entry
- It's OK if URL is not available - we'll link to the main careers page

Return a JSON object with a "jobs" array containing all active positions.`;

/**
 * Discover the careers page URL for a company
 */
async function discoverCareersPage(company: CompanyConfig, apiKey: string): Promise<string | null> {
  // If we already have a careers path, use it
  if (company.careersPath) {
    return `${company.domain}${company.careersPath}`;
  }

  // Try common careers page patterns first
  const commonPaths = [
    '/careers/find-a-job/career-search-results.html',
    '/careers/job-search',
    '/careers/jobs',
    '/careers/search',
    '/jobs/search',
    '/careers',
    '/careers/',
    '/jobs',
    '/jobs/',
    '/career',
    '/career/',
    '/work-with-us',
    '/about/careers',
    '/company/careers',
  ];

  console.log(`Attempting to discover careers page for ${company.name} at ${company.domain}`);
  
  const candidateUrls: string[] = [];
  
  // Use Firecrawl to map the site and find careers pages
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: company.domain,
        search: "careers jobs vacancies positions opportunities employment",
        limit: 30,
      }),
    });

    if (response.ok) {
      try {
        const data = await response.json();
        if (data.success && data.links && data.links.length > 0) {
          // Collect all relevant career links
          const careersLinks = data.links.filter((link: string) => {
            const lower = link.toLowerCase();
            return (lower.includes('career') || 
                    lower.includes('job') || 
                    lower.includes('vacan') ||
                    lower.includes('position') ||
                    lower.includes('opening')) &&
                   !lower.includes('blog') &&
                   !lower.includes('news') &&
                   !lower.includes('article');
          });
          
          candidateUrls.push(...careersLinks);
          console.log(`Found ${careersLinks.length} candidate URLs from map`);
        }
      } catch (jsonError) {
        console.error(`Failed to parse map response for ${company.name}`);
      }
    } else {
      console.log(`Map request failed with status ${response.status} for ${company.name}`);
    }
  } catch (error) {
    console.error(`Error mapping site for ${company.name}:`, error instanceof Error ? error.message : 'Unknown error');
  }

  // Add common paths as candidates
  for (const path of commonPaths) {
    candidateUrls.push(`${company.domain}${path}`);
  }

  // If we have a country, try country-specific URLs
  if (company.country) {
    candidateUrls.push(
      `${company.domain}/careers/find-a-job/career-search-results.html?countries=${company.country}`,
      `${company.domain}/careers/jobs?country=${company.country}`,
      `${company.domain}/careers?location=${company.country}`,
      `${company.domain}/jobs?country=${company.country}`
    );
  }

  // Test each candidate URL by doing a quick scrape to count jobs
  console.log(`Testing ${candidateUrls.length} candidate URLs for ${company.name}...`);
  let bestUrl = company.domain;
  let maxJobs = 0;

  for (const testUrl of candidateUrls.slice(0, 10)) { // Limit testing to first 10
    try {
      const testResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: testUrl,
          formats: ["extract"],
          extract: {
            prompt: EXTRACTION_PROMPT,
            schema: EXTRACTION_SCHEMA,
          },
        }),
      });

      if (testResponse.ok) {
        try {
          const testData = await testResponse.json();
          const jobCount = testData?.data?.extract?.jobs?.length || 0;
          
          console.log(`  ${testUrl}: ${jobCount} jobs found`);
          
          if (jobCount > maxJobs) {
            maxJobs = jobCount;
            bestUrl = testUrl;
          }
          
          // If we found a page with many jobs, use it immediately
          if (jobCount >= 20) {
            console.log(`Found excellent careers page with ${jobCount} jobs: ${bestUrl}`);
            return bestUrl;
          }
        } catch (jsonError) {
          console.error(`  ${testUrl}: Failed to parse response`);
        }
      } else {
        console.log(`  ${testUrl}: HTTP ${testResponse.status}`);
      }
    } catch (error) {
      console.error(`  ${testUrl}: ${error instanceof Error ? error.message : 'Failed'}`);
      // Continue to next URL
    }
  }

  if (maxJobs > 0) {
    console.log(`Best careers page found with ${maxJobs} jobs: ${bestUrl}`);
    return bestUrl;
  }

  console.warn(`Could not find careers page with jobs for ${company.name}, using domain: ${company.domain}`);
  return company.domain;
}

/**
 * Crawl jobs from Firecrawl API (one-time operation)
 */
async function crawlJobs(): Promise<Job[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const allJobs: Job[] = [];

  // Process each company
  for (const company of COMPANIES) {
    let careersUrl: string | null = null;
    
    try {
      console.log(`Processing ${company.name} (${company.domain})...`);
      
      // Discover the careers page
      careersUrl = await discoverCareersPage(company, apiKey);
      
      if (!careersUrl) {
        console.error(`Could not find careers page for ${company.name}`);
        continue;
      }

      console.log(`Crawling ${careersUrl}...`);
      
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: careersUrl,
          formats: ["extract", "links"],
          extract: {
            prompt: EXTRACTION_PROMPT,
            schema: EXTRACTION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        console.error(`Failed to crawl ${careersUrl}: ${response.status} ${response.statusText}`);
        try {
          const errorText = await response.text();
          console.error(`Error details: ${errorText}`);
        } catch (e) {
          console.error(`Could not read error response`);
        }
        continue;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(`Failed to parse JSON response from ${careersUrl}`);
        const text = await response.text();
        console.error(`Response was: ${text.substring(0, 200)}...`);
        continue;
      }
      
      console.log(`Response from ${careersUrl}:`, JSON.stringify(data, null, 2));
      
      // Extract jobs from response (Firecrawl v1/scrape format)
      if (data.success && data.data && data.data.extract && data.data.extract.jobs) {
        // Get links from the page to help construct proper URLs
        const pageLinks = data.data.links || [];
        
        const jobs = data.data.extract.jobs
          .map((job: any) => {
            let jobUrl = careersUrl; // Default to the main careers page
            
            // Try to get a specific job URL if provided and valid
            if (job.url && job.url.startsWith('http') && !job.url.includes('example.com')) {
              // Check if it's a job-specific link (contains job ID or similar)
              const urlLower = job.url.toLowerCase();
              if (urlLower.includes('/job/') || 
                  urlLower.includes('jobid') || 
                  urlLower.includes('vacancy') ||
                  urlLower.includes('position')) {
                jobUrl = job.url;
              }
            }
            
            // If still using base URL, try to find a specific job link from page links
            if (jobUrl === careersUrl && pageLinks.length > 0) {
              // Look for job-specific links that aren't just the base careers page
              const specificLink = pageLinks.find((link: string) => {
                const linkLower = link.toLowerCase();
                return link.startsWith('http') && 
                       link !== careersUrl &&
                       (linkLower.includes('/job/') || 
                        linkLower.includes('jobid') || 
                        linkLower.includes('vacancy') ||
                        linkLower.includes('position') ||
                        linkLower.includes('openings'));
              });
              
              if (specificLink) {
                jobUrl = specificLink;
              }
            }
            
            return {
              title: job.title || "Unknown Title",
              company: company.name,
              country: company.country || normalizeCountry(job.country || job.location || careersUrl),
              location: job.location || "Not specified",
              department: job.department,
              url: jobUrl,
            };
          })
          // Only filter out completely invalid entries
          .filter((job: Job) => 
            job.title && 
            job.title !== "Unknown Title" &&
            job.url && 
            job.url.startsWith('http')
          );
        
        allJobs.push(...jobs);
      }
      
      console.log(`Successfully crawled ${careersUrl}, found ${allJobs.length} jobs so far`);
    } catch (error) {
      console.error(`Error crawling ${company.name} (${careersUrl}):`, error);
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
