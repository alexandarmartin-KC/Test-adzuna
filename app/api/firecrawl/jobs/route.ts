import { NextRequest, NextResponse } from "next/server";
import { COMPANIES, CompanyConfig } from "@/lib/companies";

export const dynamic = 'force-dynamic';

// ============================================================
// UNIVERSAL JOB CRAWLER
// Add companies in lib/companies.ts - they appear in UI automatically!
// ============================================================

interface Job {
  title: string;
  company: string;
  country: string;
  location: string;
  department?: string;
  url: string;
}

// Cache
let cachedJobs: Job[] | null = null;
let cacheTimestamp: number | null = null;

// Firecrawl config
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          location: { type: "string" },
          department: { type: "string" },
          url: { type: "string" }
        },
        required: ["title"]
      }
    }
  },
  required: ["jobs"]
};

const EXTRACTION_PROMPT = `Extract ALL job postings from this careers page.
For each job: title (REQUIRED), location, department, url to apply.
Extract ALL jobs, not just the first 10.`;


// ============================================================
// CAREERS PAGE AUTO-DISCOVERY - Find careers page from any URL
// ============================================================

const CAREERS_KEYWORDS = [
  'karriere', 'career', 'careers', 'jobs', 'job', 'ledige-stillinger', 
  'vacancies', 'work-with-us', 'join-us', 'join-our-team', 'arbejd-hos-os',
  'stillinger', 'positions', 'opportunities', 'recruitment', 'hiring', 'search'
];

const JOBS_PAGE_KEYWORDS = [
  'ledige-stillinger', 'vacancies', 'jobs', 'positions', 'openings',
  'open-positions', 'job-listings', 'search'
];

const COMMON_CAREERS_PATHS = [
  '/careers', '/career', '/jobs', '/karriere', '/ledige-stillinger',
  '/work-with-us', '/join-us', '/vacancies', '/positions', '/job',
  '/da/karriere', '/en/careers', '/dk/careers', '/about/careers'
];

