// ============================================================
// WORKDAY CONNECTOR
// Professional JSON API-based connector for Workday sites
// ============================================================

interface WorkdaySource {
  host: string;
  tenant: string;
  site: string;
  locale?: string;
  careersUrl: string;
}

interface WorkdayJob {
  canonicalJobId: string;
  company_id: string;
  company_name: string;
  title: string;
  locations: string[];
  countries: string[];
  primary_country: string;
  postedAt?: Date;
  updatedAt?: Date;
  descriptionHtml?: string;
  descriptionText?: string;
  applyUrl: string;
  sourceHost: string;
  tenant: string;
  site: string;
  jobId: string;
}

interface WorkdayAPIResponse {
  total: number;
  jobPostings: Array<{
    title: string;
    bulletFields: string[];
    externalPath: string;
    postedOn?: string;
    locationsText?: string;
  }>;
}

// ============================================================
// DISCOVERY: Find Workday host, tenant, site from URL
// ============================================================

export async function discoverWorkdaySource(inputUrl: string): Promise<WorkdaySource | null> {
  console.log(`[Workday Discovery] Starting discovery for: ${inputUrl}`);
  
  // Normalize URL
  let url = inputUrl.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  
  const urlObj = new URL(url);
  
  // Check if it's already a Workday URL
  if (urlObj.hostname.includes('myworkdayjobs.com')) {
    return await extractWorkdaySourceFromWorkdayURL(url);
  }
  
  // Otherwise, fetch the wrapper site and find Workday links
  return await findWorkdaySourceFromWrapperSite(url);
}

async function extractWorkdaySourceFromWorkdayURL(url: string): Promise<WorkdaySource | null> {
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  
  // Extract tenant from subdomain (e.g., "lego" from "lego.wd3.myworkdayjobs.com")
  const tenantMatch = host.match(/^([^.]+)\./);
  const tenant = tenantMatch ? tenantMatch[1] : '';
  
  // Extract site from path (e.g., "LEGO_Careers" from "/en-US/LEGO_Careers")
  const pathParts = urlObj.pathname.split('/').filter(p => p);
  let site = '';
  let locale = '';
  
  // Check if first part is a locale (e.g., "en-US", "da-DK")
  if (pathParts[0] && /^[a-z]{2}-[A-Z]{2}$/.test(pathParts[0])) {
    locale = pathParts[0];
    site = pathParts[1] || '';
  } else {
    site = pathParts[0] || '';
  }
  
  if (!site) {
    console.log(`[Workday Discovery] Could not extract site from URL: ${url}`);
    return null;
  }
  
  const source: WorkdaySource = {
    host,
    tenant,
    site,
    locale,
    careersUrl: url
  };
  
  // Verify by calling jobs endpoint
  const verified = await verifyWorkdaySource(source);
  if (verified) {
    console.log(`[Workday Discovery] ✅ Verified: ${host}/${tenant}/${site}`);
    return source;
  }
  
  return null;
}

async function findWorkdaySourceFromWrapperSite(url: string): Promise<WorkdaySource | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) {
      console.log(`[Workday Discovery] Failed to fetch wrapper site: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Find Workday links in HTML
    const workdayLinkRegex = /https?:\/\/[^"'\s]+\.myworkdayjobs\.com[^"'\s]*/g;
    const matches = html.match(workdayLinkRegex);
    
    if (!matches || matches.length === 0) {
      console.log(`[Workday Discovery] No Workday links found in wrapper site`);
      return null;
    }
    
    // Try first valid link
    for (const link of matches) {
      const cleanLink = link.replace(/["'>\s].*$/, '');
      const source = await extractWorkdaySourceFromWorkdayURL(cleanLink);
      if (source) {
        return source;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[Workday Discovery] Error:`, error);
    return null;
  }
}

async function verifyWorkdaySource(source: WorkdaySource): Promise<boolean> {
  const endpoint = `https://${source.host}/wday/cxs/${source.tenant}/${source.site}/jobs`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': source.careersUrl,
        'Origin': `https://${source.host}`
      },
      body: JSON.stringify({
        limit: 1,
        offset: 0,
        searchText: '',
        appliedFacets: {}
      })
    });
    
    // Log response details for debugging
    const contentType = response.headers.get('content-type') || '';
    const status = response.status;
    
    if (response.ok) {
      const data = await response.json();
      return data && typeof data.total === 'number';
    }
    
    // Log failed response for debugging
    const responseBody = await response.text();
    const errorType = classifyWorkdayError(status, contentType, responseBody);
    console.log(`[Workday Verify] Failed: HTTP ${status}, Type: ${errorType}`);
    console.log(`[Workday Verify] Content-Type: ${contentType}`);
    console.log(`[Workday Verify] Body (first 500 chars): ${responseBody.substring(0, 500)}`);
    
    return false;
  } catch (error) {
    console.error(`[Workday Verify] Network error:`, error);
    return false;
  }
}

