// Apify Workday Jobs API Integration
// Actor: fantastic-jobs/workday-jobs-api

export interface ApifyWorkdayInput {
  start_url: string;
  max_items?: number;
  proxy_configuration?: {
    useApifyProxy: boolean;
  };
  keyword_filter?: string;
  location_filter?: string;
}

export interface ApifyRunStatus {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
  defaultDatasetId: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface ApifyDatasetItem {
  jobId?: string;
  requisitionId?: string;
  title: string;
  company?: string;
  location?: string;
  locations?: string[];
  country?: string;
  countries?: string[];
  description?: string;
  postedDate?: string;
  applyUrl?: string;
  url?: string;
  [key: string]: any;
}

const APIFY_API_BASE = 'https://api.apify.com/v2';

function getApifyToken(): string {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable is required');
  }
  return token;
}

function getActorId(): string {
  return process.env.APIFY_ACTOR_ID || 'pulse_automation~workday-job-scraper-fast-edition';
}

/**
 * Start an Apify actor run
 */
export async function runActor(input: ApifyWorkdayInput): Promise<string> {
  const token = getApifyToken();
  const actorId = getActorId();
  
  console.log(`[Apify] Starting actor: ${actorId}`);
  
  const response = await fetch(`${APIFY_API_BASE}/acts/${actorId}/runs?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start actor: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  console.log(`[Apify] Run started: ${data.data.id}`);
  
  return data.data.id;
}

/**
 * Wait for actor run to complete
 */
export async function waitForRun(
  runId: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<ApifyRunStatus> {
  const token = getApifyToken();
  const timeoutMs = options.timeoutMs || 1200000; // 20 minutes
  const pollIntervalMs = options.pollIntervalMs || 5000; // 5 seconds
  const startTime = Date.now();
  
  console.log(`[Apify] Waiting for run: ${runId}`);
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}?token=${token}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get run status: ${response.status}`);
    }
    
    const data = await response.json();
    const status: ApifyRunStatus = data.data;
    
    console.log(`[Apify] Run status: ${status.status}`);
    
    if (status.status === 'SUCCEEDED') {
      console.log(`[Apify] Run completed successfully`);
      return status;
    }
    
    if (status.status === 'FAILED' || status.status === 'ABORTED' || status.status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status.status}: ${runId}`);
    }
    
    // Still running, wait and poll again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new Error(`Actor run timed out after ${timeoutMs}ms`);
}

/**
 * Fetch all items from dataset with pagination
 */
export async function fetchDatasetItems(
  datasetId: string,
  options: { limit?: number } = {}
): Promise<ApifyDatasetItem[]> {
  const token = getApifyToken();
  const allItems: ApifyDatasetItem[] = [];
  let offset = 0;
  const limit = 1000; // Apify max per request
  const maxItems = options.limit || Infinity;
  
  console.log(`[Apify] Fetching dataset: ${datasetId}`);
  
  while (allItems.length < maxItems) {
    const url = `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${token}&clean=true&format=json&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset items: ${response.status}`);
    }
    
    const items: ApifyDatasetItem[] = await response.json();
    
    if (items.length === 0) {
      break; // No more items
    }
    
    allItems.push(...items);
    console.log(`[Apify] Fetched ${allItems.length} items so far...`);
    
    if (items.length < limit) {
      break; // Last page
    }
    
    offset += limit;
  }
  
  console.log(`[Apify] Total items fetched: ${allItems.length}`);
  
  return allItems.slice(0, maxItems);
}

/**
 * Run actor and wait for completion, then fetch results
 */
export async function runActorAndFetchResults(
  input: ApifyWorkdayInput,
  options: { maxItems?: number; timeoutMs?: number } = {}
): Promise<ApifyDatasetItem[]> {
  const runId = await runActor(input);
  const status = await waitForRun(runId, { timeoutMs: options.timeoutMs });
  const items = await fetchDatasetItems(status.defaultDatasetId, { limit: options.maxItems });
  
  return items;
}
