import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Type definitions
export type CVProfile = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
  career_progression_same_track: string;
  career_progression_new_track: string;
};

export type JobMatchResult = {
  positive_fit_points: string[];
  missing_competencies: string[];
  overall_match_summary: string;
};

/**
 * OPTIONS /api/career-advisor/match-job
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * POST /api/career-advisor/match-job
 * Analyze job match based on CV profile and job description
 * Body: { cv_profile: CVProfile, job_description: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    const { cv_profile, job_description } = body;

    // Validate input
    if (!cv_profile || typeof cv_profile !== "object") {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "cv_profile is required and must be an object",
        },
        { status: 400 }
      );
    }

    if (!job_description || typeof job_description !== "string" || job_description.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "job_description is required and must be a non-empty string",
        },
        { status: 400 }
      );
    }

    // Validate cv_profile structure
    const requiredFields = ["hard_skills", "soft_skills", "summary"];
    for (const field of requiredFields) {
      if (!(field in cv_profile)) {
        return NextResponse.json(
          {
            error: "Invalid cv_profile",
            message: `cv_profile must contain ${field}`,
          },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(cv_profile.hard_skills) || !Array.isArray(cv_profile.soft_skills)) {
      return NextResponse.json(
        {
          error: "Invalid cv_profile",
          message: "hard_skills and soft_skills must be arrays",
        },
        { status: 400 }
      );
    }

    // Check job description length (max 20,000 characters)
    if (job_description.length > 20000) {
      return NextResponse.json(
        {
          error: "Job description too long",
          message: "Job description must be less than 20,000 characters",
        },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: "AI API key not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables",
        },
        { status: 500 }
      );
    }

    // System prompt for job match analysis
    const systemPrompt = `You are an experienced career advisor AI specializing in job match analysis.

You receive:
1) A CV PROFILE containing the candidate's hard skills, soft skills, and professional summary
2) A JOB DESCRIPTION or job ad text

Your job is to analyze how well the candidate matches the job requirements and provide constructive feedback.

Analyze the match and return:

1) POSITIVE FIT POINTS (positive_fit_points): A list of 3-7 specific points where the candidate's skills, experience, or background align well with the job requirements. Be specific and reference actual skills or experiences from their profile. Focus on strengths.

2) MISSING COMPETENCIES (missing_competencies): A list of 2-5 areas where the candidate may lack the required skills, experience, or qualifications mentioned in the job description. Be constructive and specific, but honest.

3) OVERALL MATCH SUMMARY (overall_match_summary): A balanced 4-6 sentence summary that:
   - Provides an honest assessment of the overall fit (e.g., "strong match", "good fit with some gaps", "moderate fit")
   - Highlights the strongest alignment points
   - Mentions key gaps or areas for development
   - Ends on a constructive note about how the candidate could strengthen their application or what they should emphasize

Use a professional, supportive tone. Focus on being helpful and constructive rather than discouraging.

Return your answer as STRICT, VALID JSON with EXACTLY these keys:
- "positive_fit_points": string[]
- "missing_competencies": string[]
- "overall_match_summary": string

Do NOT include any other top-level keys. Do NOT include explanations outside the JSON.`;

    // Prepare the user message
    const userMessage = `CV PROFILE:
- Hard Skills: ${cv_profile.hard_skills.join(", ")}
- Soft Skills: ${cv_profile.soft_skills.join(", ")}
- Summary: ${cv_profile.summary}

JOB DESCRIPTION:
${job_description}`;

    // Call the appropriate AI service
    let matchResult: JobMatchResult;

    if (provider === "anthropic") {
      matchResult = await analyzeWithAnthropic(apiKey, systemPrompt, userMessage);
    } else {
      matchResult = await analyzeWithOpenAI(apiKey, systemPrompt, userMessage);
    }

    return NextResponse.json({
      success: true,
      data: matchResult,
      provider,
    });

  } catch (error: any) {
    console.error("Job match analysis error:", error);
    
    return NextResponse.json(
      {
        error: "Analysis failed",
        message: error.message || "An error occurred during job match analysis",
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze job match using Anthropic's Claude API
 */
async function analyzeWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<JobMatchResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON response
  try {
    const result = JSON.parse(content);
    validateJobMatchResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Analyze job match using OpenAI's GPT API
 */
async function analyzeWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<JobMatchResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON response
  try {
    const result = JSON.parse(content);
    validateJobMatchResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Validate job match result structure
 */
function validateJobMatchResult(result: any): asserts result is JobMatchResult {
  if (!result || typeof result !== "object") {
    throw new Error("Result must be an object");
  }

  const requiredFields = [
    "positive_fit_points",
    "missing_competencies",
    "overall_match_summary",
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(result.positive_fit_points)) {
    throw new Error("positive_fit_points must be an array");
  }

  if (!Array.isArray(result.missing_competencies)) {
    throw new Error("missing_competencies must be an array");
  }

  if (typeof result.overall_match_summary !== "string") {
    throw new Error("overall_match_summary must be a string");
  }
}
