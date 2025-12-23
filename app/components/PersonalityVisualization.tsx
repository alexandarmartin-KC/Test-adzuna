"use client";

import React, { useState } from "react";
import { PersonalityScores, PersonalityLevels, getDimensionExplanation, PersonalityDimension } from "@/lib/personalityScoring";

interface PersonalityVisualizationProps {
  scores: PersonalityScores;
  levels: PersonalityLevels;
}

export default function PersonalityVisualization({
  scores,
  levels,
}: PersonalityVisualizationProps) {
  const [chartType, setChartType] = useState<"radar" | "bar">("radar");

  const dimensions: PersonalityDimension[] = [
    "structure",
    "collaboration",
    "responsibility",
    "change_learning",
    "resilience",
    "motivation",
  ];

  const dimensionLabels: Record<PersonalityDimension, string> = {
    structure: "Structure",
    collaboration: "Collaboration",
    responsibility: "Responsibility",
    change_learning: "Change & Learning",
    resilience: "Resilience",
    motivation: "Motivation",
  };

  const levelColors: Record<"Low" | "Medium" | "High", string> = {
    Low: "#ff9800",
    Medium: "#2196f3",
    High: "#4caf50",
  };

  const data = dimensions.map((dim) => ({
    dimension: dimensionLabels[dim],
    value: scores[dim],
    level: levels[dim],
    color: levelColors[levels[dim]],
  }));

  return (
    <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "30px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "10px" }}>
        Your Personality Overview
      </h2>

      {/* Toggle button */}
      <div style={{ marginBottom: "30px" }}>
        <button
          onClick={() => setChartType("radar")}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            backgroundColor: chartType === "radar" ? "#0070f3" : "#f0f0f0",
            color: chartType === "radar" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
          }}
        >
          Radar Chart
        </button>
        <button
          onClick={() => setChartType("bar")}
          style={{
            padding: "8px 16px",
            backgroundColor: chartType === "bar" ? "#0070f3" : "#f0f0f0",
            color: chartType === "bar" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
          }}
        >
          Bar Chart
        </button>
      </div>

      {/* Chart visualization */}
      {chartType === "radar" ? (
        <RadarChart data={data} />
      ) : (
        <BarChart data={data} />
      )}

      {/* Dimension cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          marginTop: "40px",
        }}
      >
        {data.map((item) => {
          const dim = Object.keys(dimensionLabels).find(
            (k) => dimensionLabels[k as PersonalityDimension] === item.dimension
          ) as PersonalityDimension;

          return (
            <div
              key={item.dimension}
              style={{
                padding: "20px",
                border: `2px solid ${item.color}`,
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: item.color }}>
                {item.dimension}
              </h3>
              <div style={{ marginBottom: "10px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    backgroundColor: item.color,
                    color: "white",
                    borderRadius: "16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginRight: "8px",
                  }}
                >
                  {item.level} ({item.value}%)
                </span>
              </div>
              <p style={{ margin: "0", fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
                {getDimensionExplanation(dim, item.level)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChartData {
  dimension: string;
  value: number;
  level: string;
  color: string;
}

function RadarChart({ data }: { data: ChartData[] }) {
  const centerX = 250;
  const centerY = 250;
  const maxRadius = 180;
  const maxValue = 100;

  // Calculate points for radar chart
  const angleSlice = (Math.PI * 2) / data.length;
  const points = data.map((item, idx) => {
    const angle = angleSlice * idx - Math.PI / 2;
    const radius = (item.value / maxValue) * maxRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y, ...item };
  });

  // Background circles and labels
  const circles = [20, 40, 60, 80, 100].map((percent, idx) => {
    const radius = (percent / 100) * maxRadius;
    return { percent, radius };
  });

  return (
    <div style={{ marginBottom: "40px" }}>
      <svg width="600" height="600" style={{ maxWidth: "100%" }}>
        {/* Grid circles */}
        <defs>
          <style>{`
            .radar-circle { fill: none; stroke: #ddd; stroke-width: 1; }
            .radar-grid-text { font-size: 12px; fill: #999; text-anchor: middle; }
            .radar-line { stroke: #0070f3; stroke-width: 2; fill: none; }
            .radar-point { fill: #0070f3; }
            .radar-label { font-size: 14px; font-weight: 500; text-anchor: middle; }
          `}</style>
        </defs>

        {/* Draw grid circles and percentage labels */}
        {circles.map((circle, idx) => (
          <g key={`circle-${idx}`}>
            <circle
              cx={centerX}
              cy={centerY}
              r={circle.radius}
              className="radar-circle"
            />
            <text
              x={centerX}
              y={centerY - circle.radius - 5}
              className="radar-grid-text"
            >
              {circle.percent}%
            </text>
          </g>
        ))}

        {/* Draw axes (lines from center to each dimension) */}
        {points.map((point, idx) => {
          const axisEnd = {
            x: centerX + maxRadius * 1.15 * Math.cos(angleSlice * idx - Math.PI / 2),
            y: centerY + maxRadius * 1.15 * Math.sin(angleSlice * idx - Math.PI / 2),
          };
          return (
            <line
              key={`axis-${idx}`}
              x1={centerX}
              y1={centerY}
              x2={axisEnd.x}
              y2={axisEnd.y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}

        {/* Draw the polygon */}
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          className="radar-line"
          fill="rgba(0, 112, 243, 0.1)"
        />

        {/* Draw points */}
        {points.map((point, idx) => (
          <g key={`point-${idx}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              className="radar-point"
              style={{ cursor: "pointer" }}
            />
            <title>{`${point.dimension}: ${point.value}%`}</title>
          </g>
        ))}

        {/* Labels */}
        {points.map((point, idx) => {
          const labelDist = maxRadius * 1.3;
          const labelX = centerX + labelDist * Math.cos(angleSlice * idx - Math.PI / 2);
          const labelY = centerY + labelDist * Math.sin(angleSlice * idx - Math.PI / 2);
          return (
            <text
              key={`label-${idx}`}
              x={labelX}
              y={labelY}
              className="radar-label"
              dominantBaseline="middle"
            >
              {point.dimension}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

const angleSlice = (Math.PI * 2) / 6; // Will be recalculated in component, just defining for scope

function BarChart({ data }: { data: ChartData[] }) {
  const maxValue = 100;
  const barHeight = 50;
  const chartHeight = data.length * barHeight + 40;

  return (
    <div style={{ marginBottom: "40px", overflowX: "auto" }}>
      <svg
        width="800"
        height={Math.max(400, chartHeight)}
        style={{ minWidth: "100%", maxWidth: "100%" }}
      >
        <defs>
          <style>{`
            .bar-label { font-size: 13px; font-weight: 500; text-anchor: end; }
            .bar-value { font-size: 12px; font-weight: 600; fill: #333; text-anchor: start; }
            .bar-grid-line { stroke: #e0e0e0; stroke-width: 1; }
            .bar-grid-text { font-size: 11px; fill: #999; text-anchor: middle; }
          `}</style>
        </defs>

        {/* Draw grid lines and percentage markers */}
        {[0, 20, 40, 60, 80, 100].map((percent, idx) => {
          const x = 150 + (percent / maxValue) * 600;
          return (
            <g key={`grid-${idx}`}>
              <line
                x1={x}
                y1="20"
                x2={x}
                y2={chartHeight - 20}
                className="bar-grid-line"
              />
              <text x={x} y={chartHeight - 5} className="bar-grid-text">
                {percent}%
              </text>
            </g>
          );
        })}

        {/* Draw bars and labels */}
        {data.map((item, idx) => {
          const y = 30 + idx * barHeight;
          const barWidth = (item.value / maxValue) * 600;

          return (
            <g key={`bar-${idx}`}>
              {/* Dimension label */}
              <text x={145} y={y + 15} className="bar-label">
                {item.dimension}
              </text>

              {/* Bar background */}
              <rect
                x="150"
                y={y}
                width="600"
                height="30"
                fill="#f0f0f0"
                rx="4"
              />

              {/* Bar fill */}
              <rect
                x="150"
                y={y}
                width={barWidth}
                height="30"
                fill={item.color}
                rx="4"
              />

              {/* Value label */}
              <text
                x={160 + barWidth}
                y={y + 20}
                className="bar-value"
                dominantBaseline="middle"
              >
                {item.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
