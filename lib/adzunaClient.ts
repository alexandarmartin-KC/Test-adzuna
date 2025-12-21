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

// CoreSignal API response type
interface CoreSignalJob {
  id: string;
  title: string;
  company_name?: string;
  location?: string;
  country?: string;
  description?: string;
  application_url?: string;
  created?: string;
  last_updated?: string;
  salary_from?: number;
  salary_to?: number;
}

interface CoreSignalResponse {
  jobs?: CoreSignalJob[];
  total?: number;
}

/**
 * Fetch job listings from CoreSignal API
 * @param params - Search parameters including keywords, location, and pagination
 * @returns Array of normalized job listings
 */
export async function fetchCoreSignalJobs(params: {
  what?: string;
  where?: string;
  country?: string;
  page?: number;
  resultsPerPage?: number;
}): Promise<NormalizedJob[]> {
  const {
    what = "",
    where = "",
    country = "us",
    page = 1,
    resultsPerPage = 20,
  } = params;

  // CoreSignal API configuration
  const apiKey = "KecMYsVhfFRcKfaIepAVwUTkN6dJyCH8";
  const baseUrl = "https://api.coresignal.com/cdapi/v1/professional_network/job/search/filter";

  // Build CoreSignal API request body
  const requestBody: any = {
    page: page - 1, // CoreSignal uses 0-based pagination
    page_size: resultsPerPage,
  };

  // Add filters
  if (what) {
    requestBody.title = what;
  }
  if (where) {
    requestBody.location = where;
  }
  if (country) {
    requestBody.country = country.toUpperCase();
  }

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CoreSignal API error (${response.status}): ${errorText}`);
    }

    const data: CoreSignalResponse = await response.json();

    // Map CoreSignal response to normalized format
    const jobs: NormalizedJob[] = (data.jobs || []).map((job) => ({
      id: job.id || Math.random().toString(36).substr(2, 9),
      title: job.title || "Untitled Position",
      company: job.company_name || "Unknown Company",
      location: job.location || "Location not specified",
      country: job.country || country.toUpperCase(),
      description: job.description || "",
      url: job.application_url || "",
      createdAt: job.created || job.last_updated,
      salaryMin: job.salary_from,
      salaryMax: job.salary_to,
    }));

    return jobs;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch jobs from CoreSignal: ${error.message}`);
    }
    throw new Error("Failed to fetch jobs from CoreSignal: Unknown error");
  }
}
