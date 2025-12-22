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
  maxPages?: number; // Optional: max pages to crawl for pagination (default: 1)
  // scrapeMethod is auto-detected if not specified:
  // - "direct": Direct HTML scraping (free, no credits)
  // - "firecrawl": Use Firecrawl API (uses credits, handles JS)
  // - "auto": Auto-detect best method (default)
  scrapeMethod?: "direct" | "firecrawl" | "auto";
}

const COMPANIES: CompanyConfig[] = [
  { 
    name: "Orsted", 
    domain: "https://orsted.com",
    careersPath: "/en/careers/vacancies-list",
    scrapeMethod: "firecrawl" // Azure WAF blocks direct scraping - must use Firecrawl
  },
  { 
    name: "Novo Nordisk", 
    domain: "https://careers.novonordisk.com",
    careersPath: "/search/?q=&locationsearch=denmark",
    country: "DK"
    // scrapeMethod: "auto" - will detect that direct scraping works
  },
  { 
    name: "Matas",
    domain: "https://matas.career.emply.com",
    careersPath: "/ledige-stillinger",
    country: "DK",
    scrapeMethod: "firecrawl" // Emply platform uses JS to load jobs
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.dk",
    country: "DK",
    careersPath: "/careers/"
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.no",
    country: "NO",
    careersPath: "/careers/"
  },
  { 
    name: "Canon", 
    domain: "https://www.canon.se",
    country: "SE",
    careersPath: "/careers/"
  },
];

let cachedJobs: Job[] | null = null;
let cacheTimestamp: number | null = null;

// Firecrawl extraction schema (JSON Schema draft-07 compatible)
// Made flexible to allow Firecrawl to extract what it can find
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
        required: ["title"] // Only title is required - be flexible
      }
    }
  },
  required: ["jobs"]
};

// Extraction prompt - keep it simple for better performance
const EXTRACTION_PROMPT = `Extract ALL job postings from this careers page.

For each job, extract:
- title: job title (REQUIRED)
- location: city or office location
- country: country code or name
- department: department if visible
- url: link to job posting if available

Extract ALL jobs visible on the page, not just the first 10.`;


/**
 * Auto-detect the best scraping method for a company
 * Returns "direct" if HTML contains job data, "firecrawl" if JS-heavy or blocked
 */
