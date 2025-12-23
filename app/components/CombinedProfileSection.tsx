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

export interface ReflectionNotes {
  resonance: string;
  missing_or_off: string;
  additional_context?: string;
}

/**
 * USAGE NOTE FOR FUTURE API CALLS:
 * 
 * When the reflectionNotes are available (captured from user input),
 * include them as optional context in subsequent AI calls such as:
 * - Job matching endpoints
 * - Career coaching dialogues
 * - Personalized guidance generation
 * 
 * Example payload structure:
 * {
 *   cv_profile: {...},
 *   personality: {...},
 *   reflection_notes: {
 *     resonance: "string",
 *     missing_or_off: "string",
 *     additional_context: "string"
 *   }
 * }
 * 
 * DO NOT score or evaluate these notes.
 * They provide nuanced context that helps AI generate more grounded,
 * personalized, and user-centered guidance.
 */

interface CombinedProfileProps {
  cvProfile: CVAnalysisResult;
  personalityScores: PersonalityScores;
  personalityLevels: PersonalityLevels;
  freeText: Record<string, string>;
  followUps?: {
    selected_dimensions: string[];
    answers: Record<string, string>;
    questions: Record<string, { dimension: string; text: string; reason: "extreme_low" | "extreme_high" | "inconsistent" }>;
  };
  onGenerateComplete: (result: CombinedProfileResult) => void;
  onReflectionUpdate?: (notes: ReflectionNotes) => void;
}

