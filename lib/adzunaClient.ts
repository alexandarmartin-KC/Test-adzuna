// Adzuna API Client for Nordic Job Search

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

// Adzuna API response type (partial, only fields we use)
interface AdzunaJob {
  id: string;
  title: string;
  company?: {
    display_name?: string;
  };
  location?: {
    display_name?: string;
    area?: string[];
  };
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
}

interface AdzunaResponse {
  results?: AdzunaJob[];
  count?: number;
}

/**
 * Fetch job listings from Adzuna API
 * @param params - Search parameters including country, keywords, location, and pagination
 * @returns Array of normalized job listings
 */
export async function fetchAdzunaJobs(params: {
  country: "at" | "au" | "be" | "br" | "ca" | "ch" | "de" | "es" | "fr" | "gb" | "in" | "it" | "mx" | "nl" | "nz" | "pl" | "sg" | "us" | "za";
  what?: string;
  where?: string;
  page?: number;
  resultsPerPage?: number;
}): Promise<NormalizedJob[]> {
  const {
    country,
    what = "",
    where = "",
    page = 1,
    resultsPerPage = 20,
  } = params;

  // Validate environment variables
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  const baseUrl = process.env.ADZUNA_BASE_URL || "https://api.adzuna.com/v1/api";

  if (!appId || !apiKey) {
    throw new Error("Missing Adzuna API credentials. Please set ADZUNA_APP_ID and ADZUNA_API_KEY environment variables.");
  }

  // Build Adzuna API URL
  // Format: /v1/api/jobs/{country}/search/{page}
  const url = new URL(`${baseUrl}/jobs/${country}/search/${page}`);
  
  // Add required authentication parameters
  url.searchParams.append("app_id", appId);
  url.searchParams.append("app_key", apiKey);
  
  // Add optional search parameters
  if (what) {
    url.searchParams.append("what", what);
  }
  if (where) {
    url.searchParams.append("where", where);
  }
  url.searchParams.append("results_per_page", resultsPerPage.toString());

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Adzuna API error (${response.status}): ${errorText}`);
    }

    const data: AdzunaResponse = await response.json();

    // Map Adzuna response to normalized format
    const jobs: NormalizedJob[] = (data.results || []).map((job) => ({
      id: job.id,
      title: job.title || "Untitled Position",
      company: job.company?.display_name || "Unknown Company",
      location: job.location?.display_name || job.location?.area?.[0] || "Location not specified",
      country: country.toUpperCase(),
      description: job.description || "",
      url: job.redirect_url || "",
      createdAt: job.created,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
    }));

    return jobs;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch jobs from Adzuna: ${error.message}`);
    }
    throw new Error("Failed to fetch jobs from Adzuna: Unknown error");
  }
}
