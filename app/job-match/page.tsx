"use client";

import { useState } from "react";

type JobMatch = {
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  matchScore: number;
  matchReasons: string[];
};

type MatchResult = {
  matches: JobMatch[];
  cvSummary: string;
  hardSkills: string[];
  softSkills: string[];
  totalJobsScanned: number;
};

export default function JobMatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CV file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Parse PDF
      const formData = new FormData();
      formData.append("file", file);

      const parseResponse = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!parseResponse.ok) {
        throw new Error(`Failed to parse PDF: ${parseResponse.status}`);
      }

      const parseData = await parseResponse.json();
      const cvText = parseData.text;

      if (!cvText || cvText.trim().length === 0) {
        throw new Error("Could not extract text from PDF");
      }

      // Step 2: Match jobs
      const matchResponse = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });

      if (!matchResponse.ok) {
        const errorData = await matchResponse.json();
        throw new Error(errorData.message || `Failed to match jobs: ${matchResponse.status}`);
      }

      const matchData = await matchResponse.json();
      setResult(matchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Job Match - Find Jobs That Fit Your CV</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Upload your CV and we'll analyze your skills and match you with relevant job openings
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loading || !file ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading || !file ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Analyzing..." : "Find Matching Jobs"}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
            marginBottom: "2rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "1.2rem", color: "#0070f3" }}>
            🔍 Analyzing your CV and matching with jobs...
          </div>
          <div style={{ marginTop: "1rem", color: "#666" }}>
            This may take 30-60 seconds
          </div>
        </div>
      )}

      {result && (
        <div>
          {/* CV Summary */}
          <div
            style={{
              backgroundColor: "#f9f9f9",
              padding: "1.5rem",
              borderRadius: "8px",
              marginBottom: "2rem",
            }}
          >
            <h2>Your Profile</h2>
            <p style={{ lineHeight: "1.6", marginBottom: "1rem" }}>{result.cvSummary}</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Hard Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {result.hardSkills.map((skill, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: "#e3f2fd",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Soft Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {result.softSkills.map((skill, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: "#f3e5f5",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Job Matches */}
          <h2>
            {result.matches.length} Matching Jobs
            <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "normal" }}>
              {" "}(from {result.totalJobsScanned} scanned)
            </span>
          </h2>

          {result.matches.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
              }}
            >
              <p>No matching jobs found at the moment.</p>
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                Try adjusting your search criteria or check back later for new openings.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {result.matches.map((job, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    backgroundColor: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.5rem 0" }}>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#0070f3", textDecoration: "none" }}
                        >
                          {job.title}
                        </a>
                      </h3>
                      <div style={{ color: "#666" }}>
                        {job.company} • {job.location} • {job.country}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: job.matchScore >= 80 ? "#4caf50" : job.matchScore >= 60 ? "#ff9800" : "#2196f3",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      {job.matchScore}% Match
                    </div>
                  </div>
                  
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>Why this matches:</strong>
                    <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                      {job.matchReasons.map((reason, j) => (
                        <li key={j} style={{ marginBottom: "0.25rem", color: "#444" }}>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
