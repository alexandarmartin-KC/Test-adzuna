// CoreSignal API Client for Job Search

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url: string;
  externalUrl?: string; // Direct link to company career page
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  employmentType?: string;
  department?: string;
  seniority?: string;
  salaryMin?: number;
  salaryMax?: number;
  sourcesCount?: number; // Number of sources this job was found in
};

// CoreSignal API response types
interface CoreSignalJobDetail {
  id: number;
  title?: string;
  company_name?: string;
  location?: string;
  country?: string;
  city?: string;
  description?: string;
  application_url?: string;
  url?: string;
  external_url?: string; // Direct link to company career page
  created_at?: string;
  updated_at?: string;
  date_posted?: string;
  valid_through?: string;
  job_id_expired?: number; // 0 = active, 1 = expired/inactive
  status?: number;
  employment_type?: string;
  department?: string;
  seniority?: string;
  job_sources?: Array<{
    source: string;
    source_id: string;
    url: string;
    status: string;
    updated_at: string;
  }>;
  salary?: Array<{
    min_amount?: number;
    max_amount?: number;
    currency?: string;
  }>;
}

/**
 * Fetch job listings from CoreSignal API
 * CoreSignal uses a two-step process:
 * 1. Search for job IDs using Elasticsearch DSL
 * 2. Collect full job details for each ID
 * Filtered to Nordic countries only (Denmark, Sweden, Norway, Finland, Iceland)
 */