function classifyWorkdayError(status: number, contentType: string, body: string): string {
  // 422 = Bad request payload (wrong format/validation)
  if (status === 422) {
    if (contentType.includes('json')) {
      try {
        const json = JSON.parse(body);
        if (json.errorCode) return 'VALIDATION_ERROR';
      } catch {}
    }
    return 'BAD_REQUEST';
  }
  
  // 403/429 = Rate limited or forbidden
  if (status === 403 || status === 429) return 'RATE_LIMITED';
  
  // 500/503 = Only classify as bot detection if we see known signatures
  if (status === 500 || status === 503) {
    const bodyLower = body.toLowerCase();
    
    // Known bot challenge signatures
    if (bodyLower.includes('cloudflare') && (bodyLower.includes('challenge') || bodyLower.includes('checking'))) {
      return 'BOT_CHALLENGE_CLOUDFLARE';
    }
    if (bodyLower.includes('access denied') || bodyLower.includes('forbidden')) {
      return 'BOT_DETECTED';
    }
    if (bodyLower.includes('workday is currently unavailable') || bodyLower.includes('temporarily unavailable')) {
      return 'BOT_DETECTED_WORKDAY';
    }
    if (bodyLower.includes('ddos') || bodyLower.includes('rate limit')) {
      return 'RATE_LIMITED';
    }
    
    // Otherwise, unknown server error
    return 'SERVER_ERROR_UNKNOWN';
  }
  
  return 'UNKNOWN';
}

// ============================================================
// FETCH ALL JOBS with pagination
// ============================================================

