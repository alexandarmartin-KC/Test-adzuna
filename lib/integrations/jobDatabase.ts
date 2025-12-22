// Database operations for Workday jobs
import { NormalizedJob } from './jobNormalization';

// Mock database for now - replace with actual DB implementation
interface JobRecord extends NormalizedJob {
  id?: number;
  created_at?: string;
  last_seen_at?: string;
  is_active?: boolean;
}

// In-memory storage (replace with actual database)
const jobsStore = new Map<string, JobRecord>();

export interface UpsertResult {
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
}

/**
 * Upsert jobs into database
 * Uses canonical_job_id as unique key
 */
export async function upsertJobs(jobs: NormalizedJob[]): Promise<UpsertResult> {
  const result: UpsertResult = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
  };
  
  const now = new Date().toISOString();
  
  for (const job of jobs) {
    try {
      const existing = jobsStore.get(job.canonical_job_id);
      
      if (!existing) {
        // Insert new job
        const record: JobRecord = {
          ...job,
          created_at: now,
          last_seen_at: now,
          is_active: true,
        };
        jobsStore.set(job.canonical_job_id, record);
        result.inserted++;
      } else {
        // Check if anything changed
        const hasChanges = 
          existing.title !== job.title ||
          existing.apply_url !== job.apply_url ||
          JSON.stringify(existing.locations) !== JSON.stringify(job.locations) ||
          JSON.stringify(existing.countries) !== JSON.stringify(job.countries);
        
        if (hasChanges) {
          // Update existing job
          const record: JobRecord = {
            ...existing,
            ...job,
            last_seen_at: now,
            is_active: true,
          };
          jobsStore.set(job.canonical_job_id, record);
          result.updated++;
        } else {
          // Just update last_seen_at
          existing.last_seen_at = now;
          existing.is_active = true;
          result.unchanged++;
        }
      }
    } catch (error) {
      console.error(`Failed to upsert job: ${job.canonical_job_id}`, error);
      result.failed++;
    }
  }
  
  return result;
}

/**
 * Mark jobs not in the current batch as inactive
 */
export async function markMissingJobsInactive(
  companyId: string,
  currentJobIds: string[]
): Promise<number> {
  let markedInactive = 0;
  const currentSet = new Set(currentJobIds);
  
  for (const [jobId, job] of jobsStore.entries()) {
    if (job.company_id === companyId && job.is_active && !currentSet.has(jobId)) {
      job.is_active = false;
      markedInactive++;
    }
  }
  
  return markedInactive;
}

/**
 * Query jobs by company and country
 */
export async function queryJobs(filters: {
  companyId?: string;
  country?: string;
  isActive?: boolean;
}): Promise<JobRecord[]> {
  const results: JobRecord[] = [];
  
  for (const job of jobsStore.values()) {
    let matches = true;
    
    if (filters.companyId && job.company_id !== filters.companyId) {
      matches = false;
    }
    
    if (filters.country && !job.countries.includes(filters.country)) {
      matches = false;
    }
    
    if (filters.isActive !== undefined && job.is_active !== filters.isActive) {
      matches = false;
    }
    
    if (matches) {
      results.push(job);
    }
  }
  
  return results;
}

/**
 * Get job statistics
 */
export async function getJobStats(companyId?: string): Promise<{
  total: number;
  active: number;
  byCountry: Record<string, number>;
  byCompany: Record<string, number>;
}> {
  const stats = {
    total: 0,
    active: 0,
    byCountry: {} as Record<string, number>,
    byCompany: {} as Record<string, number>,
  };
  
  for (const job of jobsStore.values()) {
    if (companyId && job.company_id !== companyId) {
      continue;
    }
    
    stats.total++;
    if (job.is_active) {
      stats.active++;
    }
    
    // Count by primary country
    stats.byCountry[job.primary_country] = (stats.byCountry[job.primary_country] || 0) + 1;
    
    // Count by company
    stats.byCompany[job.company_id] = (stats.byCompany[job.company_id] || 0) + 1;
  }
  
  return stats;
}

/**
 * Clear all jobs (for testing)
 */
export async function clearAllJobs(): Promise<void> {
  jobsStore.clear();
}

/**
 * Export all jobs (for debugging)
 */
export function getAllJobs(): JobRecord[] {
  return Array.from(jobsStore.values());
}
