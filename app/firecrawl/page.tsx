"use client";

import { useState, useEffect } from "react";

interface Job {
  title: string;
  company: string;
  country: string;
  location: string;
  department?: string;
  url: string;
}

interface ApiResponse {
  jobs: Job[];
  total: number;
  cached: boolean;
  cacheTimestamp: number;
  companies?: string[];
}

export default function FirecrawlPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<string>("");
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  // Filter states
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch available companies on mount
  useEffect(() => {
    fetch("/api/firecrawl/jobs/companies")
      .then(res => res.json())
      .then(data => setAvailableCompanies(data.companies || []))
      .catch(() => setAvailableCompanies([]));
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (companyFilter !== "all") {
        params.append("company", companyFilter);
      }
      
      if (countryFilter !== "all") {
        params.append("country", countryFilter);
      }
      
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const url = `/api/firecrawl/jobs?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch jobs");
      }

      const data: ApiResponse = await response.json();
      setJobs(data.jobs);
      
      // Update cache info
      if (data.cached && data.cacheTimestamp) {
        const cacheDate = new Date(data.cacheTimestamp);
        setCacheInfo(`Using cached data from ${cacheDate.toLocaleString()}`);
      } else {
        setCacheInfo("Fresh data fetched");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>
          Firecrawl Job Search
        </h1>
        {jobs.length > 0 && (
          <div style={{
            backgroundColor: "#0070f3",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "20px",
            fontWeight: "bold",
            fontSize: "1.1rem"
          }}>
            {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"}
          </div>
        )}
      </div>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Search jobs from Ørsted and Canon career pages. Data is crawled once and cached
        for performance. Use filters to narrow down results.
      </p>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        {/* Company Filter */}
        <div style={{ flex: "1", minWidth: "150px" }}>
          <label
            htmlFor="company-filter"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Company
          </label>
          <select
            id="company-filter"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          >
            <option value="all">All Companies</option>
            {availableCompanies.map(company => (
              <option key={company} value={company.toLowerCase()}>{company}</option>
            ))}
          </select>
        </div>

        {/* Country Filter */}
        <div style={{ flex: "1", minWidth: "150px" }}>
          <label
            htmlFor="country-filter"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Country
          </label>
          <select
            id="country-filter"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          >
            <option value="all">All Countries</option>
            <option value="dk">Denmark (DK)</option>
            <option value="se">Sweden (SE)</option>
            <option value="no">Norway (NO)</option>
            <option value="gb">United Kingdom (GB)</option>
            <option value="ie">Ireland (IE)</option>
            <option value="pl">Poland (PL)</option>
            <option value="es">Spain (ES)</option>
            <option value="eu">Europe (EU)</option>
          </select>
        </div>

        {/* Search Box */}
        <div style={{ flex: "2", minWidth: "200px" }}>
          <label
            htmlFor="search-box"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}
          >
            Search
          </label>
          <input
            id="search-box"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in title or location..."
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* Fetch Button */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={fetchJobs}
            disabled={loading}
            style={{
              padding: "0.5rem 2rem",
              backgroundColor: loading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "500",
            }}
          >
            {loading ? "Loading..." : "Fetch Jobs"}
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const params = new URLSearchParams();
                if (companyFilter !== "all") params.append("company", companyFilter);
                if (countryFilter !== "all") params.append("country", countryFilter);
                if (searchQuery.trim()) params.append("q", searchQuery.trim());
                params.append("recrawl", "true");
                
                const response = await fetch(`/api/firecrawl/jobs?${params.toString()}`);
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || "Failed to recrawl");
                }
                const data = await response.json();
                setJobs(data.jobs);
                setCacheInfo(`Fresh data crawled at ${new Date().toLocaleString()}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
                setJobs([]);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            title="Force a fresh crawl (uses Firecrawl credits)"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: loading ? "#ccc" : "#ff6b35",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "500",
            }}
          >
            🔄 Recrawl
          </button>
        </div>
      </div>

      {/* Cache Info */}
      {cacheInfo && (
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
          {cacheInfo}
        </p>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            marginBottom: "1rem",
            color: "#c00",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Table */}
      {jobs.length > 0 ? (
        <div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Results ({jobs.length} {jobs.length === 1 ? "job" : "jobs"})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontWeight: "600",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontWeight: "600",
                    }}
                  >
                    Company
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontWeight: "600",
                    }}
                  >
                    Location
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontWeight: "600",
                    }}
                  >
                    Country
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      fontWeight: "600",
                    }}
                  >
                    Link
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <td style={{ padding: "1rem" }}>
                      {job.title}
                      {job.department && (
                        <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                          {job.department}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>{job.company}</td>
                    <td style={{ padding: "1rem" }}>{job.location}</td>
                    <td style={{ padding: "1rem" }}>{job.country}</td>
                    <td style={{ padding: "1rem" }}>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#0070f3",
                          textDecoration: "none",
                        }}
                      >
                        View Job →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && !error && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
            }}
          >
            Click "Fetch Jobs" to load job postings from Ørsted and Canon.
          </div>
        )
      )}
    </div>
  );
}