export async function fetchAllWorkdayJobs(
  source: WorkdaySource,
  companyName: string
): Promise<WorkdayJob[]> {
  console.log(`[Workday Fetch] Fetching all jobs for ${companyName}`);
  
  const endpoint = `https://${source.host}/wday/cxs/${source.tenant}/${source.site}/jobs`;
  const allJobs: WorkdayJob[] = [];
  const limit = 20; // Workday typical page size
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': source.careersUrl,
          'Origin': `https://${source.host}`
        },
        body: JSON.stringify({
          limit,
          offset,
          searchText: '',
          appliedFacets: {}
        })
      });
      
      if (!response.ok) {
        console.error(`[Workday Fetch] HTTP ${response.status} at offset ${offset}`);
        break;
      }
      
      const data: WorkdayAPIResponse = await response.json();
      
      if (!data.jobPostings || data.jobPostings.length === 0) {
        console.log(`[Workday Fetch] No more jobs at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      console.log(`[Workday Fetch] Fetched ${data.jobPostings.length} jobs at offset ${offset} (total: ${data.total})`);
      
      // Parse and normalize jobs
      for (const rawJob of data.jobPostings) {
        const normalizedJob = normalizeWorkdayJob(rawJob, source, companyName);
        if (normalizedJob) {
          allJobs.push(normalizedJob);
        }
      }
      
      offset += limit;
      
      // Safety check: if we've fetched more than total, stop
      if (offset >= data.total) {
        hasMore = false;
      }
      
      // Rate limiting: 1 req/sec
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`[Workday Fetch] Error at offset ${offset}:`, error);
      hasMore = false;
    }
  }
  
  console.log(`[Workday Fetch] ✅ Total jobs fetched: ${allJobs.length}`);
  return allJobs;
}

// ============================================================
// NORMALIZE: Parse Workday job to our schema
// ============================================================

function normalizeWorkdayJob(
  rawJob: any,
  source: WorkdaySource,
  companyName: string
): WorkdayJob | null {
  if (!rawJob.title) return null;
  
  // Extract job ID from externalPath
  const jobIdMatch = rawJob.externalPath?.match(/\/job\/([^\/]+)/);
  const jobId = jobIdMatch ? jobIdMatch[1] : rawJob.externalPath || `job-${Date.now()}`;
  
  // Build canonical ID
  const canonicalJobId = `${source.host}:${source.tenant}:${source.site}:${jobId}`;
  
  // Parse locations and countries
  const { locations, countries, primary_country } = parseLocationsAndCountries(rawJob);
  
  // Build apply URL
  const applyUrl = rawJob.externalPath 
    ? `https://${source.host}${rawJob.externalPath}`
    : source.careersUrl;
  
  // Parse posted date
  let postedAt: Date | undefined;
  if (rawJob.postedOn) {
    postedAt = new Date(rawJob.postedOn);
  }
  
  return {
    canonicalJobId,
    company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
    company_name: companyName,
    title: rawJob.title,
    locations,
    countries,
    primary_country,
    postedAt,
    updatedAt: new Date(),
    applyUrl,
    sourceHost: source.host,
    tenant: source.tenant,
    site: source.site,
    jobId
  };
}

// ============================================================
// LOCATION & COUNTRY PARSING (CRITICAL FOR FILTERING)
// ============================================================

interface LocationParseResult {
  locations: string[];
  countries: string[];
  primary_country: string;
}

function parseLocationsAndCountries(rawJob: any): LocationParseResult {
  const locations: string[] = [];
  const countriesSet = new Set<string>();
  
  // Extract locations from various fields
  if (rawJob.locationsText) {
    locations.push(rawJob.locationsText);
  }
  
  if (rawJob.bulletFields && Array.isArray(rawJob.bulletFields)) {
    for (const field of rawJob.bulletFields) {
      if (typeof field === 'string' && field.trim()) {
        locations.push(field.trim());
      }
    }
  }
  
  // Parse countries from each location string
  for (const location of locations) {
    const detectedCountries = detectCountriesFromLocation(location);
    detectedCountries.forEach(c => countriesSet.add(c));
  }
  
  const countries = Array.from(countriesSet);
  const primary_country = countries[0] || 'UNKNOWN';
  
  return {
    locations,
    countries,
    primary_country
  };
}

// Country detection from location strings
function detectCountriesFromLocation(location: string): string[] {
  const lowerLoc = location.toLowerCase();
  const countries: string[] = [];
  
  // Denmark detection
  if (lowerLoc.includes('denmark') || lowerLoc.includes('danmark') || 
      lowerLoc.includes('billund') || lowerLoc.includes('copenhagen') || 
      lowerLoc.includes('københavn') || lowerLoc.includes('aarhus') ||
      lowerLoc.includes('odense') || lowerLoc.includes('aalborg')) {
    countries.push('DK');
  }
  
  // Sweden detection
  if (lowerLoc.includes('sweden') || lowerLoc.includes('sverige') ||
      lowerLoc.includes('stockholm') || lowerLoc.includes('göteborg') ||
      lowerLoc.includes('gothenburg') || lowerLoc.includes('malmö') ||
      lowerLoc.includes('malmo')) {
    countries.push('SE');
  }
  
  // Norway detection
  if (lowerLoc.includes('norway') || lowerLoc.includes('norge') ||
      lowerLoc.includes('oslo') || lowerLoc.includes('bergen') ||
      lowerLoc.includes('trondheim') || lowerLoc.includes('stavanger')) {
    countries.push('NO');
  }
  
  // Add more countries as needed
  if (lowerLoc.includes('united kingdom') || lowerLoc.includes('uk') ||
      lowerLoc.includes('england') || lowerLoc.includes('london')) {
    countries.push('GB');
  }
  
  if (lowerLoc.includes('germany') || lowerLoc.includes('deutschland') ||
      lowerLoc.includes('berlin') || lowerLoc.includes('munich') ||
      lowerLoc.includes('münchen')) {
    countries.push('DE');
  }
  
  if (lowerLoc.includes('poland') || lowerLoc.includes('polska') ||
      lowerLoc.includes('warsaw') || lowerLoc.includes('krakow') ||
      lowerLoc.includes('gdansk') || lowerLoc.includes('gdańsk')) {
    countries.push('PL');
  }
  
  if (lowerLoc.includes('united states') || lowerLoc.includes('usa') ||
      /\b[A-Z]{2}\b/.test(location) && lowerLoc.includes(',')) { // State codes
    countries.push('US');
  }
  
  return countries;
}

// ============================================================
// PUBLIC API
// ============================================================

export async function scrapeWorkdayCompany(
  careersUrl: string,
  companyName: string
): Promise<WorkdayJob[]> {
  console.log(`\n[Workday] Starting scrape for ${companyName}`);
  console.log(`[Workday] URL: ${careersUrl}`);
  
  // Step 1: Discover Workday source
  const source = await discoverWorkdaySource(careersUrl);
  if (!source) {
    console.log(`[Workday] ❌ Could not discover Workday source`);
    return [];
  }
  
  console.log(`[Workday] ✅ Discovered: ${source.host}/${source.tenant}/${source.site}`);
  
  // Step 2: Fetch all jobs
  const jobs = await fetchAllWorkdayJobs(source, companyName);
  
  console.log(`[Workday] ✅ Completed: ${jobs.length} jobs`);
  return jobs;
}
