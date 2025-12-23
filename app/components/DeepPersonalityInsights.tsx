"use client";

import React, { useState } from "react";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DimensionNarrative {
  title: string;
  text: string;
}

interface PersonalityNarrativeResult {
  structure: DimensionNarrative;
  collaboration: DimensionNarrative;
  responsibility: DimensionNarrative;
  change_learning: DimensionNarrative;
  resilience: DimensionNarrative;
  motivation: DimensionNarrative;
}

interface DeepPersonalityInsightsProps {
  narratives: PersonalityNarrativeResult;
}

// ============================================
// DIMENSION ACCORDION COMPONENT
// ============================================

interface DimensionAccordionProps {
  dimension: DimensionNarrative;
  index: number;
}

function DimensionAccordion({ dimension, index }: DimensionAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0); // First dimension expanded by default

  // Extract first paragraph for preview (up to first double newline or ~300 chars)
  const paragraphs = dimension.text.split('\n\n');
  const firstParagraph = paragraphs[0] || dimension.text.substring(0, 300);
  const hasMore = dimension.text.length > firstParagraph.length + 10;

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "16px",
        backgroundColor: "#fafafa",
        transition: "all 0.2s ease",
      }}
    >
      {/* Title */}
      <h3
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "#1976d2",
          marginBottom: "12px",
          lineHeight: "1.4",
        }}
      >
        {dimension.title}
      </h3>

      {/* Text content */}
      <div
        style={{
          fontSize: "15px",
          lineHeight: "1.7",
          color: "#424242",
          whiteSpace: "pre-wrap",
        }}
      >
        {isExpanded ? dimension.text : firstParagraph}
      </div>

      {/* Expand/Collapse button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#1976d2",
            backgroundColor: "transparent",
            border: "1px solid #1976d2",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e3f2fd";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DeepPersonalityInsights({ narratives }: DeepPersonalityInsightsProps) {
  const dimensions: Array<{ key: keyof PersonalityNarrativeResult; narrative: DimensionNarrative }> = [
    { key: "structure", narrative: narratives.structure },
    { key: "collaboration", narrative: narratives.collaboration },
    { key: "responsibility", narrative: narratives.responsibility },
    { key: "change_learning", narrative: narratives.change_learning },
    { key: "resilience", narrative: narratives.resilience },
    { key: "motivation", narrative: narratives.motivation },
  ];

  return (
    <div
      style={{
        marginTop: "40px",
        padding: "30px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* Section Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#1976d2",
            marginBottom: "8px",
          }}
        >
          🎯 Deep Personality Insights
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "#666",
            lineHeight: "1.5",
          }}
        >
          A comprehensive coaching-style interpretation of your work personality across all six dimensions.
          Click "Read More" to expand each section for deeper insights.
        </p>
      </div>

      {/* Dimension Accordions */}
      <div>
        {dimensions.map((item, index) => (
          <DimensionAccordion
            key={item.key}
            dimension={item.narrative}
            index={index}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#e3f2fd",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#1565c0",
          lineHeight: "1.6",
        }}
      >
        <strong>💡 Coaching Note:</strong> These insights are based on your responses and are meant to support
        self-reflection. Remember that personality is multifaceted and can vary across contexts. Use these
        insights as a starting point for understanding your work preferences and growth areas.
      </div>
    </div>
  );
}