export async function fetchCoreSignalJobs(params: {
  what?: string;
  where?: string;
  country?: string;
  company?: string;
  page?: number;
  resultsPerPage?: number;
  activeOnly?: boolean;
}): Promise<NormalizedJob[]> {
  const {
    what = "",
    where = "",
    country = "",
    company = "",
    page = 1,
    resultsPerPage = 20,
    activeOnly = true,
  } = params;

  const apiKey = "KecMYsVhfFRcKfaIepAVwUTkN6dJyCH8";
  const searchUrl = "https://api.coresignal.com/cdapi/v2/job_multi_source/search/es_dsl";
  const collectUrl = "https://api.coresignal.com/cdapi/v2/job_multi_source/collect";

  // Build Elasticsearch DSL query
  const mustClauses: any[] = [];
  
  if (what) {
    mustClauses.push({ match: { title: what } });
  }
  if (where) {
    mustClauses.push({ match: { location: where } });
  }
  if (company) {
    mustClauses.push({ match: { company_name: company } });
  }
  
  // Filter by specific Nordic country or all Nordic countries
  if (country) {
    mustClauses.push({ match: { country: country } });
  } else {
    // Default to all Nordic countries
    mustClauses.push({
      bool: {
        should: [
          { match: { country: "denmark" } },
          { match: { country: "sweden" } },
          { match: { country: "norway" } },
          { match: { country: "finland" } },
          { match: { country: "iceland" } }
        ],
        minimum_should_match: 1
      }
    });
  }

  // Filter for non-expired/active jobs only (when activeOnly is true)
  if (activeOnly) {
    mustClauses.push({ term: { "job_id_expired": 0 } });
  }

  const searchBody = {
    query: {
      bool: {
        must: mustClauses
      }
    }
  };

  try {
    // Step 1: Search for job IDs
    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
        "accept": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`CoreSignal Search API error (${searchResponse.status}): ${errorText}`);
    }

    const jobIds: number[] = await searchResponse.json();

    if (!jobIds || jobIds.length === 0) {
      return [];
    }

    // Step 2: Collect full details for each job ID
    // Fetch more than needed since we'll filter out stale jobs (those with all inactive sources)
    const limitedIds = jobIds.slice(0, Math.min(30, resultsPerPage * 3));
    const jobPromises = limitedIds.map(async (jobId) => {
      try {
        const collectResponse = await fetch(`${collectUrl}/${jobId}`, {
          method: "GET",
          headers: {
            "apikey": apiKey,
            "accept": "application/json",
          },
        });

        if (!collectResponse.ok) {
          console.error(`Failed to collect job ${jobId}: ${collectResponse.status}`);
          return null;
        }

        const jobData = await collectResponse.json() as CoreSignalJobDetail;
        
        // Check if response contains error (e.g., insufficient credits)
        if ((jobData as any).detail) {
          console.error(`API error for job ${jobId}: ${(jobData as any).detail}`);
          return null;
        }
        
        return jobData;
      } catch (err) {
        console.error(`Error collecting job ${jobId}:`, err);
        return null;
      }
    });

    const jobDetails = await Promise.all(jobPromises);

    // Map CoreSignal response to normalized format
    // Filter out jobs where ALL sources are inactive (stale jobs)
    const jobs: NormalizedJob[] = jobDetails
      .filter((job): job is CoreSignalJobDetail => {
        if (job === null) return false;
        
        // If activeOnly is enabled, check for active sources
        if (activeOnly) {
          // If job_sources data is missing or empty, exclude the job (data quality issue)
          if (!job.job_sources || job.job_sources.length === 0) {
            console.log(`Filtering out job without source data: ${job.title || job.id}`);
            return false;
          }
          
          // Only include jobs with at least one active source
          const hasActiveSource = job.job_sources.some(source => source.status === "active");
          if (!hasActiveSource) {
            console.log(`Filtering out stale job: ${job.title} (all sources inactive)`);
            return false;
          }
        }
        
        return true;
      })
      .map((job) => {
        // Check if job has at least one active source
        const hasActiveSource = job.job_sources?.some(source => source.status === "active") ?? false;
        
        return {
          id: job.id?.toString() || Math.random().toString(36).substr(2, 9),
          title: job.title || "Untitled Position",
          company: job.company_name || "Unknown Company",
          location: job.city || job.location || "Location not specified",
          country: job.country || country.toUpperCase(),
          description: job.description || "",
          url: job.external_url || job.application_url || job.url || "",
          externalUrl: job.external_url,
          createdAt: job.created_at || job.date_posted,
          updatedAt: job.updated_at,
          isActive: job.job_id_expired === 0 && hasActiveSource,
          employmentType: job.employment_type,
          department: job.department,
          seniority: job.seniority,
          salaryMin: job.salary?.[0]?.min_amount,
          salaryMax: job.salary?.[0]?.max_amount,
          sourcesCount: job.job_sources?.filter(s => s.status === "active").length || 0,
        };
      });

    // Deduplicate jobs - same title + company + city is considered duplicate
    // Also normalize external URLs to catch variations (e.g., /job/169 vs /requisitions/preview/169)
    const uniqueJobs = jobs.reduce((acc, job) => {
      // Primary dedup key: title + company (normalized) + location
      const normalizedCompany = job.company.toLowerCase().replace(/\s*(emea|inc\.?|a\/s|as|ltd\.?|gmbh)\s*/gi, '').trim();
      const primaryKey = `${job.title.toLowerCase()}-${normalizedCompany}-${job.location.toLowerCase()}`;
      
      // Also try to extract job ID from URL for secondary dedup
      const jobIdMatch = job.externalUrl?.match(/(?:job|requisitions\/preview)\/(\d+)/);
      const urlJobId = jobIdMatch ? jobIdMatch[1] : null;
      const secondaryKey = urlJobId ? `url-id-${urlJobId}-${normalizedCompany}` : null;
      
      // Check both keys
      const existingByPrimary = acc.get(primaryKey);
      const existingBySecondary = secondaryKey ? acc.get(secondaryKey) : null;
      
      if (!existingByPrimary && !existingBySecondary) {
        acc.set(primaryKey, job);
        if (secondaryKey) acc.set(secondaryKey, job);
      } else {
        // Keep the most recently updated version
        const existing = existingByPrimary || existingBySecondary!;
        if (job.updatedAt && existing.updatedAt && job.updatedAt > existing.updatedAt) {
          acc.set(primaryKey, job);
          if (secondaryKey) acc.set(secondaryKey, job);
        }
      }
      return acc;
    }, new Map<string, NormalizedJob>());

    // Extract unique jobs (filter out duplicate key entries)
    const seen = new Set<string>();
    const result: NormalizedJob[] = [];
    for (const job of uniqueJobs.values()) {
      const jobKey = job.id;
      if (!seen.has(jobKey)) {
        seen.add(jobKey);
        result.push(job);
      }
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch jobs from CoreSignal: ${error.message}`);
    }
    throw new Error("Failed to fetch jobs from CoreSignal: Unknown error");
  }
}
