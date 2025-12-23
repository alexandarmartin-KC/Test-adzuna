// Shared job cache and fetching logic
// Used by both /api/firecrawl/jobs and /api/job-match

import { COMPANIES, CompanyConfig } from "./companies";

export interface Job {
  title: string;
  company: string;
  country: string;
  location: string;
  department?: string;
  url: string;
}

// Shared cache
let cachedJobs: Job[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedJobs(): { jobs: Job[] | null; timestamp: number | null } {
  return { jobs: cachedJobs, timestamp: cacheTimestamp };
}

export function setCachedJobs(jobs: Job[]): void {
  cachedJobs = jobs;
  cacheTimestamp = Date.now();
}

export function isCacheValid(): boolean {
  if (!cachedJobs || !cacheTimestamp) return false;
  return (Date.now() - cacheTimestamp) < CACHE_DURATION_MS;
}

// Greenhouse scraper (FREE - uses public API)
export async function scrapeGreenhouse(careersUrl: string, companyName: string, country: string): Promise<Job[]> {
  try {
    const boardMatch = careersUrl.match(/greenhouse\.io\/([^\/\?]+)/);
    if (!boardMatch) return [];
    
    const boardId = boardMatch[1];
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=false`;
    
    const response = await fetch(apiUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.jobs || !Array.isArray(data.jobs)) return [];
    
    return data.jobs.map((job: any) => {
      const locationName = job.location?.name || 'Unknown';
      const locLower = locationName.toLowerCase();
      
      let jobCountry = 'Unknown';
      if (locLower.includes('denmark') || locLower.includes('danmark') || 
          locLower.includes('copenhagen') || locLower.includes('skovlunde')) {
        jobCountry = 'DK';
      } else if (locLower.includes('sweden') || locLower.includes('stockholm')) {
        jobCountry = 'SE';
      } else if (locLower.includes('norway') || locLower.includes('oslo')) {
        jobCountry = 'NO';
      } else if (locLower.includes('united kingdom') || locLower.includes('london')) {
        jobCountry = 'GB';
      }
      
      return {
        title: job.title || 'Unknown',
        company: companyName,
        country: jobCountry,
        location: locationName,
        department: job.departments?.[0]?.name,
        url: job.absolute_url || `https://boards.greenhouse.io/embed/job_app?token=${job.id}`
      };
    });
  } catch {
    return [];
  }
}

// Emply scraper (FREE - uses public API)
export async function scrapeEmply(careersUrl: string, companyName: string, country: string): Promise<Job[]> {
  try {
    // Find Emply subdomain
    let emplyUrl = careersUrl;
    if (!careersUrl.includes('emply.com')) {
      const domain = careersUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
      const company = domain.split('.')[0];
      emplyUrl = `https://${company}.career.emply.com`;
    }
    
    const resp = await fetch(emplyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!resp.ok) return [];
    
    const html = await resp.text();
    
    // Extract section ID
    const sectionMatch = html.match(/sectionId:\s*(\d+)/);
    if (!sectionMatch) return [];
    
    const sectionId = sectionMatch[1];
    const apiUrl = `${emplyUrl}/api/Positions?sectionId=${sectionId}`;
    
    const apiResp = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!apiResp.ok) return [];
    
    const data = await apiResp.json();
    if (!data.groups) return [];
    
    const jobs: Job[] = [];
    for (const group of data.groups) {
      if (!group.positions) continue;
      for (const pos of group.positions) {
        jobs.push({
          title: pos.title || 'Unknown',
          company: companyName,
          country: country,
          location: pos.address || 'Unknown',
          department: pos.departmentLabel,
          url: `${emplyUrl}/ad/${pos.slug}/${pos.shortId}`
        });
      }
    }
    
    return jobs;
  } catch {
    return [];
  }
}

// Quick job fetch for job matching (uses cache or fetches fresh)
export async function getJobsForMatching(): Promise<Job[]> {
  // Return cached if valid
  if (isCacheValid() && cachedJobs) {
    return cachedJobs;
  }
  
  // Quick fetch from known fast sources
  const jobs: Job[] = [];
  
  for (const company of COMPANIES) {
    try {
      const url = company.careersUrl.toLowerCase();
      let companyJobs: Job[] = [];
      
      if (url.includes('greenhouse.io')) {
        companyJobs = await scrapeGreenhouse(company.careersUrl, company.name, company.country || 'Unknown');
      } else if (url.includes('emply.com') || (!url.includes('http') && !url.includes('/'))) {
        companyJobs = await scrapeEmply(company.careersUrl, company.name, company.country || 'DK');
      }
      
      jobs.push(...companyJobs);
    } catch {
      continue;
    }
  }
  
  // Cache the results
  if (jobs.length > 0) {
    setCachedJobs(jobs);
  }
  
  return jobs;
}
