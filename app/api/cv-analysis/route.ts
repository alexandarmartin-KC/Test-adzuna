import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Type definitions for CV analysis response
export type CVAnalysisResult = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
  career_progression_same_track: string;
  career_progression_new_track: string;
};

/**
 * GET /api/cv-analysis
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    error: "Method not allowed",
    message: "This endpoint only accepts POST requests. Please send CV text in the request body.",
    usage: {
      method: "POST",
      endpoint: "/api/cv-analysis",
      body: { cvText: "Your CV text here..." }
    }
  }, { status: 405 });
}

/**
 * POST /api/cv-analysis
 * Analyze CV text and return skills, summary, and career suggestions
 * Body: { cvText: string }
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

    const { cvText } = body;

    // Validate input
    if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "cvText is required and must be a non-empty string",
        },
        { status: 400 }
      );
    }

    // Check CV length (max 50,000 characters to prevent abuse)
    if (cvText.length > 50000) {
      return NextResponse.json(
        {
          error: "CV too long",
          message: "CV text must be less than 50,000 characters",
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

    // System prompt for CV analysis
    const systemPrompt = `You are an experienced career advisor AI.

You receive the FULL TEXT of a CV that has already been extracted from a PDF into plain text. The text may include headings, bullet points, and contact info.

Your job is to:
1) Identify concrete HARD SKILLS from the CV: tools, technologies, domain knowledge, methods, and clearly stated responsibilities. Return them as a list of short phrases.
2) Identify plausible SOFT SKILLS that are supported by the CV: communication, leadership, structure, problem solving, stakeholder management, etc. Only include soft skills that can reasonably be inferred from roles and responsibilities, not from guesswork.
3) Write a SHORT SUMMARY (4–7 sentences) of the person's professional profile, combining the most important hard and soft skills into a fluent description.
4) Suggest a realistic NEXT STEP IN THEIR CURRENT LINE OF PROFESSION (career progression in the same direction). Explain why it fits, and mention any skills/knowledge they may want to strengthen.
5) Suggest a realistic ALTERNATIVE CAREER TRACK in a different line of profession that could use their transferable skills. Explain which skills transfer, which skills are missing, and what kind of courses or training could help close the gap.

Return your answer as STRICT, VALID JSON with EXACTLY these keys:
- "hard_skills": string[]
- "soft_skills": string[]
- "summary": string
- "career_progression_same_track": string
- "career_progression_new_track": string

Do NOT include any other top-level keys. Do NOT include explanations outside the JSON.`;

    // Call the appropriate AI service
    let analysisResult: CVAnalysisResult;

    if (provider === "anthropic") {
      analysisResult = await analyzeWithAnthropic(apiKey, systemPrompt, cvText);
    } else {
      analysisResult = await analyzeWithOpenAI(apiKey, systemPrompt, cvText);
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
      provider,
    });

  } catch (error: any) {
    console.error("CV analysis error:", error);
    
    return NextResponse.json(
      {
        error: "Analysis failed",
        message: error.message || "An error occurred during CV analysis",
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze CV using Anthropic's Claude API
 */
async function analyzeWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  cvText: string
): Promise<CVAnalysisResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: cvText,
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
    validateCVAnalysisResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Analyze CV using OpenAI's GPT API
 */
async function analyzeWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  cvText: string
): Promise<CVAnalysisResult> {
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
          content: cvText,
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
    validateCVAnalysisResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Validate CV analysis result structure
 */
function validateCVAnalysisResult(result: any): asserts result is CVAnalysisResult {
  if (!result || typeof result !== "object") {
    throw new Error("Result must be an object");
  }

  const requiredFields = [
    "hard_skills",
    "soft_skills",
    "summary",
    "career_progression_same_track",
    "career_progression_new_track",
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(result.hard_skills)) {
    throw new Error("hard_skills must be an array");
  }

  if (!Array.isArray(result.soft_skills)) {
    throw new Error("soft_skills must be an array");
  }

  if (typeof result.summary !== "string") {
    throw new Error("summary must be a string");
  }

  if (typeof result.career_progression_same_track !== "string") {
    throw new Error("career_progression_same_track must be a string");
  }

  if (typeof result.career_progression_new_track !== "string") {
    throw new Error("career_progression_new_track must be a string");
  }
}
