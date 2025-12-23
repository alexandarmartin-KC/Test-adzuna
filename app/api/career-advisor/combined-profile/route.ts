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

export type PersonalityProfile = {
  scores: {
    structure: number;
    collaboration: number;
    responsibility: number;
    change_learning: number;
    resilience: number;
    motivation: number;
  };
  levels: {
    structure: "Low" | "Medium" | "High";
    collaboration: "Low" | "Medium" | "High";
    responsibility: "Low" | "Medium" | "High";
    change_learning: "Low" | "Medium" | "High";
    resilience: "Low" | "Medium" | "High";
    motivation: "Low" | "Medium" | "High";
  };
  free_text: {
    ft1: string;
    ft2: string;
    ft3: string;
    ft4: string;
    ft5: string;
    ft6: string;
    ft7: string;
    ft8: string;
  };
};

export type CombinedProfileResult = {
  strengths: string[];
  watchouts: string[];
  preferred_environments: string[];
  combined_summary: string;
};

/**
 * OPTIONS /api/career-advisor/combined-profile
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
 * POST /api/career-advisor/combined-profile
 * Generate combined profile from CV + personality + free text using AI
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

    const { cv_profile, personality } = body;

    // Validate cv_profile
    if (!cv_profile || typeof cv_profile !== "object") {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "cv_profile is required and must be an object",
        },
        { status: 400 }
      );
    }

    const cvRequiredFields = ["hard_skills", "soft_skills", "summary"];
    for (const field of cvRequiredFields) {
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

    // Validate personality.scores
    if (!personality || !personality.scores || typeof personality.scores !== "object") {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "personality.scores is required and must be an object",
        },
        { status: 400 }
      );
    }

    const dimensionKeys = ["structure", "collaboration", "responsibility", "change_learning", "resilience", "motivation"];
    for (const key of dimensionKeys) {
      if (!(key in personality.scores)) {
        return NextResponse.json(
          {
            error: "Invalid personality.scores",
            message: `personality.scores must contain ${key}`,
          },
          { status: 400 }
        );
      }
      const score = personality.scores[key as keyof typeof personality.scores];
      if (typeof score !== "number" || score < 0 || score > 100) {
        return NextResponse.json(
          {
            error: "Invalid personality.scores",
            message: `${key} must be a number between 0 and 100`,
          },
          { status: 400 }
        );
      }
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

    // System prompt for combined profile synthesis
    const systemPrompt = `You are an experienced career advisor AI.

You receive:
1) A structured CV profile (hard skills, soft skills, summary, and two career path texts).
2) A personality/work-style profile consisting of:
   - six dimension scores (0–100) and levels (Low/Medium/High)
   - optional free-text answers about preferences, energy, and goals.

Your tasks:
- Combine the CV profile and personality profile to produce a holistic, job-market-relevant view of the person.
- Be practical, constructive, and plain-language. Do not sound clinical or diagnostic.
- Do NOT invent facts not present in the inputs.
- Do NOT claim certainty about traits; use careful wording ("tends to", "likely", "suggests").

Return STRICT VALID JSON with EXACTLY these keys:
- "strengths": array of 5–8 short bullet points grounded in the inputs
- "watchouts": array of 3–6 constructive watchouts/risks grounded in the inputs (not judgmental)
- "preferred_environments": array of 4–8 bullets describing environments/ways of working where they likely thrive
- "combined_summary": a fluent summary paragraph (6–10 sentences) combining competence + work style + motivation

No other keys. No extra text outside JSON.`;

    // Prepare the user message
    const userMessage = `Here is the candidate CV profile as JSON:
CV_PROFILE:
${JSON.stringify(cv_profile, null, 2)}

Here is the personality/work-style profile as JSON:
PERSONALITY_PROFILE:
${JSON.stringify(personality, null, 2)}`;

    // Call the appropriate AI service
    let combinedResult: CombinedProfileResult;

    if (provider === "anthropic") {
      combinedResult = await analyzeWithAnthropic(apiKey, systemPrompt, userMessage);
    } else {
      combinedResult = await analyzeWithOpenAI(apiKey, systemPrompt, userMessage);
    }

    return NextResponse.json({
      success: true,
      data: combinedResult,
      provider,
    });

  } catch (error: any) {
    console.error("Combined profile synthesis error:", error);
    
    return NextResponse.json(
      {
        error: "Synthesis failed",
        message: error.message || "An error occurred during profile synthesis",
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze combined profile using Anthropic's Claude API
 */
async function analyzeWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<CombinedProfileResult> {
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

  // Parse JSON response - extract JSON if wrapped in markdown code blocks
  let jsonContent = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  // Parse JSON response
  try {
    const result = JSON.parse(jsonContent);
    validateCombinedProfileResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Analyze combined profile using OpenAI's GPT API
 */
async function analyzeWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<CombinedProfileResult> {
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

  // Parse JSON response - extract JSON if wrapped in markdown code blocks
  let jsonContent = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  // Parse JSON response
  try {
    const result = JSON.parse(jsonContent);
    validateCombinedProfileResult(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Validate combined profile result structure
 */
function validateCombinedProfileResult(result: any): asserts result is CombinedProfileResult {
  if (!result || typeof result !== "object") {
    throw new Error("Result must be an object");
  }

  const requiredFields = [
    "strengths",
    "watchouts",
    "preferred_environments",
    "combined_summary",
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(result.strengths)) {
    throw new Error("strengths must be an array");
  }

  if (!Array.isArray(result.watchouts)) {
    throw new Error("watchouts must be an array");
  }

  if (!Array.isArray(result.preferred_environments)) {
    throw new Error("preferred_environments must be an array");
  }

  if (typeof result.combined_summary !== "string") {
    throw new Error("combined_summary must be a string");
  }
}