async function detectScrapeMethod(company: CompanyConfig): Promise<"direct" | "firecrawl"> {
  const url = `${company.domain}${company.careersPath || ''}`;
  console.log(`Auto-detecting scrape method for ${company.name}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.log(`  ${company.name}: HTTP ${response.status} - needs Firecrawl`);
      return "firecrawl";
    }
    
    const html = await response.text();
    
    // Check 1: Is HTML too small? (likely a JS shell page)
    if (html.length < 15000) {
      console.log(`  ${company.name}: Small HTML (${html.length} bytes) - likely JS-heavy, needs Firecrawl`);
      return "firecrawl";
    }
    
    // Check 2: Does it contain WAF/bot protection?
    const wafPatterns = ['Azure WAF', 'challenge.js', 'captcha', 'cf-browser-verification', 'blocked'];
    for (const pattern of wafPatterns) {
      if (html.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`  ${company.name}: WAF/bot protection detected - needs Firecrawl`);
        return "firecrawl";
      }
    }
    
    // Check 3: Count job-related patterns in HTML
    const jobPatterns = [
      /jobTitle|job-title|jobtitle/gi,
      /class="[^"]*job[^"]*"/gi,
      /href="[^"]*\/job\/[^"]*"/gi,
      /vacancy|vacanc/gi,
      /position|opening/gi,
      /<tr[^>]*>.*?<\/tr>/gi, // Table rows (common in job listings)
    ];
    
    let jobIndicators = 0;
    for (const pattern of jobPatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 5) {
        jobIndicators++;
      }
    }
    
    // Check 4: Look for specific job link patterns
    const jobLinks = html.match(/href="[^"]*\/job[s]?\/[^"]*"/gi) || [];
    const uniqueJobLinks = new Set(jobLinks).size;
    
    console.log(`  ${company.name}: HTML size=${html.length}, job indicators=${jobIndicators}, unique job links=${uniqueJobLinks}`);
    
    // Decision: Use direct if we found job data in HTML
    if (uniqueJobLinks >= 3 || jobIndicators >= 2) {
      console.log(`  ${company.name}: ✅ Direct scraping possible (found jobs in HTML)`);
      return "direct";
    }
    
    console.log(`  ${company.name}: ❌ No job data in HTML - needs Firecrawl`);
    return "firecrawl";
    
  } catch (error) {
    console.log(`  ${company.name}: Fetch failed - needs Firecrawl`);
    return "firecrawl";
  }
}


/**
 * Generic direct HTML scraping - tries multiple patterns
 * Works for SuccessFactors, Greenhouse, Lever, and similar platforms
 */
async function scrapeJobsDirectly(company: CompanyConfig): Promise<Job[]> {
  const url = `${company.domain}${company.careersPath || ''}`;
  console.log(`Direct scraping ${company.name} from ${url}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const jobs: Job[] = [];
    
    // Try multiple extraction patterns
    
    // Pattern 1: SuccessFactors style
    // <a href="/job/Location-Title/123456/" class="jobTitle-link">Title</a>
    const successFactorsRegex = /href="(\/job\/[^"]+)"[^>]*class="jobTitle-link"[^>]*>([^<]+)<\/a>/g;
    let match;
    const seenUrls = new Set<string>();
    
    while ((match = successFactorsRegex.exec(html)) !== null) {
      const jobPath = match[1];
      const title = match[2].trim();
      if (!seenUrls.has(jobPath)) {
        seenUrls.add(jobPath);
        jobs.push({
          title,
          company: company.name,
          country: company.country || 'DK',
          location: extractLocationFromPath(jobPath) || 'Denmark',
          url: `${company.domain}${jobPath}`,
        });
      }
    }
    
    // Pattern 2: Greenhouse style
    // <a data-mapped="true" href="/jobs/123456">Title</a>
    if (jobs.length === 0) {
      const greenhouseRegex = /href="(\/jobs?\/\d+[^"]*)"[^>]*>([^<]+)<\/a>/g;
      while ((match = greenhouseRegex.exec(html)) !== null) {
        const jobPath = match[1];
        const title = match[2].trim();
        if (!seenUrls.has(jobPath) && title.length > 3 && !title.includes('<')) {
          seenUrls.add(jobPath);
          jobs.push({
            title,
            company: company.name,
            country: company.country || 'DK',
            location: 'See job posting',
            url: `${company.domain}${jobPath}`,
          });
        }
      }
    }
    
    // Pattern 3: Generic link with job in URL
    if (jobs.length === 0) {
      const genericRegex = /href="([^"]*\/(?:job|career|position|vacancy)[s]?\/[^"]+)"[^>]*>([^<]{5,100})<\/a>/gi;
      while ((match = genericRegex.exec(html)) !== null) {
        const jobPath = match[1];
        const title = match[2].trim();
        const fullUrl = jobPath.startsWith('http') ? jobPath : `${company.domain}${jobPath}`;
        if (!seenUrls.has(fullUrl) && title.length > 3) {
          seenUrls.add(fullUrl);
          jobs.push({
            title,
            company: company.name,
            country: company.country || 'DK',
            location: 'See job posting',
            url: fullUrl,
          });
        }
      }
    }
    
    // Extract locations from SuccessFactors pages
    if (jobs.length > 0 && html.includes('jobLocation')) {
      const locationRegex = /<span class="jobLocation">\s*([^<]+)\s*<\/span>/g;
      const locations: string[] = [];
      while ((match = locationRegex.exec(html)) !== null) {
        const location = match[1].trim();
        if (location && location.length > 2) {
          locations.push(location);
        }
      }
      // Match locations to jobs
      jobs.forEach((job, i) => {
        if (locations[i]) {
          job.location = locations[i];
        }
      });
    }
    
    console.log(`Direct scrape found ${jobs.length} jobs for ${company.name}`);
    return jobs;
    
  } catch (error) {
    console.error(`Error scraping ${company.name}:`, error);
    return [];
  }
}

/**
 * Extract location from SuccessFactors URL path
 */
