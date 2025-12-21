// CoreSignal API Client for Job Search

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  description: string;
  url: string;
  createdAt?: string;
  salaryMin?: number;
  salaryMax?: number;
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
  posted_at?: string;
  first_verified_at?: string;
  last_verified_at?: string;
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
}): Promise<NormalizedJob[]> {
  const {
    what = "",
    where = "",
    country = "",
    company = "",
    page = 1,
    resultsPerPage = 20,
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

    // Step 2: Collect full details for each job ID (limit to first 10 to avoid rate limits)
    const limitedIds = jobIds.slice(0, Math.min(10, resultsPerPage));
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
          console.error(`Failed to collect job ${jobId}`);
          return null;
        }

        return await collectResponse.json() as CoreSignalJobDetail;
      } catch (err) {
        console.error(`Error collecting job ${jobId}:`, err);
        return null;
      }
    });

    const jobDetails = await Promise.all(jobPromises);

    // Map CoreSignal response to normalized format
    const jobs: NormalizedJob[] = jobDetails
      .filter((job): job is CoreSignalJobDetail => job !== null)
      .map((job) => ({
        id: job.id?.toString() || Math.random().toString(36).substr(2, 9),
        title: job.title || "Untitled Position",
        company: job.company_name || "Unknown Company",
        location: job.city || job.location || "Location not specified",
        country: job.country || country.toUpperCase(),
        description: job.description || "",
        url: job.application_url || job.url || "",
        createdAt: job.posted_at || job.first_verified_at,
        salaryMin: job.salary?.[0]?.min_amount,
        salaryMax: job.salary?.[0]?.max_amount,
      }));

    return jobs;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch jobs from CoreSignal: ${error.message}`);
    }
    throw new Error("Failed to fetch jobs from CoreSignal: Unknown error");
  }
}
