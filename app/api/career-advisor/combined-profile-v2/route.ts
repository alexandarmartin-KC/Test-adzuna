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
  follow_ups?: {
    selected_dimensions: string[];
    answers: Record<string, string>;
    questions: Record<string, any>;
  };
};

export type CombinedProfileResultV2 = {
  how_you_work_paragraph: string;
  what_you_delivered_paragraph: string;
  nuance_paragraph: string;
  strengths: string[];
  watchouts: string[];
  preferred_environments: string[];
  combined_summary: string;
};

/**
 * OPTIONS /api/career-advisor/combined-profile-v2
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
 * POST /api/career-advisor/combined-profile-v2
 * Generate combined profile with distinct paragraphs from CV + personality + free text using AI
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

    // System prompt for combined profile synthesis V2
    const systemPrompt = `You are a senior career coach AI.

You receive two inputs:
1) CV_PROFILE: what the person has done (roles, outputs, responsibilities, hard skills, CV summary texts).
2) PERSONALITY_PROFILE: how the person tends to work (six dimension scores 0–100 + levels Low/Medium/High + optional free text and optional follow-up answers).

CRITICAL AUTHORITY RULE:
- PERSONALITY_PROFILE is the primary authority for HOW the person works.
- CV_PROFILE is the primary authority for WHAT the person has delivered and in what contexts.
- DO NOT infer working style from industry stereotypes or job titles.
- Explicitly separate role OUTPUTS/constraints from personal PROCESS.
  Example: A person may produce strict SOPs, policies, or compliance outputs, while their internal process to create them can be iterative, exploratory, and creative.

STYLE:
- Coaching tone: practical, supportive, specific, not clinical.
- Use careful language: "tends to", "likely", "suggests".
- Avoid repetition. Do not reuse the same phrases across sections.
- Avoid generic filler like "skilled professional" or "excellent communication" unless grounded in inputs with specific context.

TASK:
Create a combined profile that gives the user new clarity about themselves.

Return STRICT VALID JSON with EXACTLY these keys:
- "how_you_work_paragraph"
- "what_you_delivered_paragraph"
- "nuance_paragraph"
- "strengths"
- "watchouts"
- "preferred_environments"
- "combined_summary"

DETAILED REQUIREMENTS:

1) how_you_work_paragraph (PERSONALITY-led, 4–6 sentences)
- Describe the user's internal working style and operating pattern.
- MUST be based primarily on the six personality dimensions and free-text/follow-ups.
- MUST NOT include:
  - tools/software names
  - job titles or domain labels (e.g., "security professional")
  - lists of responsibilities
- SHOULD include:
  - how they approach ambiguous problems
  - how they balance collaboration vs focus time
  - how they relate to responsibility/ownership
  - how they react to change/learning
  - how they manage pressure and boundaries
  - what tends to motivate them

2) what_you_delivered_paragraph (CV-led, 3–5 sentences)
- Summarize the user's delivered outcomes and responsibilities as factual context.
- May include tools and concrete outputs.
- MUST NOT infer personality traits unless supported by personality profile.

3) nuance_paragraph (contrast-led, 3–5 sentences)
- Explicitly explain the difference between:
  a) the structured nature of outputs in their domain (e.g., SOPs, protocols, compliance)
  b) the user's personal working process (which may be flexible/iterative/creative)
- Explain why this matters when choosing roles and environments.
- This should be the "aha" section: specific and believable.

4) strengths (5–8 bullets)
- Each bullet MUST include a "because" clause connecting BOTH sources:
  - a CV-based evidence point + a personality-based tendency
- Avoid listing hard skills alone. Avoid "Proficient in X" as a standalone strength.
- Focus on transferable capability patterns.

5) watchouts (3–6 bullets)
- Each bullet must:
  - describe a realistic friction point from tension between personality and environment demands
  - include one practical mitigation ("To manage this, …")
- No judgmental language.

6) preferred_environments (4–8 bullets)
- Describe conditions and role characteristics (not job titles).
- Primarily personality-based, anchored by CV evidence only when relevant.
- Avoid contradictions (e.g., "one task at a time" + "highly dynamic multitasking") unless explained.

7) combined_summary (7–10 sentences)
- Must not repeat the earlier paragraphs verbatim.
- Integrate the whole story:
  - what they've done (context)
  - how they work (pattern)
  - where they thrive (conditions)
  - what to be mindful of (risks)
  - transferability beyond current domain
- Keep it plain-language and human.

Return ONLY JSON. No markdown. No extra commentary.`;

    // Prepare the user message
    const userMessage = `Here is the candidate CV profile as JSON:
CV_PROFILE:
${JSON.stringify(cv_profile, null, 2)}

Here is the personality/work-style profile as JSON:
PERSONALITY_PROFILE:
${JSON.stringify(personality, null, 2)}`;

    // Call the appropriate AI service
    let combinedResult: CombinedProfileResultV2;

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
): Promise<CombinedProfileResultV2> {
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

  // Parse JSON response with retry logic
  try {
    const result = JSON.parse(jsonContent);
    validateCombinedProfileResultV2(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    
    // Retry with stricter instruction
    const retryResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON with the exact keys specified. No other text.",
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!retryResponse.ok) {
      throw new Error("Invalid JSON response from AI service after retry");
    }

    const retryData = await retryResponse.json();
    const retryContent = retryData.content[0].text;
    let retryJsonContent = retryContent;
    const retryJsonMatch = retryContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (retryJsonMatch) {
      retryJsonContent = retryJsonMatch[1];
    }

    const retryResult = JSON.parse(retryJsonContent);
    validateCombinedProfileResultV2(retryResult);
    return retryResult;
  }
}

/**
 * Analyze combined profile using OpenAI's GPT API
 */
async function analyzeWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<CombinedProfileResultV2> {
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
    validateCombinedProfileResultV2(result);
    return result;
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Invalid JSON response from AI service");
  }
}

/**
 * Validate combined profile result V2 structure
 */
function validateCombinedProfileResultV2(result: any): asserts result is CombinedProfileResultV2 {
  if (!result || typeof result !== "object") {
    throw new Error("Result must be an object");
  }

  const requiredFields = [
    "how_you_work_paragraph",
    "what_you_delivered_paragraph",
    "nuance_paragraph",
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

  if (typeof result.how_you_work_paragraph !== "string") {
    throw new Error("how_you_work_paragraph must be a string");
  }

  if (typeof result.what_you_delivered_paragraph !== "string") {
    throw new Error("what_you_delivered_paragraph must be a string");
  }

  if (typeof result.nuance_paragraph !== "string") {
    throw new Error("nuance_paragraph must be a string");
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
