import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface PersonalityScores {
  structure: number;
  collaboration: number;
  responsibility: number;
  change_learning: number;
  resilience: number;
  motivation: number;
}

interface PersonalityLevels {
  structure: "Low" | "Medium" | "High";
  collaboration: "Low" | "Medium" | "High";
  responsibility: "Low" | "Medium" | "High";
  change_learning: "Low" | "Medium" | "High";
  resilience: "Low" | "Medium" | "High";
  motivation: "Low" | "Medium" | "High";
}

interface FreeTextAnswers {
  ft1?: string;
  ft2?: string;
  ft3?: string;
  ft4?: string;
  ft5?: string;
  ft6?: string;
  ft7?: string;
  ft8?: string;
}

interface PersonalityProfile {
  scores: PersonalityScores;
  levels: PersonalityLevels;
  free_text?: FreeTextAnswers;
}

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

// ============================================
// VALIDATION HELPERS
// ============================================

function validatePersonalityProfile(personality: any): personality is PersonalityProfile {
  if (!personality || typeof personality !== "object") {
    return false;
  }

  // Validate scores
  if (!personality.scores || typeof personality.scores !== "object") {
    return false;
  }

  const requiredScores = ["structure", "collaboration", "responsibility", "change_learning", "resilience", "motivation"];
  for (const key of requiredScores) {
    const score = personality.scores[key];
    if (typeof score !== "number" || score < 0 || score > 100) {
      return false;
    }
  }

  // Validate levels
  if (!personality.levels || typeof personality.levels !== "object") {
    return false;
  }

  const validLevels = ["Low", "Medium", "High"];
  for (const key of requiredScores) {
    const level = personality.levels[key];
    if (!validLevels.includes(level)) {
      return false;
    }
  }

  return true;
}

function validateNarrativeResult(result: any): result is PersonalityNarrativeResult {
  if (!result || typeof result !== "object") {
    return false;
  }

  const requiredDimensions = ["structure", "collaboration", "responsibility", "change_learning", "resilience", "motivation"];
  
  for (const dimension of requiredDimensions) {
    const narrative = result[dimension];
    if (!narrative || typeof narrative !== "object") {
      return false;
    }
    if (typeof narrative.title !== "string" || typeof narrative.text !== "string") {
      return false;
    }
    if (narrative.title.trim().length === 0 || narrative.text.trim().length === 0) {
      return false;
    }
  }

  return true;
}

// ============================================
// AI ANALYSIS FUNCTIONS
// ============================================

async function analyzeWithAnthropic(personality: PersonalityProfile): Promise<PersonalityNarrativeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a career coach AI.

You will receive a personality/work-style profile consisting of:
- six dimension scores (0–100) and levels (Low/Medium/High)
- optional free-text answers about preferences, energy, and goals

Your job is to write a deep, practical, coaching-style interpretation of each of the six dimensions.
Write in a tone that feels supportive and insightful, like a good career coach.

Important rules:
- Use careful language: "tends to", "likely", "may", "suggests".
- Do NOT sound clinical or diagnostic.
- Do NOT use bullet points.
- Do NOT repeat the same generic phrases across dimensions.
- Ground your insights in the inputs; if free-text is available, reference it in a subtle way (e.g. "this aligns with what you wrote about…").
- For each dimension, include:
  1) What it usually means in day-to-day work
  2) What environments/roles it often fits
  3) What might feel challenging and how to handle it (coaching guidance)
- Keep each dimension's text to 2–4 short paragraphs (readable, not too long).

Return STRICT VALID JSON with EXACTLY these keys:
- "structure"
- "collaboration"
- "responsibility"
- "change_learning"
- "resilience"
- "motivation"

Each value must be an object:
{ "title": string, "text": string }

No other keys. No extra text outside JSON.`;

  const userMessage = `Here is the personality/work-style profile as JSON:
PERSONALITY_PROFILE:
${JSON.stringify(personality, null, 2)}`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic");
  }

  let jsonText = content.text.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  const result = JSON.parse(jsonText);

  if (!validateNarrativeResult(result)) {
    throw new Error("AI response does not match expected PersonalityNarrativeResult structure");
  }

  return result;
}

async function analyzeWithOpenAI(personality: PersonalityProfile): Promise<PersonalityNarrativeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are a career coach AI.

You will receive a personality/work-style profile consisting of:
- six dimension scores (0–100) and levels (Low/Medium/High)
- optional free-text answers about preferences, energy, and goals

Your job is to write a deep, practical, coaching-style interpretation of each of the six dimensions.
Write in a tone that feels supportive and insightful, like a good career coach.

Important rules:
- Use careful language: "tends to", "likely", "may", "suggests".
- Do NOT sound clinical or diagnostic.
- Do NOT use bullet points.
- Do NOT repeat the same generic phrases across dimensions.
- Ground your insights in the inputs; if free-text is available, reference it in a subtle way (e.g. "this aligns with what you wrote about…").
- For each dimension, include:
  1) What it usually means in day-to-day work
  2) What environments/roles it often fits
  3) What might feel challenging and how to handle it (coaching guidance)
- Keep each dimension's text to 2–4 short paragraphs (readable, not too long).

Return STRICT VALID JSON with EXACTLY these keys:
- "structure"
- "collaboration"
- "responsibility"
- "change_learning"
- "resilience"
- "motivation"

Each value must be an object:
{ "title": string, "text": string }

No other keys. No extra text outside JSON.`;

  const userMessage = `Here is the personality/work-style profile as JSON:
PERSONALITY_PROFILE:
${JSON.stringify(personality, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    response_format: { type: "json_object" },
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
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  const result = JSON.parse(content);

  if (!validateNarrativeResult(result)) {
    throw new Error("AI response does not match expected PersonalityNarrativeResult structure");
  }

  return result;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.personality) {
      return NextResponse.json(
        { error: "Missing 'personality' in request body" },
        { status: 400 }
      );
    }

    if (!validatePersonalityProfile(body.personality)) {
      return NextResponse.json(
        { error: "Invalid personality profile structure or values" },
        { status: 400 }
      );
    }

    const personality = body.personality as PersonalityProfile;

    // Determine which AI provider to use
    let result: PersonalityNarrativeResult;

    if (process.env.ANTHROPIC_API_KEY) {
      result = await analyzeWithAnthropic(personality);
    } else if (process.env.OPENAI_API_KEY) {
      result = await analyzeWithOpenAI(personality);
    } else {
      return NextResponse.json(
        { error: "No AI provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY required)" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in personality-narrative endpoint:", error);
    return NextResponse.json(
      { error: "Failed to generate personality narrative", details: (error as any).message },
      { status: 500 }
    );
  }
}
