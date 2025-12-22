"use client";

import { useState } from "react";

type CVAnalysisResult = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
  career_progression_same_track: string;
  career_progression_new_track: string;
};

type JobMatchResult = {
  positive_fit_points: string[];
  missing_competencies: string[];
  overall_match_summary: string;
};

export default function CVAnalysisPage() {
  const [cvText, setCvText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Job match analysis state
  const [jobDescription, setJobDescription] = useState("");
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!cvText.trim()) {
      setError("Please paste your CV text");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    // Reset job match results when analyzing a new CV
    setMatchResult(null);
    setMatchError(null);
    setJobDescription("");

    try {
      const response = await fetch("/api/cv-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cvText }),
      });

      if (!response.ok) {
        let errorMessage = "Analysis failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data || !data.data) {
        throw new Error("Invalid response from server");
      }

      setResult(data.data);
    } catch (err: any) {
      console.error("CV Analysis error:", err);
      setError(err.message || "An error occurred during analysis");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      let text = "";

      if (file.type === "application/pdf") {
        // Handle PDF files
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = "Failed to parse PDF";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data || !data.text) {
          throw new Error("No text extracted from PDF");
        }

        text = data.text;
      } else if (file.type === "text/plain") {
        // Handle text files
        text = await file.text();
      } else {
        setError("Please upload a PDF (.pdf) or text file (.txt)");
        return;
      }

      setCvText(text);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to read file");
    }
  };

  const handleJobMatch = async () => {
    if (!jobDescription.trim()) {
      setMatchError("Please paste a job description");
      return;
    }

    if (!result) {
      setMatchError("Please analyze your CV first");
      return;
    }

    setIsMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const response = await fetch("/api/career-advisor/match-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cv_profile: result,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Job match analysis failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data || !data.data) {
        throw new Error("Invalid response from server");
      }

      setMatchResult(data.data);
    } catch (err: any) {
      console.error("Job match analysis error:", err);
      setMatchError(err.message || "An error occurred during job match analysis");
    } finally {
      setIsMatchLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "10px" }}>
        CV Analysis Tool
      </h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Upload or paste your CV to get insights about your skills and career opportunities
      </p>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "10px",
            fontWeight: "500",
          }}
        >
          Upload CV (PDF or text file):
        </label>
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileUpload}
          style={{
            display: "block",
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "10px",
            fontWeight: "500",
          }}
        >
          Or paste your CV text:
        </label>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Paste your CV text here..."
          rows={10}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={isLoading || !cvText.trim()}
        style={{
          padding: "12px 24px",
          backgroundColor: isLoading ? "#ccc" : "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLoading ? "not-allowed" : "pointer",
          fontWeight: "500",
          fontSize: "16px",
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze CV"}
      </button>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "20px" }}>
            Analysis Results
          </h2>

          <section style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "10px" }}>
              Professional Summary
            </h3>
            <p style={{ lineHeight: "1.6", color: "#333" }}>{result.summary}</p>
          </section>

          <section style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "10px" }}>
              Hard Skills
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {result.hard_skills.map((skill, index) => (
                <span
                  key={index}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#e3f2fd",
                    color: "#1565c0",
                    borderRadius: "16px",
                    fontSize: "14px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "10px" }}>
              Soft Skills
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {result.soft_skills.map((skill, index) => (
                <span
                  key={index}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f3e5f5",
                    color: "#6a1b9a",
                    borderRadius: "16px",
                    fontSize: "14px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "10px" }}>
              Career Progression - Same Track
            </h3>
            <div
              style={{
                padding: "15px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                borderLeft: "4px solid #4caf50",
              }}
            >
              <p style={{ lineHeight: "1.6", color: "#333", whiteSpace: "pre-wrap" }}>
                {result.career_progression_same_track}
              </p>
            </div>
          </section>

          <section style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "10px" }}>
              Alternative Career Track
            </h3>
            <div
              style={{
                padding: "15px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                borderLeft: "4px solid #ff9800",
              }}
            >
              <p style={{ lineHeight: "1.6", color: "#333", whiteSpace: "pre-wrap" }}>
                {result.career_progression_new_track}
              </p>
            </div>
          </section>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "10px" }}>
            Job Match Analysis
          </h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Paste a job description below to see how well your profile matches
          </p>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontWeight: "500",
              }}
            >
              Job Description:
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description or job ad here..."
              rows={8}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            />
          </div>

          <button
            onClick={handleJobMatch}
            disabled={isMatchLoading || !jobDescription.trim()}
            style={{
              padding: "12px 24px",
              backgroundColor: isMatchLoading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isMatchLoading ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "16px",
            }}
          >
            {isMatchLoading ? "Analyzing match..." : "Analyze job match"}
          </button>

          {matchError && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c00",
              }}
            >
              {matchError}
            </div>
          )}

          {matchResult && (
            <div style={{ marginTop: "30px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "20px", color: "#0070f3" }}>
                Match Results
              </h3>

              <section style={{ marginBottom: "30px" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px", color: "#4caf50" }}>
                  ✓ Where You Are a Strong Fit
                </h4>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {matchResult.positive_fit_points.map((point, index) => (
                    <li
                      key={index}
                      style={{
                        padding: "12px 15px",
                        marginBottom: "10px",
                        backgroundColor: "#e8f5e9",
                        borderLeft: "4px solid #4caf50",
                        borderRadius: "4px",
                        lineHeight: "1.6",
                      }}
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              <section style={{ marginBottom: "30px" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px", color: "#ff9800" }}>
                  ⚠ Areas for Development
                </h4>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {matchResult.missing_competencies.map((competency, index) => (
                    <li
                      key={index}
                      style={{
                        padding: "12px 15px",
                        marginBottom: "10px",
                        backgroundColor: "#fff3e0",
                        borderLeft: "4px solid #ff9800",
                        borderRadius: "4px",
                        lineHeight: "1.6",
                      }}
                    >
                      {competency}
                    </li>
                  ))}
                </ul>
              </section>

              <section style={{ marginBottom: "30px" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px" }}>
                  Overall Match Summary
                </h4>
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    borderLeft: "4px solid #2196f3",
                  }}
                >
                  <p style={{ lineHeight: "1.7", color: "#333", whiteSpace: "pre-wrap" }}>
                    {matchResult.overall_match_summary}
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