function extractLocationFromPath(path: string): string | null {
  // /job/Hillerød-Environmental-Monitoring-Supporter-Capi/1271111601/
  const decoded = decodeURIComponent(path);
  const parts = decoded.split('/').filter(p => p && p !== 'job');
  if (parts.length > 0) {
    const firstPart = parts[0].split('-')[0];
    if (firstPart && firstPart.length > 2) {
      return firstPart;
    }
  }
  return null;
}


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
  
  // DISABLED: Map API uses credits - uncomment only if needed
  /*
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
  */
  
  // Use common paths without expensive map API call
  console.log(`Using common career page patterns to save credits`);

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
  // IMPORTANT: This uses Firecrawl credits! Only test top 3 candidates to save costs
  console.log(`Testing up to 3 candidate URLs for ${company.name} (to save credits)...`);
  let bestUrl = company.domain;
  let maxJobs = 0;

  for (const testUrl of candidateUrls.slice(0, 3)) { // Only test first 3 to save credits
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
          
          // If we found a page with jobs, use it immediately to save credits
          if (jobCount >= 5) {
            console.log(`Found careers page with ${jobCount} jobs: ${bestUrl} - stopping search to save credits`);
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
    try {
      console.log(`\n========================================`);
      console.log(`Processing ${company.name} (${company.domain})...`);
      
      // Determine scraping method
      let method = company.scrapeMethod || "auto";
      
      if (method === "auto") {
        // Auto-detect the best method
        method = await detectScrapeMethod(company);
        console.log(`Auto-detected method for ${company.name}: ${method}`);
      }
      
      if (method === "direct") {
        // Use direct HTML scraping (FREE - no Firecrawl credits!)
        console.log(`Using direct HTML scraping for ${company.name} (no Firecrawl credits used)`);
        const directJobs = await scrapeJobsDirectly(company);
        allJobs.push(...directJobs);
        console.log(`✅ Successfully scraped ${company.name}, found ${directJobs.length} jobs (FREE)`);
        continue;
      }
      
      // Use Firecrawl (uses credits)
      console.log(`Using Firecrawl for ${company.name} (uses credits)`);
      let careersUrl: string | null = null;
      
      // Discover the careers page
      careersUrl = await discoverCareersPage(company, apiKey);
      
      if (!careersUrl) {
        console.error(`Could not find careers page for ${company.name}`);
        continue;
      }

      console.log(`Crawling ${careersUrl}...`);
      console.log(`Max pages configured: ${company.maxPages || 1}`);
      
      const maxPages = company.maxPages || 1;
      const companyJobs: Job[] = [];
      
      // Crawl multiple pages if configured
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let pageUrl = careersUrl;
        
        // Add page parameter if not first page
        if (pageNum > 1) {
          const url = new URL(careersUrl);
          // Try different pagination patterns
          url.searchParams.set('page', pageNum.toString());
          url.searchParams.set('pageNumber', pageNum.toString());
          url.searchParams.set('p', pageNum.toString());
          pageUrl = url.toString();
        }
        
        console.log(`  Crawling page ${pageNum}/${maxPages}: ${pageUrl}`);
      
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ["extract", "links"],
            extract: {
              prompt: EXTRACTION_PROMPT,
              schema: EXTRACTION_SCHEMA,
            },
            waitFor: 5000,  // Wait for JS to render
            timeout: 90000, // 90 second timeout for large pages
          }),
        });

        if (!response.ok) {
          console.error(`Failed to crawl ${pageUrl}: ${response.status} ${response.statusText}`);
          try {
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
          } catch (e) {
            console.error(`Could not read error response`);
          }
          // Stop pagination on error
          break;
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error(`Failed to parse JSON response from ${pageUrl}`);
          const text = await response.text();
          console.error(`Response was: ${text.substring(0, 200)}...`);
          // Stop pagination on parse error
          break;
        }
        
        console.log(`Response from ${pageUrl}: Found ${data?.data?.extract?.jobs?.length || 0} jobs`);
        
        // Extract jobs from response (Firecrawl v1/scrape format)
        if (data.success && data.data && data.data.extract && data.data.extract.jobs) {
          // Get links from the page to help construct proper URLs
          const pageLinks: string[] = data.data.links || [];
          
          // Helper to convert title to URL slug for matching
          const titleToSlug = (title: string): string => {
            return title
              .toLowerCase()
              .replace(/[æ]/g, 'ae')
              .replace(/[ø]/g, 'oe')
              .replace(/[å]/g, 'aa')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
          };
          
          // Helper to check if a URL is a job-specific link
          const isJobLink = (url: string): boolean => {
            const lower = url.toLowerCase();
            return (
              lower.includes('/job/') ||
              lower.includes('/jobs/') ||
              lower.includes('jobid') ||
              lower.includes('/vacancy') ||
              lower.includes('/vacancies-list/20') || // Ørsted format: /vacancies-list/YYYY/MM/ID
              lower.includes('/position') ||
              lower.includes('/career/') ||
              lower.includes('/ad/') || // Emply platform format: /ad/job-title/id
              /\/\d{4,}[-/]/.test(lower) || // Job ID pattern like /12345- or /2025/
              /\/[a-z0-9]{5,8}$/.test(lower) // Short ID at end like /u38f2a (Emply)
            );
          };
          
          // Filter page links to only job-specific links
          const jobLinks = pageLinks.filter((link: string) => 
            link.startsWith('http') && 
            link !== careersUrl &&
            isJobLink(link)
          );
          
          console.log(`  Found ${jobLinks.length} job links on page`);
          
          const pageJobs = data.data.extract.jobs
          .map((job: any) => {
            let jobUrl = careersUrl; // Default to the main careers page
            
            // 1. First, try the URL from extraction if it's valid
            if (job.url && job.url.startsWith('http') && !job.url.includes('example.com')) {
              if (isJobLink(job.url)) {
                jobUrl = job.url;
              }
            }
            
            // 2. If still using base URL, match job title to links
            if (jobUrl === careersUrl && jobLinks.length > 0 && job.title) {
              const titleSlug = titleToSlug(job.title);
              const titleWords = titleSlug.split('-').filter(w => w.length > 2);
              
              // Find a link that best matches the job title
              // Score each link by how many title words it contains
              let bestMatch: { link: string; score: number } | null = null;
              
              for (const link of jobLinks) {
                const linkSlug = link.toLowerCase().split('/').pop() || '';
                
                // Exact match is best
                if (linkSlug.includes(titleSlug)) {
                  bestMatch = { link, score: 1000 };
                  break;
                }
                
                // Count matching words (require at least 2 significant words to match)
                const matchingWords = titleWords.filter(word => linkSlug.includes(word));
                const score = matchingWords.length;
                
                // Only consider if at least 2 words match (or all words for short titles)
                const minRequired = Math.min(2, titleWords.length);
                if (score >= minRequired && (!bestMatch || score > bestMatch.score)) {
                  bestMatch = { link, score };
                }
              }
              
              if (bestMatch) {
                jobUrl = bestMatch.link;
                // Remove from jobLinks so same link isn't reused for another job
                const idx = jobLinks.indexOf(bestMatch.link);
                if (idx > -1) jobLinks.splice(idx, 1);
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
        
          companyJobs.push(...pageJobs);
          console.log(`  Page ${pageNum}: Found ${pageJobs.length} jobs (total for ${company.name}: ${companyJobs.length})`);
          
          // Stop if no jobs found on this page (reached end of pagination)
          if (pageJobs.length === 0) {
            console.log(`  No jobs found on page ${pageNum}, stopping pagination`);
            break;
          }
        } else {
          console.log(`  Page ${pageNum}: No jobs found in response`);
          // Stop if page has no job data
          break;
        }
      }
      
      // Deduplicate jobs using URL as primary key
      // Only jobs with unique URLs are kept (each job should have a unique URL)
      const uniqueJobs = Array.from(
        new Map(
          companyJobs.map(job => {
            // Check if this is a specific job URL (not just the careers page)
            const isSpecificUrl = job.url !== careersUrl && (
              job.url.toLowerCase().includes('/job/') ||
              job.url.toLowerCase().includes('/jobs/') ||
              job.url.toLowerCase().includes('jobid') ||
              job.url.toLowerCase().includes('/vacancy') ||
              job.url.toLowerCase().includes('/vacancies-list/20') || // Ørsted format
              job.url.toLowerCase().includes('/position') ||
              job.url.toLowerCase().includes('/ad/') || // Emply platform
              /\/\d{4,}[-/]/.test(job.url.toLowerCase()) || // Job ID pattern
              /\/[a-z0-9]{5,8}$/.test(job.url.toLowerCase()) // Short ID (Emply)
            );
            
            // Use URL as key if it's specific, otherwise use title+location
            const key = isSpecificUrl 
              ? job.url 
              : `${job.company}-${job.title}-${job.location}`.toLowerCase();
            
            return [key, job];
          })
        ).values()
      );
      
      if (uniqueJobs.length < companyJobs.length) {
        console.log(`Removed ${companyJobs.length - uniqueJobs.length} duplicate jobs for ${company.name}`);
      }
      
      allJobs.push(...uniqueJobs);
      console.log(`Successfully crawled ${company.name}, found ${uniqueJobs.length} unique jobs (${companyJobs.length} total before dedup)`);
    } catch (error) {
      console.error(`Error crawling ${company.name}:`, error);
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
      const startTime = Date.now();
      console.log(`\n=== STARTING FIRECRAWL CRAWL (recrawl=${recrawl}) ===`);
      cachedJobs = await crawlJobs();
      cacheTimestamp = Date.now();
      const duration = ((cacheTimestamp - startTime) / 1000).toFixed(2);
      console.log(`\n=== CRAWL COMPLETE ===`);
      console.log(`Total jobs cached: ${cachedJobs.length}`);
      console.log(`Duration: ${duration}s`);
      console.log(`Jobs by company:`, cachedJobs.reduce((acc, job) => {
        acc[job.company] = (acc[job.company] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
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
