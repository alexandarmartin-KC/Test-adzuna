"use client";

import { useState, useEffect } from "react";

type NormalizedJob = {
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

type ApiResponse = {
  success: boolean;
  data?: NormalizedJob[];
  error?: string;
  message?: string;
  meta?: {
    country: string;
    page: number;
    count: number;
  };
};

export default function HomePage() {
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState("dk");
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        country,
        ...(searchTerm && { what: searchTerm }),
        ...(location && { where: location }),
      });

      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch jobs");
      }

      setJobs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [country]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#0070f3", color: "white", padding: "2rem 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>Nordic Job Search</h1>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>
            Find your next opportunity in Denmark, Sweden, Norway, or Finland
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Search Controls */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="dk">Denmark (DK)</option>
                  <option value="se">Sweden (SE)</option>
                  <option value="no">Norway (NO)</option>
                  <option value="fi">Finland (FI)</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Job Title / Keywords
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g., developer, engineer"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Copenhagen, Stockholm"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
                />
              </div>
            </div>
            
            <button
              type="submit"
              style={{
                backgroundColor: "#0070f3",
                color: "white",
                padding: "0.75rem 2rem",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "1rem",
              }}
            >
              Search Jobs
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
            <p style={{ fontSize: "1.2rem" }}>Loading jobs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ backgroundColor: "#fee", color: "#c33", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Jobs List */}
        {!loading && !error && (
          <div>
            <h2 style={{ marginBottom: "1rem", color: "#333" }}>
              {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} Found
            </h2>
            
            {jobs.length === 0 ? (
              <div style={{ backgroundColor: "white", padding: "3rem", borderRadius: "8px", textAlign: "center", color: "#666" }}>
                <p>No jobs found. Try adjusting your search criteria.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "8px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    }}
                  >
                    <div style={{ marginBottom: "1rem" }}>
                      <h3 style={{ margin: "0 0 0.5rem 0", color: "#0070f3", fontSize: "1.5rem" }}>
                        {job.title}
                      </h3>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "#666", fontSize: "0.9rem" }}>
                        <span>🏢 {job.company}</span>
                        <span>📍 {job.location}, {job.country}</span>
                        {job.salaryMin && job.salaryMax && (
                          <span>💰 {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <p style={{ color: "#444", lineHeight: "1.6", marginBottom: "1rem" }}>
                      {truncateText(stripHtml(job.description), 200)}
                    </p>
                    
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        backgroundColor: "#0070f3",
                        color: "white",
                        padding: "0.5rem 1.5rem",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      View Full Job →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: "#333", color: "white", padding: "2rem 0", marginTop: "4rem", textAlign: "center" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Powered by Adzuna Job Search API
          </p>
        </div>
      </footer>
    </div>
  );
}
