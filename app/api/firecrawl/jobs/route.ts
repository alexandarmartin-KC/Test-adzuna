import { NextRequest, NextResponse } from "next/server";
import { COMPANIES, CompanyConfig } from "@/lib/companies";
import puppeteer from 'puppeteer';
import { scrapeWorkdayCompany } from "@/lib/workdayConnector";
import { 
  fetchJobsWithFallback, 
  getCompanyStatus, 
  WORKDAY_FALLBACK_REGISTRY 
} from "@/lib/workdayFallback";
import { scrapeWorkdayWithApify } from "@/lib/apifyConnector";


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
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

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
Extract EVERY SINGLE job on the page - if you see 50+ jobs, extract all 50+.
Do not stop at 10-15 jobs. Extract everything visible.`;


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
  const pathLower = urlObj.pathname.toLowerCase();
  
  // If URL already looks like a careers page OR is a jobs subdomain, use it directly
  if (CAREERS_KEYWORDS.some(kw => pathLower.includes(kw)) || 
      origin.toLowerCase().includes('jobs.') ||
      origin.toLowerCase().includes('careers.') ||
      origin.toLowerCase().includes('karriere.')) {
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
  if (lower.includes('lever.co') || lower.includes('jobs.lever') || lower.includes('jobs.arla')) return "lever";
  
  // HTML-based detection
  if (html) {
    if (html.includes('emply.com') || html.includes('ui_jobs_grid') || html.includes('sectionId:')) return "emply";
    if (html.includes('jobTitle-link') || html.includes('class="jobLocation"')) return "successfactors";
    if (html.includes('greenhouse')) return "greenhouse";
    if (html.includes('workday')) return "workday";
    if (html.includes('lever.co') || html.includes('jobs.lever')) return "lever";
  }
  
  return "unknown";
}


// ============================================================
// GREENHOUSE SCRAPER - Uses their public API, 0 credits!
// ============================================================

async function scrapeGreenhouse(careersUrl: string, companyName: string, country: string): Promise<Job[] | null> {
  console.log(`  [Greenhouse] Scraping ${companyName}...`);
  
  try {
    // Extract board ID from URL
    // Format: https://boards.greenhouse.io/[boardId] or https://boards-api.greenhouse.io/v1/boards/[boardId]/jobs
    const boardMatch = careersUrl.match(/greenhouse\.io\/([^\/\?]+)/);
    if (!boardMatch) {
      console.log(`  [Greenhouse] Could not extract board ID from URL`);
      return null;
    }
    
    const boardId = boardMatch[1];
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=false`;
    
    console.log(`  [Greenhouse] Fetching from API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`  [Greenhouse] API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.log(`  [Greenhouse] No jobs array in response`);
      return null;
    }
    
    const jobs: Job[] = data.jobs.map((job: any) => {
      // Extract location and determine country
      const locationName = job.location?.name || 'Unknown';
      let jobCountry = 'Unknown'; // Default to Unknown, not the company's default country
      
      const locLower = locationName.toLowerCase();
      if (locLower.includes('denmark') || locLower.includes('danmark') || 
          locLower.includes('copenhagen') || locLower.includes('skovlunde') || 
          locLower.includes('aarhus')) {
        jobCountry = 'DK';
      } else if (locLower.includes('sweden') || locLower.includes('sverige') || 
                 locLower.includes('stockholm') || locLower.includes('gothenburg')) {
        jobCountry = 'SE';
      } else if (locLower.includes('norway') || locLower.includes('norge') || 
                 locLower.includes('oslo') || locLower.includes('porsgrunn') || 
                 locLower.includes('ovrebo')) {
        jobCountry = 'NO';
      } else if (locLower.includes('united kingdom') || locLower.includes('london') || 
                 locLower.includes('england')) {
        jobCountry = 'GB';
      } else if (locLower.includes('ireland') || locLower.includes('dublin')) {
        jobCountry = 'IE';
      } else if (locLower.includes('poland') || locLower.includes('warsaw') || 
                 locLower.includes('warszawa')) {
        jobCountry = 'PL';
      } else if (locLower.includes('spain') || locLower.includes('españa')) {
        jobCountry = 'ES';
      } else if (locLower.includes('europe') && !locLower.includes(',')) {
        // Only set to EU if location is just "Europe", not "United Kingdom, Europe" etc
        jobCountry = 'EU';
      } else if (country && country !== 'DK') {
        // Use company default country only if it's explicitly set and not DK (which is the fallback)
        jobCountry = country;
      }
      
      return {
        title: job.title || 'Unknown',
        company: companyName,
        country: jobCountry,
        location: locationName,
        department: job.departments && job.departments.length > 0 ? job.departments[0].name : undefined,
        url: job.absolute_url || `https://boards.greenhouse.io/embed/job_app?token=${job.id}`
      };
    });
    
    console.log(`  [Greenhouse] Found ${jobs.length} jobs (FREE - 0 credits)`);
    return jobs;
  } catch (error) {
    console.error(`  [Greenhouse] Error:`, error);
    return null;
  }
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
  console.log(`  [SuccessFactors] URL received: ${careersUrl}`);
  
  try {
    const jobs: Job[] = [];
    const seenUrls = new Set<string>();
    
    // Handle pagination - only for sites that use startrow pagination (Carlsberg style)
    // Novo Nordisk shows all jobs on one page
    const isPaginated = careersUrl.includes('careers.carlsberg.com') || careersUrl.includes('startrow');
    console.log(`  [SuccessFactors] isPaginated: ${isPaginated} (URL includes careers.carlsberg.com: ${careersUrl.includes('careers.carlsberg.com')})`);
    
    let startRow = 0;
    const pageSize = 10;
    let hasMore = true;
    
    while (hasMore) {
      const pageUrl = isPaginated && startRow > 0
        ? `${careersUrl}${careersUrl.includes('?') ? '&' : '?'}startrow=${startRow}`
        : careersUrl;
      
      console.log(`  [SuccessFactors] Fetching page: ${pageUrl.substring(0, 100)}...`);
      
      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (!response.ok) {
        console.log(`  [SuccessFactors] HTTP ${response.status}`);
        if (jobs.length === 0) return null; // Let Firecrawl try
        break;
      }
      const html = await response.text();
      
      // Check if this page actually has job links in HTML
      // Some SuccessFactors pages (like career2.successfactors.eu) are JS-rendered with no HTML job links
      const hasJobLinks = html.includes('jobTitle-link') || html.includes('/job/');
      if (!hasJobLinks && startRow === 0) {
        console.log(`  [SuccessFactors] No job links in HTML - JS-rendered page, will use Firecrawl`);
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
      console.log(`  [SuccessFactors] Page at startrow=${startRow}: ${newJobsOnPage} new jobs found (total: ${seenUrls.size}, isPaginated: ${isPaginated})`);
      
      // Stop if no pagination or no new jobs found
      if (!isPaginated || newJobsOnPage === 0) {
        console.log(`  [SuccessFactors] Stopping pagination: isPaginated=${isPaginated}, newJobs=${newJobsOnPage}`);
        hasMore = false;
      } else {
        startRow += pageSize;
        console.log(`  [SuccessFactors] Continuing to startrow=${startRow}`);
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
// LEVER SCRAPER - Auto-handles pagination (FREE - 0 credits!)
// ============================================================

async function scrapeLever(careersUrl: string, companyName: string, country: string): Promise<Job[] | null> {
  console.log(`  [Lever] Scraping ${companyName}...`);
  
  try {
    // Lever typically hosts at jobs.lever.co or custom domain
    // Try to find the API endpoint
    let apiUrl = careersUrl;
    
    // If it's a custom domain like jobs.arla.com, find the actual Lever endpoint
    if (!careersUrl.includes('lever.co')) {
      const pageResp = await fetch(careersUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!pageResp.ok) return null;
      
      const html = await pageResp.text();
      
      // Look for Lever API calls in the HTML
      const apiMatch = html.match(/https?:\/\/[^"']+lever\.co[^"']*/);
      if (apiMatch) {
        apiUrl = apiMatch[0];
        console.log(`  [Lever] Found Lever URL: ${apiUrl}`);
      }
    }
    
    // Try the Lever postings API
    const companySlug = apiUrl.match(/lever\.co\/([^\/\?]+)/)?.[1] || 
                        careersUrl.match(/jobs\.([^\.]+)\./)?.[1];
    
    if (companySlug) {
      const apiEndpoint = `https://api.lever.co/v0/postings/${companySlug}?mode=json`;
      console.log(`  [Lever] Trying API: ${apiEndpoint}`);
      
      const apiResp = await fetch(apiEndpoint);
      if (apiResp.ok) {
        const data = await apiResp.json();
        if (Array.isArray(data) && data.length > 0) {
          const jobs: Job[] = data.map(job => ({
            title: job.text || job.title || 'Unknown',
            company: companyName,
            country: job.categories?.location?.includes('Denmark') || job.categories?.location?.includes('Danmark') 
              ? 'DK' 
              : job.categories?.location?.includes('Sweden') || job.categories?.location?.includes('Sverige')
              ? 'SE'
              : job.categories?.location?.includes('Norway') || job.categories?.location?.includes('Norge')
              ? 'NO'
              : country,
            location: job.categories?.location || job.location || 'Unknown',
            department: job.categories?.team || job.categories?.department,
            url: job.hostedUrl || job.applyUrl || careersUrl,
          }));
          
          console.log(`  [Lever] Found ${jobs.length} jobs via API (FREE - 0 credits)`);
          return jobs;
        }
      }
    }
    
    // If API doesn't work, scrape the page directly
    console.log(`  [Lever] API failed, trying page scrape...`);
    const pageResp = await fetch(careersUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!pageResp.ok) return null;
    const html = await pageResp.text();
    
    // Parse jobs from HTML (Lever has consistent class names)
    const jobs: Job[] = [];
    const jobRegex = /<div[^>]*class="[^"]*posting[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h5[^>]*>([^<]+)<\/h5>[\s\S]*?<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/gi;
    
    let match;
    while ((match = jobRegex.exec(html)) !== null) {
      const [, url, title, location] = match;
      jobs.push({
        title: title.trim(),
        company: companyName,
        country: location.includes('Denmark') || location.includes('Danmark') 
          ? 'DK' 
          : location.includes('Sweden') || location.includes('Sverige')
          ? 'SE'
          : location.includes('Norway') || location.includes('Norge')
          ? 'NO'
          : country,
        location: location.trim(),
        url: url.startsWith('http') ? url : `${new URL(careersUrl).origin}${url}`,
      });
    }
    
    if (jobs.length > 0) {
      console.log(`  [Lever] Found ${jobs.length} jobs via HTML scrape (FREE - 0 credits)`);
      return jobs;
    }
    
    console.log(`  [Lever] No jobs found with simple scrape, needs Firecrawl`);
    return null;
    
  } catch (error) {
    console.error(`  [Lever] Error:`, error);
    return null;
  }
}


// ============================================================
// WORKDAY SCRAPER - Puppeteer for bot-protected sites (FREE - 0 credits!)
// ============================================================

async function scrapeWorkday(careersUrl: string, companyName: string, country: string): Promise<Job[] | null> {
  console.log(`  [Workday] Scraping ${companyName} with Puppeteer...`);
  
  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ]
    });
    
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`  [Workday] Navigating to ${careersUrl}...`);
    await page.goto(careersUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for job listings to load (Workday-specific selectors)
    console.log(`  [Workday] Waiting for jobs to load...`);
    try {
      await page.waitForSelector('li[data-automation-id="compositeContainer"]', { timeout: 15000 });
    } catch {
      console.log(`  [Workday] Standard selector not found, trying alternatives...`);
      // Try alternative selectors
      try {
        await page.waitForSelector('[data-automation-id="jobTitle"]', { timeout: 10000 });
      } catch {
        // Take screenshot for debugging
        await page.screenshot({ path: '/tmp/workday-debug.png' });
        console.log(`  [Workday] No job elements found. Screenshot saved to /tmp/workday-debug.png`);
        console.log(`  [Workday] Page title: ${await page.title()}`);
        const content = await page.content();
        console.log(`  [Workday] Page content length: ${content.length} chars`);
        console.log(`  [Workday] Content preview: ${content.substring(0, 500)}`);
      }
    }
    
    // Scroll to trigger lazy loading
    console.log(`  [Workday] Scrolling to load all jobs...`);
    await autoScroll(page);
    
    // Wait a bit more for any final loads
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract jobs from the page
    console.log(`  [Workday] Extracting job data...`);
    const jobs = await page.evaluate((companyName, country) => {
      const jobElements = document.querySelectorAll('li[data-automation-id="compositeContainer"]');
      const extractedJobs: any[] = [];
      
      jobElements.forEach(el => {
        // Extract job title
        const titleEl = el.querySelector('[data-automation-id="jobTitle"]') || 
                       el.querySelector('a[data-automation-id="jobTitle"]') ||
                       el.querySelector('h3');
        const title = titleEl?.textContent?.trim() || '';
        
        if (!title) return; // Skip if no title
        
        // Extract location
        const locationEl = el.querySelector('[data-automation-id="location"]') ||
                          el.querySelector('.css-1ij37lp') ||
                          el.querySelector('dd');
        const location = locationEl?.textContent?.trim() || 'Unknown';
        
        // Extract URL
        const linkEl = el.querySelector('a[data-automation-id="jobTitle"]') || el.querySelector('a');
        const url = linkEl?.getAttribute('href') || '';
        
        // Determine country from location
        let jobCountry = country;
        const locLower = location.toLowerCase();
        if (locLower.includes('denmark') || locLower.includes('danmark') || locLower.includes('billund') || locLower.includes('copenhagen') || locLower.includes('aarhus')) {
          jobCountry = 'DK';
        } else if (locLower.includes('sweden') || locLower.includes('sverige') || locLower.includes('stockholm') || locLower.includes('gothenburg')) {
          jobCountry = 'SE';
        } else if (locLower.includes('norway') || locLower.includes('norge') || locLower.includes('oslo')) {
          jobCountry = 'NO';
        }
        
        extractedJobs.push({
          title,
          company: companyName,
          country: jobCountry,
          location,
          url: url.startsWith('http') ? url : `${window.location.origin}${url}`,
        });
      });
      
      return extractedJobs;
    }, companyName, country);
    
    await browser.close();
    
    console.log(`  [Workday] Found ${jobs.length} jobs (FREE - 0 credits)`);
    return jobs;
    
  } catch (error) {
    console.error(`  [Workday] Error:`, error);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

// Helper function for auto-scrolling
async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}


// ============================================================
// FIRECRAWL SCRAPER - Universal AI scraper (uses credits)
// ============================================================

async function scrapeWithFirecrawl(careersUrl: string, companyName: string, country: string, apiKey: string, platform?: Platform): Promise<Job[]> {
  console.log(`  [Firecrawl] Scraping ${companyName} (uses credits)...`);
  
  try {
    // For Lever and Workday sites, add extensive scrolling/waiting
    const actions = (platform === "lever" || platform === "workday") ? [
      { type: "wait", milliseconds: 5000 },
      { type: "scroll", direction: "down", amount: 2000 },
      { type: "wait", milliseconds: 3000 },
      { type: "scroll", direction: "down", amount: 2000 },
      { type: "wait", milliseconds: 3000 },
      { type: "scroll", direction: "down", amount: 2000 },
      { type: "wait", milliseconds: 3000 },
      { type: "scroll", direction: "down", amount: 2000 },
      { type: "wait", milliseconds: 3000 },
      { type: "scroll", direction: "down", amount: 2000 },
      { type: "wait", milliseconds: 3000 },
      { type: "scroll", direction: "down", amount: 2000 },
    ] : undefined;
    
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
        actions,
        waitFor: platform === "workday" ? 15000 : (platform === "lever" ? 10000 : 5000),
        timeout: 120000,
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
  
  const country = company.country || 'Unknown'; // Default to Unknown instead of DK
  console.log(`Default country: ${country}`);
  
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
      if (resp.ok) {
        html = await resp.text();
        console.log(`HTML fetched for platform detection: ${html.length} chars`);
      } else {
        console.log(`HTML fetch failed: HTTP ${resp.status}`);
      }
    } catch (e) {
      console.log(`HTML fetch error: ${e}`);
    }
    
    // Detect platform
    const platform = detectPlatform(careersUrl, html);
    console.log(`Platform detected: ${platform} (has html: ${!!html}, html includes jobTitle-link: ${html?.includes('jobTitle-link')})`);
    
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
          jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey, platform);
        } else {
          jobs = sfJobs;
        }
        break;
      case "lever":
        const leverJobs = await scrapeLever(careersUrl, company.name, country);
        if (leverJobs === null || leverJobs.length === 0) {
          // Lever scraper failed, fall back to Firecrawl
          console.log(`  [Fallback] Lever scraper failed, using Firecrawl`);
          jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey, platform);
        } else {
          jobs = leverJobs;
        }
        break;
      case "workday":
        // Check if company uses fallback system
        const companyId = company.name.toLowerCase().replace(/\s+/g, '-');
        const fallbackConfig = WORKDAY_FALLBACK_REGISTRY[companyId];
        
        if (fallbackConfig && fallbackConfig.enabled) {
          console.log(`  [Workday] ${company.name} uses fallback: ${fallbackConfig.fallbackType}`);
          const fallbackResult = await fetchJobsWithFallback(companyId, company.name, careersUrl);
          
          if (fallbackResult.source !== 'BLOCKED' && fallbackResult.jobs.length > 0) {
            jobs = fallbackResult.jobs;
            console.log(`  [Workday] ✅ Got ${jobs.length} jobs via ${fallbackResult.source}`);
            break;
          } else {
            console.log(`  [Workday] ⚠️ ${company.name} is blocked - needs feed/partnership`);
            jobs = [];
            break;
          }
        }
        
        // Try Apify if API key available (best for bot-protected sites)
        const apifyKey = process.env.APIFY_API_KEY;
        if (apifyKey) {
          console.log(`  [Workday] Trying Apify for ${company.name}...`);
          const apifyJobs = await scrapeWorkdayWithApify(careersUrl, company.name, { apiKey: apifyKey });
          if (apifyJobs && apifyJobs.length > 0) {
            jobs = apifyJobs.map(aj => ({
              title: aj.title || 'Unknown',
              company: company.name,
              country: country,
              location: aj.location || 'Unknown',
              department: undefined,
              url: aj.url || careersUrl
            }));
            console.log(`  [Workday] ✅ Got ${jobs.length} jobs via Apify`);
            break;
          }
        }
        
        // Try JSON API scraping (will fail for blocked sites)
        const workdayJobs = await scrapeWorkdayCompany(careersUrl, company.name);
        if (workdayJobs && workdayJobs.length > 0) {
          // Convert Workday format to our Job format
          jobs = workdayJobs.map(wj => ({
            title: wj.title,
            company: wj.company_name,
            country: wj.primary_country,
            location: wj.locations.join(', '),
            department: undefined,
            url: wj.applyUrl
          }));
        } else {
          // All Workday sites currently blocked - show status message
          const status = getCompanyStatus(companyId);
          console.log(`  [Workday] ${status.message}`);
          jobs = [];
        }
        break;
      case "greenhouse":
        const ghJobs = await scrapeGreenhouse(careersUrl, company.name, country);
        console.log(`  [Greenhouse] Scraper returned ${ghJobs?.length || 0} jobs`);
        if (ghJobs === null || ghJobs.length === 0) {
          // Greenhouse scraper failed, fall back to Firecrawl
          console.log(`  [Fallback] Greenhouse API failed, using Firecrawl`);
          jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey, platform);
        } else {
          jobs = ghJobs;
        }
        break;
      case "unknown":
      default:
        // Use Firecrawl AI for unknown platforms
        jobs = await scrapeWithFirecrawl(careersUrl, company.name, country, apiKey, platform);
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
  
  // Run companies sequentially to avoid timeout issues with parallel pagination
  const results: Job[][] = [];
  for (const company of COMPANIES) {
    const jobs = await crawlSingleCompany(company, apiKey);
    results.push(jobs);
  }
  
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
    
    // Check if cache is expired
    const cacheExpired = cacheTimestamp && (Date.now() - cacheTimestamp) > CACHE_DURATION_MS;
    
    if (!cachedJobs || recrawl || cacheExpired) {
      if (cacheExpired) {
        console.log(`\n========== CACHE EXPIRED - RECRAWLING ==========`);
      }
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
