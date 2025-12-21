import { NextRequest, NextResponse } from "next/server";
import { fetchAdzunaJobs } from "@/lib/adzunaClient";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Supported countries by Adzuna API
const VALID_COUNTRIES = ["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"] as const;
type ValidCountry = typeof VALID_COUNTRIES[number];

/**
 * GET /api/jobs
 * Fetch job listings from Adzuna API
 * Query parameters:
 * - country: at|au|be|br|ca|ch|de|es|fr|gb|in|it|mx|nl|nz|pl|sg|us|za (default: us)
 * - what: search keywords (optional)
 * - where: location (optional)
 * - page: page number (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get("country") || "us";
    const what = searchParams.get("what") || undefined;
    const where = searchParams.get("where") || undefined;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    // Validate country parameter
    if (!VALID_COUNTRIES.includes(country as ValidCountry)) {
      return NextResponse.json(
        {
          error: "Invalid country parameter",
          message: `Country must be one of: ${VALID_COUNTRIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate page parameter
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        {
          error: "Invalid page parameter",
          message: "Page must be a positive integer",
        },
        { status: 400 }
      );
    }

    // Fetch jobs from Adzuna
    const jobs = await fetchAdzunaJobs({
      country: country as ValidCountry,
      what,
      where,
      page,
      resultsPerPage: 20,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: jobs,
      meta: {
        country,
        page,
        count: jobs.length,
      },
    });
  } catch (error) {
    // Log error internally but don't expose sensitive details
    console.error("Error fetching jobs:", error);

    // Return sanitized error response
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch jobs",
        message: message.includes("API credentials") 
          ? "Server configuration error" 
          : message,
      },
      { status: 500 }
    );
  }
}
