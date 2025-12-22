import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// ============================================================
// UNIVERSAL JOB CRAWLER
// Just add company name and careers URL - system handles the rest!
// ============================================================

interface Job {
  title: string;
  company: string;
  country: string;
  location: string;
  department?: string;
  url: string;
}

interface CompanyConfig {
  name: string;
  careersUrl: string;
  country?: string;
}

// ============================================================
// ADD YOUR COMPANIES HERE - just name and careers URL!
// ============================================================
const COMPANIES: CompanyConfig[] = [
  { name: "Ørsted", careersUrl: "https://orsted.com/en/careers/vacancies-list" },
  { name: "Novo Nordisk", careersUrl: "https://careers.novonordisk.com/search/?q=&locationsearch=denmark", country: "DK" },
  { name: "Matas", careersUrl: "https://matas.career.emply.com/ledige-stillinger", country: "DK" },
  // Add more: { name: "Company", careersUrl: "https://..." },
];

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
// PLATFORM DETECTION - Auto-detect career site platform
// ============================================================

type Platform = "emply" | "successfactors" | "greenhouse" | "workday" | "lever" | "unknown";

function detectPlatform(url: string, html?: string): Platform {
  const lower = url.toLowerCase();
  
  // URL-based detection
  if (lower.includes('.emply.com') || lower.includes('career.emply')) return "emply";
  if (lower.includes('successfactors') || lower.includes('jobs.sap.com')) return "successfactors";
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
// SUCCESSFACTORS SCRAPER (Novo Nordisk, etc.) - Direct HTML, 0 credits!
// ============================================================

async function scrapeSuccessFactors(careersUrl: string, companyName: string, country: string): Promise<Job[]> {
  const baseUrl = new URL(careersUrl).origin;
  console.log(`  [SuccessFactors] Scraping ${companyName}...`);
  
  try {
    const response = await fetch(careersUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) return [];
    const html = await response.text();
    
    const jobs: Job[] = [];
    const seenUrls = new Set<string>();
    
    // Extract jobs with jobTitle-link class
    const regex = /href="(\/job\/[^"]+)"[^>]*class="jobTitle-link"[^>]*>([^<]+)<\/a>/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      const jobPath = match[1];
      const title = match[2].trim();
      if (!seenUrls.has(jobPath)) {
        seenUrls.add(jobPath);
        
        // Extract location from path: /job/Location-Title/123/
        const pathParts = decodeURIComponent(jobPath).split('/').filter(p => p && p !== 'job');
        const location = pathParts[0]?.split('-')[0] || 'Denmark';
        
        jobs.push({
          title,
          company: companyName,
          country: country,
          location,
          url: `${baseUrl}${jobPath}`,
        });
      }
    }
    
    // Also extract locations if available
    const locationRegex = /<span class="jobLocation">\s*([^<]+)\s*<\/span>/g;
    const locations: string[] = [];
    while ((match = locationRegex.exec(html)) !== null) {
      locations.push(match[1].trim());
    }
    jobs.forEach((job, i) => { if (locations[i]) job.location = locations[i]; });
    
    console.log(`  [SuccessFactors] Found ${jobs.length} jobs (FREE - 0 credits)`);
    return jobs;
  } catch (error) {
    console.error(`  [SuccessFactors] Error:`, error);
    return [];
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
    
    // Filter to job-specific links
    const jobLinks = pageLinks.filter(link => {
      const l = link.toLowerCase();
      return link.startsWith('http') && (
        l.includes('/job') || l.includes('/ad/') || l.includes('/vacancy') ||
        l.includes('/position') || l.includes('/career') ||
        /\/\d{4,}[-/]/.test(l) || /\/[a-z0-9]{5,8}$/.test(l)
      );
    });
    
    const jobs: Job[] = [];
    const usedLinks = new Set<string>();
    
    for (const job of extractedJobs) {
      // Try to find matching URL
      let jobUrl = job.url || careersUrl;
      
      if (!jobUrl.includes('/job') && !jobUrl.includes('/ad/') && job.title) {
        const slug = titleToSlug(job.title);
        const words = slug.split('-').filter((w: string) => w.length > 2);
        
        for (const link of jobLinks) {
          if (usedLinks.has(link)) continue;
          const linkSlug = link.toLowerCase().split('/').pop() || '';
          
          // Check for match
          if (linkSlug.includes(slug) || words.filter((w: string) => linkSlug.includes(w)).length >= 2) {
            jobUrl = link;
            usedLinks.add(link);
            break;
          }
        }
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
    
    console.log(`  [Firecrawl] Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error(`  [Firecrawl] Error:`, error);
    return [];
  }
}


// ============================================================
// MAIN CRAWLER - Auto-detects platform and uses best method
// ============================================================

async function crawlJobs(): Promise<Job[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  
  const allJobs: Job[] = [];
  
  for (const company of COMPANIES) {
    console.log(`\n=== ${company.name} ===`);
    console.log(`URL: ${company.careersUrl}`);
    
    const country = company.country || 'DK';
    
    // Try to fetch HTML to detect platform
    let html: string | undefined;
    try {
      const resp = await fetch(company.careersUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (resp.ok) html = await resp.text();
    } catch (e) { /* ignore */ }
    
    // Detect platform
    const platform = detectPlatform(company.careersUrl, html);
    console.log(`Platform detected: ${platform}`);
    
    let jobs: Job[] = [];
    
    // Use platform-specific scraper (FREE) or Firecrawl (credits)
    switch (platform) {
      case "emply":
        jobs = await scrapeEmply(company.careersUrl, company.name, country);
        break;
      case "successfactors":
        jobs = await scrapeSuccessFactors(company.careersUrl, company.name, country);
        break;
      case "greenhouse":
      case "workday":
      case "lever":
      case "unknown":
      default:
        // Use Firecrawl AI for unknown platforms
        jobs = await scrapeWithFirecrawl(company.careersUrl, company.name, country, apiKey);
    }
    
    // Deduplicate by URL
    const uniqueJobs = Array.from(
      new Map(jobs.map(j => [j.url, j])).values()
    );
    
    allJobs.push(...uniqueJobs);
    console.log(`✅ ${company.name}: ${uniqueJobs.length} jobs`);
  }
  
  return allJobs;
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
