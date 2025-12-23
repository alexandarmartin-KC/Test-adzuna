"use client";

import React, { useState } from "react";
import { PersonalityScores, PersonalityLevels } from "@/lib/personalityScoring";

export type CVAnalysisResult = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
  career_progression_same_track: string;
  career_progression_new_track: string;
};

interface CombinedProfileResult {
  strengths: string[];
  watchouts: string[];
  preferred_environments: string[];
  combined_summary: string;
}

interface CombinedProfileProps {
  cvProfile: CVAnalysisResult;
  personalityScores: PersonalityScores;
  personalityLevels: PersonalityLevels;
  freeText: Record<string, string>;
  onGenerateComplete: (result: CombinedProfileResult) => void;
}

export default function CombinedProfileSection({
  cvProfile,
  personalityScores,
  personalityLevels,
  freeText,
  onGenerateComplete,
}: CombinedProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CombinedProfileResult | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        cv_profile: cvProfile,
        personality: {
          scores: personalityScores,
          levels: personalityLevels,
          free_text: freeText,
        },
      };

      const response = await fetch("/api/career-advisor/combined-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate combined profile";
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
      onGenerateComplete(data.data);
    } catch (err: any) {
      console.error("Combined profile generation error:", err);
      setError(err.message || "An error occurred while generating your profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!result) {
    return (
      <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "10px" }}>
          Combined Profile Synthesis
        </h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Combine your CV with your personality profile to get a holistic career profile synthesized by AI.
          This synthesis takes into account your hard skills, soft skills, work style preferences, and answers to open questions.
        </p>

        {error && (
          <div
            style={{
              marginBottom: "20px",
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

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            padding: "12px 24px",
            backgroundColor: isLoading ? "#ccc" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          {isLoading ? "Generating..." : "Generate Combined Profile"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "20px", color: "#4caf50" }}>
        ✓ Your Combined Profile
      </h2>

      {/* Combined Summary */}
      <section style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px" }}>
          Profile Summary
        </h3>
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            borderLeft: "4px solid #2196f3",
            lineHeight: "1.7",
            color: "#333",
          }}
        >
          {result.combined_summary}
        </div>
      </section>

      {/* Strengths */}
      <section style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px", color: "#4caf50" }}>
          Your Strengths
        </h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {result.strengths.map((strength, index) => (
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
              {strength}
            </li>
          ))}
        </ul>
      </section>

      {/* Watchouts */}
      <section style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px", color: "#ff9800" }}>
          Areas to Watch Out For
        </h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {result.watchouts.map((watchout, index) => (
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
              {watchout}
            </li>
          ))}
        </ul>
      </section>

      {/* Preferred Environments */}
      <section style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "15px", color: "#2196f3" }}>
          Where You Thrive
        </h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {result.preferred_environments.map((env, index) => (
            <li
              key={index}
              style={{
                padding: "12px 15px",
                marginBottom: "10px",
                backgroundColor: "#e3f2fd",
                borderLeft: "4px solid #2196f3",
                borderRadius: "4px",
                lineHeight: "1.6",
              }}
            >
              {env}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
