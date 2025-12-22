// Apify integration for scraping Workday sites
import { ApifyClient } from 'apify-client';

export interface ApifyWorkdayConfig {
  apiKey: string;
  actorId?: string; // Optional: custom actor ID
}

/**
 * Scrape Workday using Apify's cloud browsers
 * Apify can bypass bot protection better than local Puppeteer
 */
export async function scrapeWorkdayWithApify(
  careersUrl: string,
  companyName: string,
  config: ApifyWorkdayConfig
): Promise<any[]> {
  const client = new ApifyClient({ token: config.apiKey });
  
  console.log(`[Apify] Starting Workday scrape for ${companyName}...`);
  
  try {
    // Use Apify's Web Scraper actor (general purpose)
    const actorId = config.actorId || 'apify/web-scraper';
    
    const input = {
      startUrls: [{ url: careersUrl }],
      globs: [],
      pseudoUrls: [],
      pageFunction: `
        async function pageFunction(context) {
          const { page, request, log } = context;
          
          // Wait for jobs to load (using setTimeout instead of waitForTimeout)
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try to find job listings
          const jobs = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('[data-automation-id="jobPosting"], .job-item, .job-listing, [role="row"]');
            const results = [];
            
            jobElements.forEach(el => {
              const title = el.querySelector('[data-automation-id="jobTitle"], .job-title, h2, h3')?.textContent?.trim();
              const location = el.querySelector('[data-automation-id="locations"], .location')?.textContent?.trim();
              const url = el.querySelector('a')?.href;
              
              if (title) {
                results.push({ title, location, url });
              }
            });
            
            return results;
          });
          
          return {
            url: request.url,
            jobCount: jobs.length,
            jobs: jobs
          };
        }
      `,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'] // Use residential IPs
      },
      maxRequestRetries: 2,
      maxPagesPerCrawl: 1,
      maxConcurrency: 1
    };
    
    console.log(`[Apify] Running actor ${actorId}...`);
    const run = await client.actor(actorId).call(input);
    
    console.log(`[Apify] Run finished: ${run.id}`);
    console.log(`[Apify] Status: ${run.status}`);
    
    // Fetch results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      console.log(`[Apify] No results returned`);
      return [];
    }
    
    const result = items[0];
    console.log(`[Apify] Found ${result.jobCount} jobs`);
    
    return result.jobs || [];
    
  } catch (error) {
    console.error(`[Apify] Error:`, error.message);
    return [];
  }
}

/**
 * Alternative: Use Apify's Website Content Crawler for simpler extraction
 */
export async function scrapeWorkdayWithContentCrawler(
  careersUrl: string,
  companyName: string,
  apiKey: string
): Promise<any[]> {
  const client = new ApifyClient({ token: apiKey });
  
  console.log(`[Apify Content Crawler] Scraping ${companyName}...`);
  
  try {
    const input = {
      startUrls: [{ url: careersUrl }],
      crawlerType: 'playwright:chrome',
      includeUrlGlobs: [],
      excludeUrlGlobs: [],
      maxCrawlDepth: 0,
      maxCrawlPages: 1,
      initialConcurrency: 1,
      maxConcurrency: 1,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL']
      },
      dynamicContentWaitSecs: 5
    };
    
    const run = await client.actor('apify/website-content-crawler').call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      const content = items[0];
      console.log(`[Apify] Got page content, length: ${content.text?.length || 0}`);
      
      // Parse jobs from text content (simple extraction)
      const jobs = extractJobsFromText(content.text || '');
      console.log(`[Apify] Extracted ${jobs.length} jobs from content`);
      
      return jobs;
    }
    
    return [];
    
  } catch (error) {
    console.error(`[Apify Content Crawler] Error:`, error.message);
    return [];
  }
}

function extractJobsFromText(text: string): any[] {
  // Simple pattern matching for job listings
  // This is crude but can work for getting basic data
  const jobs: any[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for lines that might be job titles (heuristic)
    if (line.length > 10 && line.length < 100 && !line.includes('©') && !line.includes('http')) {
      const nextLine = lines[i + 1]?.trim() || '';
      if (nextLine.length > 0 && nextLine.length < 100) {
        jobs.push({
          title: line,
          location: nextLine,
          url: ''
        });
      }
    }
  }
  
  return jobs.slice(0, 50); // Limit to first 50
}

/**
 * Test Apify connection and credits
 */
export async function testApifyConnection(apiKey: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const client = new ApifyClient({ token: apiKey });
    const user = await client.user().get();
    
    return {
      success: true,
      user: {
        username: user.username,
        email: user.email,
        plan: user.plan
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