async function discoverCareersPage(inputUrl: string): Promise<string> {
  // Normalize URL
  let baseUrl = inputUrl.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
  
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  
  // If URL already looks like a careers page, use it
  const pathLower = urlObj.pathname.toLowerCase();
  if (CAREERS_KEYWORDS.some(kw => pathLower.includes(kw))) {
    console.log(`  [Discovery] URL already looks like careers page: ${baseUrl}`);
    return baseUrl;
  }
  
  console.log(`  [Discovery] Looking for careers page on ${origin}...`);
  
  try {
    // Fetch the main page
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    
    if (!response.ok) {
      console.log(`  [Discovery] Could not fetch ${baseUrl}`);
      return baseUrl;
    }
    
    const html = await response.text();
    
    // Method 1: Look for direct career platform URLs (highest priority)
    const platformMatches = html.match(/https?:\/\/[^"'\s]+\.emply\.com[^"'\s]*/g) ||
                           html.match(/https?:\/\/[^"'\s]+successfactors[^"'\s]*/g) ||
                           html.match(/https?:\/\/[^"'\s]+greenhouse\.io[^"'\s]*/g) ||
                           html.match(/https?:\/\/[^"'\s]+lever\.co[^"'\s]*/g) ||
                           html.match(/https?:\/\/[^"'\s]+workday[^"'\s]*/g);
    
    if (platformMatches && platformMatches.length > 0) {
      // Clean and return the first platform URL
      let cleanUrl = platformMatches[0].replace(/["'>\s].*$/, '');
      console.log(`  [Discovery] Found career platform URL: ${cleanUrl}`);
      
      // If it's an Emply forside/home page, try to find the actual jobs page
      if (cleanUrl.includes('.emply.com') && (cleanUrl.endsWith('/forside') || cleanUrl.endsWith('/home') || !cleanUrl.includes('stillinger'))) {
        try {
          const emplyResp = await fetch(cleanUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (emplyResp.ok) {
            const emplyHtml = await emplyResp.text();
            const jobsLinkMatch = emplyHtml.match(/href=["']([^"']*(?:ledige-stillinger|vacancies|jobs|positions)[^"']*)["']/i);
            if (jobsLinkMatch) {
              const jobsPath = jobsLinkMatch[1];
              if (jobsPath.startsWith('/')) {
                cleanUrl = new URL(cleanUrl).origin + jobsPath;
              } else if (jobsPath.startsWith('http')) {
                cleanUrl = jobsPath;
              }
              console.log(`  [Discovery] Found jobs page within Emply: ${cleanUrl}`);
            }
          }
        } catch { /* use the original URL */ }
      }
      
      return cleanUrl;
    }
    
    // Method 2: Look for careers links in HTML
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    const foundLinks: { url: string; score: number }[] = [];
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const linkText = match[2].toLowerCase();
      
      // Skip external links, anchors, javascript, etc.
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
      
      // Build full URL
      let fullUrl: string;
      try {
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = origin + href;
        } else {
          fullUrl = origin + '/' + href;
        }
      } catch { continue; }
      
      // Score this link
      let score = 0;
      const hrefLower = href.toLowerCase();
      
      // Check URL path for keywords
      for (const kw of CAREERS_KEYWORDS) {
        if (hrefLower.includes(kw)) score += 10;
        if (linkText.includes(kw)) score += 15;
      }
      
      // Bonus for staying on same domain
      if (fullUrl.includes(urlObj.hostname)) score += 5;
      
      // Bonus for known career platforms
      if (fullUrl.includes('.emply.com')) score += 20;
      if (fullUrl.includes('successfactors')) score += 20;
      if (fullUrl.includes('greenhouse.io')) score += 20;
      if (fullUrl.includes('workday')) score += 20;
      if (fullUrl.includes('lever.co')) score += 20;
      
      if (score > 0) {
        foundLinks.push({ url: fullUrl, score });
      }
    }
    
    // Sort by score and pick best
    foundLinks.sort((a, b) => b.score - a.score);
    
    if (foundLinks.length > 0) {
      console.log(`  [Discovery] Found careers page: ${foundLinks[0].url} (score: ${foundLinks[0].score})`);
      return foundLinks[0].url;
    }
    
    // Method 3: Try common paths as fallback
    for (const path of COMMON_CAREERS_PATHS) {
      try {
        const testUrl = origin + path;
        const testResp = await fetch(testUrl, { method: 'HEAD', redirect: 'follow' });
        if (testResp.ok) {
          console.log(`  [Discovery] Found careers page at common path: ${testUrl}`);
          return testUrl;
        }
      } catch { /* continue */ }
    }
    
    console.log(`  [Discovery] No careers page found, using original URL`);
    return baseUrl;
    
  } catch (error) {
    console.error(`  [Discovery] Error:`, error);
    return baseUrl;
  }
}


// ============================================================
// PLATFORM DETECTION - Auto-detect career site platform
// ============================================================

type Platform = "emply" | "successfactors" | "greenhouse" | "workday" | "lever" | "unknown";

function detectPlatform(url: string, html?: string): Platform {
  const lower = url.toLowerCase();
  
  // URL-based detection
  if (lower.includes('.emply.com') || lower.includes('career.emply')) return "emply";
  if (lower.includes('successfactors') || lower.includes('jobs.sap.com') || lower.includes('careers.novonordisk')) return "successfactors";
  if (lower.includes('greenhouse.io') || lower.includes('boards.greenhouse')) return "greenhouse";
  if (lower.includes('myworkdayjobs.com') || lower.includes('.wd')) return "workday";
  if (lower.includes('lever.co') || lower.includes('jobs.lever')) return "lever";
  
  // HTML-based detection
  if (html) {
    if (html.includes('emply.com') || html.includes('ui_jobs_grid') || html.includes('sectionId:')) return "emply";
    if (html.includes('jobTitle-link') || html.includes('class="jobLocation"')) return "successfactors";
    if (html.includes('greenhouse')) return "greenhouse";
    if (html.includes('workday')) return "workday";
    if (html.includes('lever.co')) return "lever";
  }
  
  return "unknown";
}


// ============================================================
// EMPLY SCRAPER (Matas, etc.) - Uses their API, 0 credits!
// ============================================================

async function scrapeEmply(careersUrl: string, companyName: string, country: string): Promise<Job[]> {
  const baseUrl = new URL(careersUrl).origin;
  console.log(`  [Emply] Scraping ${companyName}...`);
  
  try {
    // Get sectionId from page
    const pageResponse = await fetch(careersUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!pageResponse.ok) return [];
    const html = await pageResponse.text();
    
    const sectionIdMatch = html.match(/sectionId:\s*['"]([^'"]+)['"]/);
    if (!sectionIdMatch) {
      console.log(`  [Emply] Could not find sectionId`);
      return [];
    }
    
    // Fetch all jobs via API
    const jobs: Job[] = [];
    let offset = 0;
    let total = 0;
    
    do {
      const apiResponse = await fetch(`${baseUrl}/api/integration/vacancy/get-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: sectionIdMatch[1], offset, filters: [] }),
      });
      
      if (!apiResponse.ok) break;
      
      const data = await apiResponse.json();
      total = data.count || 0;
      
      for (const v of data.vacancies || []) {
        jobs.push({
          title: v.title || v.translations?.[0]?.title || 'Unknown',
          company: companyName,
          country: country,
          location: (v.location || 'Denmark').replace(/, Denmark$/, '').replace(/,\s*\d{4},\s*/, ', '),
          department: v.department,
          url: v.shortId && v.titleAsUrl ? `${baseUrl}/ad/${v.titleAsUrl}/${v.shortId}` : careersUrl,
        });
      }
      
      offset += data.vacancies?.length || 0;
    } while (offset < total);
    
    console.log(`  [Emply] Found ${jobs.length} jobs (FREE - 0 credits)`);
    return jobs;
  } catch (error) {
    console.error(`  [Emply] Error:`, error);
    return [];
  }
}


// ============================================================
// SUCCESSFACTORS SCRAPER (Novo Nordisk, Carlsberg, etc.) - Direct HTML, 0 credits!
// Returns null if site needs Firecrawl (JS-rendered), returns Job[] otherwise
// ============================================================

async function scrapeSuccessFactors(careersUrl: string, companyName: string, country: string): Promise<Job[] | null> {
  const baseUrl = new URL(careersUrl).origin;
  console.log(`  [SuccessFactors] Scraping ${companyName}...`);
  
  try {
    const jobs: Job[] = [];
    const seenUrls = new Set<string>();
    
    // Handle pagination - careers.carlsberg.com uses startrow parameter
    const isPaginated = careersUrl.includes('/search/') || careersUrl.includes('search?');
    let startRow = 0;
    const pageSize = 10;
    let hasMore = true;
    
    while (hasMore) {
      const pageUrl = isPaginated 
        ? `${careersUrl}${careersUrl.includes('?') ? '&' : '?'}startrow=${startRow}`
        : careersUrl;
      
      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (!response.ok) {
        console.log(`  [SuccessFactors] HTTP ${response.status}`);
        if (jobs.length === 0) return null; // Let Firecrawl try
        break;
      }
      const html = await response.text();
      
      // Check if this is a JS-rendered SuccessFactors (career2.successfactors.eu style)
      if (html.includes('career2.successfactors.eu') || html.includes('career_company=')) {
        console.log(`  [SuccessFactors] JS-rendered external portal - will use Firecrawl`);
        return null; // Signal to use Firecrawl
      }
      
      const beforeCount = seenUrls.size;
      
      // Pattern 1: Standard SuccessFactors - /job/Location-Title/ID/
      // Pattern 2: Carlsberg-style - /CarlsbergDK/job/Location-Title/ID/
      // Pattern 1: href before class - /job/Location-Title/ID/ or /CarlsbergDK/job/Location-Title/ID/
      const jobRegex = /href="(\/(?:[^"\/]+\/)?job\/[^"]+)"[^>]*class="jobTitle-link[^"]*"[^>]*>\s*([^<]+)/gi;
      let match;
      
      while ((match = jobRegex.exec(html)) !== null) {
        const jobPath = match[1];
        const title = match[2].trim();
        
        if (!seenUrls.has(jobPath) && title) {
          seenUrls.add(jobPath);
          
          // Extract location from path: /job/Location-Title/123/ or /CarlsbergDK/job/Location-Title/123/
          const pathParts = decodeURIComponent(jobPath).split('/').filter(p => p && p !== 'job' && !p.match(/^Carlsberg/i));
          const locationPart = pathParts[0] || '';
          const location = locationPart.split('-')[0] || country;
          
          jobs.push({
            title,
            company: companyName,
            country: country,
            location,
            url: `${baseUrl}${jobPath}`,
          });
        }
      }
      
      // Pattern 2: class before href (Carlsberg style)
      const altRegex = /class="jobTitle-link[^"]*"[^>]*href="(\/(?:[^"\/]+\/)?job\/[^"]+)"[^>]*>\s*([^<]+)/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const jobPath = match[1];
        const title = match[2].trim();
        
        if (!seenUrls.has(jobPath) && title) {
          seenUrls.add(jobPath);
          const pathParts = decodeURIComponent(jobPath).split('/').filter(p => p && p !== 'job' && !p.match(/^Carlsberg/i));
          const location = pathParts[0]?.split('-')[0] || country;
          
          jobs.push({
            title,
            company: companyName,
            country: country,
            location,
            url: `${baseUrl}${jobPath}`,
          });
        }
      }
      
      // Check if we got new jobs on this page
      const newJobsOnPage = seenUrls.size - beforeCount;
      console.log(`  [SuccessFactors] Page at startrow=${startRow}: ${newJobsOnPage} new jobs found`);
      
      // Stop if no pagination or no new jobs found
      if (!isPaginated || newJobsOnPage === 0) {
        hasMore = false;
      } else {
        startRow += pageSize;
        // Safety limit to avoid infinite loops
        if (startRow > 500) hasMore = false;
      }
    }
    
    // Also extract locations if available (for non-paginated pages)
    // This is a secondary pass for pages with separate location elements
    
    console.log(`  [SuccessFactors] Found ${jobs.length} jobs (FREE - 0 credits)`);
    return jobs;
  } catch (error) {
    console.error(`  [SuccessFactors] Error:`, error);
    return null; // Let Firecrawl try
  }
}


// ============================================================
// FIRECRAWL SCRAPER - Universal AI scraper (uses credits)
// ============================================================

async function scrapeWithFirecrawl(careersUrl: string, companyName: string, country: string, apiKey: string): Promise<Job[]> {
  console.log(`  [Firecrawl] Scraping ${companyName} (uses credits)...`);
  
  try {
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
        waitFor: 5000,
        timeout: 90000,
      }),
    });
    
    if (!response.ok) {
      console.error(`  [Firecrawl] HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data?.extract?.jobs) {
      console.log(`  [Firecrawl] No jobs extracted`);
      return [];
    }
    
    const extractedJobs = data.data.extract.jobs;
    const pageLinks: string[] = data.data.links || [];
    
    // Helper to match job titles to URLs
    const titleToSlug = (title: string) => title.toLowerCase()
      .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Filter to job-specific links (links that look like they go to a specific job posting)
    const jobLinks = pageLinks.filter(link => {
      const l = link.toLowerCase();
      return link.startsWith('http') && (
        l.includes('/job/') || l.includes('/ad/') || l.includes('/vacancy/') ||
        l.includes('/position/') || l.includes('/requisition') ||
        /\/\d{5,}(\/|$)/.test(l) || /\/[a-z0-9]{6,12}$/.test(l)
      );
    });
    
    console.log(`  [Firecrawl] Found ${pageLinks.length} total links, ${jobLinks.length} job-specific links`);
    
    const jobs: Job[] = [];
    const usedLinks = new Set<string>();
    
    for (const job of extractedJobs) {
      // Start with careers page as fallback - never use URL provided by AI (often hallucinated)
      let jobUrl = careersUrl;
      let foundMatch = false;
      
      // Only try to match if we have job-specific links AND a title
      if (jobLinks.length > 0 && job.title) {
        const slug = titleToSlug(job.title);
        const words = slug.split('-').filter((w: string) => w.length > 3); // Only meaningful words
        
        for (const link of jobLinks) {
          if (usedLinks.has(link)) continue;
          const linkLower = link.toLowerCase();
          const linkSlug = linkLower.split('/').pop() || '';
          
          // Need high confidence match: either full slug in URL or 2+ significant words
          const fullMatch = linkSlug.includes(slug);
          const wordMatches = words.filter((w: string) => linkLower.includes(w)).length;
          
          if (fullMatch || wordMatches >= 2) {
            jobUrl = link;
            usedLinks.add(link);
            foundMatch = true;
            break;
          }
        }
      }
      
      // If AI provided a URL that's in our discovered links, use it
      if (!foundMatch && job.url && pageLinks.includes(job.url)) {
        jobUrl = job.url;
      }
      
      jobs.push({
        title: job.title || 'Unknown',
        company: companyName,
        country: job.country || country,
        location: job.location || 'See posting',
        department: job.department,
        url: jobUrl,
      });
    }
    
    // Log how many jobs got matched URLs vs fallback
    const matchedCount = jobs.filter(j => j.url !== careersUrl).length;
    console.log(`  [Firecrawl] Found ${jobs.length} jobs (${matchedCount} with direct URLs, ${jobs.length - matchedCount} link to search page)`);
    return jobs;
    return jobs;
  } catch (error) {
    console.error(`  [Firecrawl] Error:`, error);
    return [];
  }
}


// ============================================================
// MAIN CRAWLER - Auto-detects platform and uses best method
// ============================================================

async function crawlSingleCompany(company: CompanyConfig, apiKey: string): Promise<Job[]> {
  console.log(`\n=== ${company.name} ===`);
  console.log(`Input URL: ${company.careersUrl}`);
  
  const country = company.country || 'DK';
  
  try {
    // Auto-discover careers page if needed
    const careersUrl = await discoverCareersPage(company.careersUrl);
    console.log(`Careers URL: ${careersUrl}`);
    
    // Try to fetch HTML to detect platform
    let html: string | undefined;
    try {
      const resp = await fetch(careersUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (resp.ok) html = await resp.text();
    } catch (e) { /* ignore */ }
    
    // Detect platform
    const platform = detectPlatform(careersUrl, html);
    console.log(`Platform detected: ${platform}`);
    
    let jobs: Job[] = [];
    
    // Use platform-specific scraper (FREE) or Firecrawl (credits)
    switch (platform) {
      case "emply":
        jobs = await scrapeEmply(careersUrl, company.name, country);
        break;
      case "successfactors":
        const sfJobs = await scrapeSuccessFactors(careersUrl, company.name, country);
        if (sfJobs === null) {
          // JS-rendered site, fall back to Firecrawl
          console.log(`  [Fallback] Using Firecrawl for JS-rendered SuccessFactors`);
          jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey);
        } else {
          jobs = sfJobs;
        }
        break;
      case "greenhouse":
      case "workday":
      case "lever":
      case "unknown":
      default:
        // Use Firecrawl AI for unknown platforms
        jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey);
    }
    
    // Deduplicate by URL
    const uniqueJobs = Array.from(
      new Map(jobs.map(j => [j.url, j])).values()
    );
    
    console.log(`✅ ${company.name}: ${uniqueJobs.length} jobs`);
    return uniqueJobs;
  } catch (error) {
    console.error(`❌ ${company.name}: Error -`, error);
    return [];
  }
}

async function crawlJobs(): Promise<Job[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  
  // Run all companies in parallel for speed
  const results = await Promise.all(
    COMPANIES.map(company => crawlSingleCompany(company, apiKey))
  );
  
  // Flatten results
  return results.flat();
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function filterJobs(jobs: Job[], filters: { company?: string; country?: string; q?: string }): Job[] {
  return jobs.filter(job => {
    if (filters.company && job.company.toLowerCase() !== filters.company.toLowerCase()) return false;
    if (filters.country && job.country.toLowerCase() !== filters.country.toLowerCase()) return false;
    if (filters.q) {
      const search = filters.q.toLowerCase();
      if (!job.title.toLowerCase().includes(search) && !job.location.toLowerCase().includes(search)) return false;
    }
    return true;
  });
}


// ============================================================
// API ENDPOINT
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const company = params.get("company") || undefined;
    const country = params.get("country") || undefined;
    const q = params.get("q") || undefined;
    const recrawl = params.get("recrawl") === "true";
    
    if (!cachedJobs || recrawl) {
      console.log(`\n========== CRAWLING JOBS ==========`);
      const start = Date.now();
      cachedJobs = await crawlJobs();
      cacheTimestamp = Date.now();
      console.log(`\n========== DONE: ${cachedJobs.length} jobs in ${((Date.now() - start) / 1000).toFixed(1)}s ==========`);
    }
    
    const filtered = filterJobs(cachedJobs, { company, country, q });
    
    return NextResponse.json({
      jobs: filtered,
      total: filtered.length,
      cached: !recrawl,
      cacheTimestamp,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