export default function CombinedProfileSection({
  cvProfile,
  personalityScores,
  personalityLevels,
  freeText,
  followUps,
  onGenerateComplete,
  onReflectionUpdate,
}: CombinedProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CombinedProfileResult | null>(null);
  const [reflectionNotes, setReflectionNotes] = useState<ReflectionNotes>({
    resonance: "",
    missing_or_off: "",
    additional_context: "",
  });

  const handleReflectionChange = (field: keyof ReflectionNotes, value: string) => {
    const updated = { ...reflectionNotes, [field]: value };
    setReflectionNotes(updated);
    onReflectionUpdate?.(updated);
  };

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
          follow_ups: followUps,
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
          Your Combined Profile
        </h2>
        <p style={{ color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
          This profile combines what you've done so far in your career with how you tend to work, think, and make decisions.
          <br /><br />
          It's not meant to label you or put you in a box. Instead, it highlights patterns in how you operate at your best — and where certain environments may either support or work against you.
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
    <>
      {/* ========================================================
          COMBINED PROFILE SECTION
          ======================================================== */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>
          Your Combined Profile
        </h2>

        <p style={{ color: "#555", marginBottom: "30px", lineHeight: "1.7", fontSize: "15px" }}>
          This profile combines what you've done so far in your career with how you tend to work, think, and make decisions.
          <br /><br />
          It's not meant to label you or put you in a box. Instead, it highlights patterns in how you operate at your best — and where certain environments may either support or work against you.
        </p>

        {/* SUBSECTION 1: How You Tend to Work */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#333" }}>
            How you tend to work
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            This describes your internal working style — how you approach problems, handle responsibility, respond to change, and stay motivated.
            <br />
            It's based primarily on your answers in the personality analysis.
          </p>
          <div
            style={{
              padding: "18px",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
              borderLeft: "4px solid #5c6bc0",
              lineHeight: "1.7",
              color: "#333",
              fontSize: "15px",
            }}
          >
            {/* Extract working style from combined_summary or create derived content */}
            {result.combined_summary.split('.').slice(0, 3).join('.') + '.'}
          </div>
        </section>

        {/* SUBSECTION 2: What You've Delivered So Far */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#333" }}>
            What you've delivered so far
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            This reflects the kinds of responsibilities, outcomes, and environments you've been trusted with in your career to date.
            <br />
            Think of this as context and evidence — not a limitation on where you can go next.
          </p>
          <div
            style={{
              padding: "18px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              borderLeft: "4px solid #78909c",
              lineHeight: "1.7",
              color: "#333",
              fontSize: "15px",
            }}
          >
            {cvProfile.summary}
          </div>
        </section>

        {/* SUBSECTION 3: The Important Nuance */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#333" }}>
            An important nuance in your profile
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            Sometimes the outcomes a role requires don't fully reflect how a person actually works internally.
            <br />
            This section highlights that distinction in your case.
          </p>
          <div
            style={{
              padding: "18px",
              backgroundColor: "#fff9e6",
              borderRadius: "4px",
              borderLeft: "4px solid #ffa726",
              lineHeight: "1.7",
              color: "#333",
              fontSize: "15px",
            }}
          >
            {/* Extract nuance from combined_summary - use middle portion */}
            {result.combined_summary.split('.').slice(3, 5).join('.') + '.'}
          </div>
        </section>

        {/* SUBSECTION 4: Key Strengths */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#4caf50" }}>
            Key strengths you tend to bring into your work
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            These strengths emerge from the combination of your experience and your way of working — not from job titles alone.
          </p>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {result.strengths.map((strength, index) => (
              <li
                key={index}
                style={{
                  padding: "14px 16px",
                  marginBottom: "10px",
                  backgroundColor: "#e8f5e9",
                  borderLeft: "4px solid #4caf50",
                  borderRadius: "4px",
                  lineHeight: "1.6",
                  fontSize: "15px",
                  color: "#333",
                }}
              >
                {strength}
              </li>
            ))}
          </ul>
        </section>

        {/* SUBSECTION 5: Things to Be Aware Of */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#ff9800" }}>
            Things to be aware of
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            These aren't weaknesses, but patterns to be mindful of — especially when choosing roles or environments.
          </p>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {result.watchouts.map((watchout, index) => (
              <li
                key={index}
                style={{
                  padding: "14px 16px",
                  marginBottom: "10px",
                  backgroundColor: "#fff3e0",
                  borderLeft: "4px solid #ff9800",
                  borderRadius: "4px",
                  lineHeight: "1.6",
                  fontSize: "15px",
                  color: "#333",
                }}
              >
                {watchout}
              </li>
            ))}
          </ul>
        </section>

        {/* SUBSECTION 6: Environments Where You Thrive */}
        <section style={{ marginBottom: "35px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#2196f3" }}>
            Environments where you're likely to thrive
          </h3>
          <p style={{ fontSize: "13px", color: "#777", marginBottom: "12px", lineHeight: "1.5" }}>
            This focuses on conditions and ways of working — not specific job titles.
          </p>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {result.preferred_environments.map((env, index) => (
              <li
                key={index}
                style={{
                  padding: "14px 16px",
                  marginBottom: "10px",
                  backgroundColor: "#e3f2fd",
                  borderLeft: "4px solid #2196f3",
                  borderRadius: "4px",
                  lineHeight: "1.6",
                  fontSize: "15px",
                  color: "#333",
                }}
              >
                {env}
              </li>
            ))}
          </ul>
        </section>

        {/* SUBSECTION 7: Integrated Summary */}
        <section style={{ marginBottom: "40px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "8px", color: "#333" }}>
            Putting it all together
          </h3>
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              borderLeft: "4px solid #7e57c2",
              lineHeight: "1.7",
              color: "#333",
              fontSize: "15px",
            }}
          >
            {result.combined_summary}
          </div>
        </section>
      </div>

      {/* ========================================================
          REFLECTION CHECKPOINT SECTION
          ======================================================== */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>
          Your reflection
        </h2>

        <p style={{ color: "#555", marginBottom: "25px", lineHeight: "1.7", fontSize: "15px" }}>
          This profile is meant to support your thinking — not define you.
          <br /><br />
          Before moving on, take a moment to reflect. Your input helps refine the guidance and keeps the process grounded in your own experience.
        </p>

        {/* Reflection Prompt 1 */}
        <div style={{ marginBottom: "25px" }}>
          <label
            htmlFor="reflection-resonance"
            style={{
              display: "block",
              fontSize: "15px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#333",
            }}
          >
            What parts of this profile feel most accurate or resonant for you?
          </label>
          <textarea
            id="reflection-resonance"
            value={reflectionNotes.resonance}
            onChange={(e) => handleReflectionChange("resonance", e.target.value)}
            rows={3}
            placeholder="Optional — share what stood out or rang true..."
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              lineHeight: "1.6",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* Reflection Prompt 2 */}
        <div style={{ marginBottom: "25px" }}>
          <label
            htmlFor="reflection-missing"
            style={{
              display: "block",
              fontSize: "15px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#333",
            }}
          >
            What feels missing, slightly off, or needs nuance?
          </label>
          <textarea
            id="reflection-missing"
            value={reflectionNotes.missing_or_off}
            onChange={(e) => handleReflectionChange("missing_or_off", e.target.value)}
            rows={3}
            placeholder="Optional — help us understand where this could be more accurate..."
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              lineHeight: "1.6",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* Reflection Prompt 3 (Optional) */}
        <div style={{ marginBottom: "25px" }}>
          <label
            htmlFor="reflection-additional"
            style={{
              display: "block",
              fontSize: "15px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#333",
            }}
          >
            If you think about your best work experiences, what stands out that isn't captured above?
          </label>
          <textarea
            id="reflection-additional"
            value={reflectionNotes.additional_context || ""}
            onChange={(e) => handleReflectionChange("additional_context", e.target.value)}
            rows={3}
            placeholder="Optional — any additional context or experiences worth noting..."
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              lineHeight: "1.6",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <p style={{ fontSize: "13px", color: "#777", marginTop: "15px", fontStyle: "italic" }}>
          These reflections are for your benefit and to help refine future guidance. They won't be scored or used as evaluation criteria.
        </p>
      </div>
    </>
  );
}
