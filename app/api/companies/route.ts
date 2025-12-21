import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/companies
 * Search for company names with active jobs
 * Query parameters:
 * - q: search query (partial company name)
 * - country: filter by country (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const country = searchParams.get("country") || "";

    if (query.length < 2) {
      return NextResponse.json({ companies: [] });
    }

    const apiKey = "KecMYsVhfFRcKfaIepAVwUTkN6dJyCH8";
    const searchUrl = "https://api.coresignal.com/cdapi/v2/job_multi_source/search/es_dsl";
    const collectUrl = "https://api.coresignal.com/cdapi/v2/job_multi_source/collect";

    // Build search query
    const mustClauses: any[] = [
      { match: { company_name: query } },
      { term: { job_id_expired: 0 } }
    ];

    // Add country filter
    if (country) {
      mustClauses.push({ match: { country: country } });
    } else {
      // Default to Nordic countries
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

    // Search for job IDs
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
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const jobIds: number[] = await searchResponse.json();

    if (!jobIds || jobIds.length === 0) {
      return NextResponse.json({ companies: [] });
    }

    // Collect details for first 20 jobs to get unique company names
    const limitedIds = jobIds.slice(0, 20);
    const companiesMap = new Map<string, { name: string; count: number; hasActiveSource: boolean }>();

    for (const jobId of limitedIds) {
      try {
        const collectResponse = await fetch(`${collectUrl}/${jobId}`, {
          method: "GET",
          headers: {
            "apikey": apiKey,
            "accept": "application/json",
          },
        });

        if (collectResponse.ok) {
          const job = await collectResponse.json();
          const companyName = job.company_name;
          
          // Check if job has active source
          const hasActiveSource = job.job_sources?.some((s: any) => s.status === "active") ?? false;
          
          if (companyName && hasActiveSource) {
            const existing = companiesMap.get(companyName.toLowerCase());
            if (existing) {
              existing.count++;
            } else {
              companiesMap.set(companyName.toLowerCase(), {
                name: companyName,
                count: 1,
                hasActiveSource: true
              });
            }
          }
        }
      } catch (err) {
        // Skip failed requests
      }
    }

    // Convert to array and sort by job count
    const companies = Array.from(companiesMap.values())
      .filter(c => c.hasActiveSource)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        jobCount: c.count
      }));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error searching companies:", error);
    return NextResponse.json({ companies: [] });
  }
}
