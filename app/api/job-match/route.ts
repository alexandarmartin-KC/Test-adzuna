import { NextRequest, NextResponse } from "next/server";
import { getJobsForMatching, Job } from "@/lib/jobsCache";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for matching

type JobMatch = {
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  matchScore: number;
  matchReasons: string[];
};

type CVAnalysis = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
};

export async function POST(request: NextRequest) {
  try {
    const { cvText } = await request.json();

    if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
      return NextResponse.json(
        { error: "cvText is required" },
        { status: 400 }
      );
    }

    // Step 1: Analyze CV to extract skills
    console.log("[Job Match] Analyzing CV...");
    const cvAnalysis = await analyzeCV(cvText);
    console.log(`[Job Match] Found ${cvAnalysis.hard_skills.length} hard skills, ${cvAnalysis.soft_skills.length} soft skills`);

    // Step 2: Get jobs directly (no HTTP call needed)
    console.log("[Job Match] Fetching jobs...");
    const jobs = await getJobsForMatching();
    console.log(`[Job Match] Got ${jobs.length} jobs to scan`);

    // Step 3: Match jobs using AI
    const matches = await matchJobs(cvAnalysis, jobs);
    console.log(`[Job Match] Found ${matches.length} matches`);

    return NextResponse.json({
      matches,
      cvSummary: cvAnalysis.summary,
      hardSkills: cvAnalysis.hard_skills,
      softSkills: cvAnalysis.soft_skills,
      totalJobsScanned: jobs.length,
    });

  } catch (error) {
    console.error("[Job Match] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to match jobs", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

async function analyzeCV(cvText: string): Promise<CVAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";

  if (!apiKey) {
    throw new Error("AI API key not configured");
  }

  const systemPrompt = `You are a career advisor AI analyzing a CV.

Extract:
1. HARD SKILLS: Concrete technical skills, tools, technologies, methods
2. SOFT SKILLS: Communication, leadership, problem-solving, etc. (only if clearly supported by the CV)
3. SUMMARY: 2-3 sentence professional profile

You must respond with valid JSON in this exact format:
{
  "hard_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"],
  "summary": "Professional summary here"
}`;

  const userPrompt = `Analyze this CV and extract skills and summary. Return only valid JSON:\n\n${cvText}`;

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error("Could not parse CV analysis response");
    }
    
    return JSON.parse(jsonMatch[1]);
  } else {
    // OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error("Could not parse CV analysis response");
    }
    
    return JSON.parse(jsonMatch[1]);
  }
}

async function matchJobs(cvAnalysis: CVAnalysis, jobs: Job[]): Promise<JobMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";

  if (!apiKey) {
    throw new Error("AI API key not configured");
  }

  // Create batches of jobs to avoid token limits
  const batchSize = 50;
  const allMatches: JobMatch[] = [];

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    
    const systemPrompt = `You are a job matching AI. Given a candidate's skills and a list of jobs, identify the best matches.

For each job that matches the candidate's skills (at least 50% relevance), return:
- matchScore: 0-100 (how well the job matches)
- matchReasons: 2-3 bullet points explaining why it matches

Only include jobs with matchScore >= 50. Return valid JSON array in this exact format:
[
  {
    "title": "Job Title",
    "company": "Company",
    "location": "Location",
    "country": "Country",
    "url": "URL",
    "matchScore": 85,
    "matchReasons": ["Reason 1", "Reason 2"]
  }
]

If no jobs match, return empty array: []`;

    const userPrompt = `Candidate Profile:
Hard Skills: ${cvAnalysis.hard_skills.join(", ")}
Soft Skills: ${cvAnalysis.soft_skills.join(", ")}
Summary: ${cvAnalysis.summary}

Jobs to match:
${batch.map((j, idx) => `${idx + 1}. ${j.title} at ${j.company} (${j.location}, ${j.country}) - ${j.url}`).join("\n")}

Return matching jobs as valid JSON array.`;

    try {
      if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.content[0].text;
        
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) || content.match(/(\[[\s\S]*\])/);
        if (jsonMatch) {
          const matches = JSON.parse(jsonMatch[1]);
          allMatches.push(...matches);
        }
      } else {
        // OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) || content.match(/(\[[\s\S]*\])/);
        if (jsonMatch) {
          const matches = JSON.parse(jsonMatch[1]);
          if (Array.isArray(matches)) {
            allMatches.push(...matches);
          }
        }
      }
    } catch (error) {
      console.error(`[Job Match] Error matching batch ${i / batchSize + 1}:`, error);
      continue;
    }
  }

  // Sort by match score and deduplicate
  const uniqueMatches = Array.from(
    new Map(allMatches.map(m => [m.url, m])).values()
  );
  
  return uniqueMatches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20); // Return top 20 matches
}
