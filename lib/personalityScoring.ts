/**
 * Personality Questionnaire Scoring Utility
 * Implements 36-item Likert scale with reverse scoring
 */

export type PersonalityDimension = 
  | "structure" 
  | "collaboration" 
  | "responsibility" 
  | "change_learning" 
  | "resilience" 
  | "motivation";

export type PersonalityLevel = "Low" | "Medium" | "High";

export interface PersonalityScores {
  structure: number;
  collaboration: number;
  responsibility: number;
  change_learning: number;
  resilience: number;
  motivation: number;
}

export interface PersonalityLevels {
  structure: PersonalityLevel;
  collaboration: PersonalityLevel;
  responsibility: PersonalityLevel;
  change_learning: PersonalityLevel;
  resilience: PersonalityLevel;
  motivation: PersonalityLevel;
}

export interface FreeTextAnswers {
  ft1: string;
  ft2: string;
  ft3: string;
  ft4: string;
  ft5: string;
  ft6: string;
  ft7: string;
  ft8: string;
}

// Define which questions need reverse scoring (1-indexed)
const REVERSE_SCORED_QUESTIONS = new Set([
  4,   // A: "I don't mind switching tasks..." → reverse
  9,   // B: "I feel drained if..." → reverse
  16,  // C: "I'm fine with others making..." → reverse
  21,  // D: "I thrive best when tasks are similar..." → reverse
  23,  // D: "I get quickly frustrated..." → reverse
  27,  // E: "Criticism stays in mind..." → reverse
  29,  // E: "Workplace conflicts affect..." → reverse
]);

// Question to dimension mapping (1-indexed question numbers)
const QUESTION_DIMENSIONS: Record<number, PersonalityDimension> = {
  1: "structure", 2: "structure", 3: "structure", 4: "structure", 5: "structure", 6: "structure",
  7: "collaboration", 8: "collaboration", 9: "collaboration", 10: "collaboration", 11: "collaboration", 12: "collaboration",
  13: "responsibility", 14: "responsibility", 15: "responsibility", 16: "responsibility", 17: "responsibility", 18: "responsibility",
  19: "change_learning", 20: "change_learning", 21: "change_learning", 22: "change_learning", 23: "change_learning", 24: "change_learning",
  25: "resilience", 26: "resilience", 27: "resilience", 28: "resilience", 29: "resilience", 30: "resilience",
  31: "motivation", 32: "motivation", 33: "motivation", 34: "motivation", 35: "motivation", 36: "motivation",
};

/**
 * Compute per-dimension adjusted answers (after reverse scoring) from raw Likert responses
 */
export function computeAdjustedDimensionAnswers(answers: Record<number, number>): Record<PersonalityDimension, number[]> {
  const dimensionAnswers: Record<PersonalityDimension, number[]> = {
    structure: [],
    collaboration: [],
    responsibility: [],
    change_learning: [],
    resilience: [],
    motivation: [],
  };

  for (let questionNum = 1; questionNum <= 36; questionNum++) {
    let answer = answers[questionNum];
    if (answer === undefined) {
      throw new Error(`Missing answer for question ${questionNum}`);
    }
    if (answer < 1 || answer > 5) {
      throw new Error(`Invalid answer for question ${questionNum}: ${answer} (must be 1-5)`);
    }
    if (REVERSE_SCORED_QUESTIONS.has(questionNum)) {
      answer = 6 - answer;
    }
    const dimension = QUESTION_DIMENSIONS[questionNum];
    dimensionAnswers[dimension].push(answer);
  }

  return dimensionAnswers;
}

/**
 * Compute per-dimension variance on adjusted 1..5 answers
 */
export function computeDimensionVariance(answers: Record<number, number>): Record<PersonalityDimension, number> {
  const dims = computeAdjustedDimensionAnswers(answers);
  const variance: Record<PersonalityDimension, number> = {
    structure: 0,
    collaboration: 0,
    responsibility: 0,
    change_learning: 0,
    resilience: 0,
    motivation: 0,
  };

  (Object.keys(dims) as PersonalityDimension[]).forEach((dim) => {
    const arr = dims[dim];
    const n = arr.length || 1;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const varVal = arr.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) / n;
    variance[dim] = Number(varVal.toFixed(3));
  });

  return variance;
}

/**
 * Get the level category for a percentage score
 * 0-39: Low, 40-69: Medium, 70-100: High
 */
export function getLevel(score: number): PersonalityLevel {
  if (score < 40) return "Low";
  if (score < 70) return "Medium";
  return "High";
}

/**
 * Compute personality scores from raw Likert answers
 * @param answers Record<number, number> where key is question number (1-36) and value is 1-5
 * @returns Object with scores (0-100) and levels for each dimension
 */
export function computePersonalityScores(answers: Record<number, number>): {
  scores: PersonalityScores;
  levels: PersonalityLevels;
} {
  const dimensionScores: Record<PersonalityDimension, number[]> = {
    structure: [],
    collaboration: [],
    responsibility: [],
    change_learning: [],
    resilience: [],
    motivation: [],
  };

  // Process each answer
  for (let questionNum = 1; questionNum <= 36; questionNum++) {
    let answer = answers[questionNum];
    
    if (answer === undefined) {
      throw new Error(`Missing answer for question ${questionNum}`);
    }

    // Validate answer is 1-5
    if (answer < 1 || answer > 5) {
      throw new Error(`Invalid answer for question ${questionNum}: ${answer} (must be 1-5)`);
    }

    // Apply reverse scoring if needed
    if (REVERSE_SCORED_QUESTIONS.has(questionNum)) {
      answer = 6 - answer;
    }

    // Add to appropriate dimension
    const dimension = QUESTION_DIMENSIONS[questionNum];
    dimensionScores[dimension].push(answer);
  }

  // Calculate percentages and levels for each dimension
  const scores: PersonalityScores = {} as PersonalityScores;
  const levels: PersonalityLevels = {} as PersonalityLevels;

  const dimensions: PersonalityDimension[] = [
    "structure",
    "collaboration",
    "responsibility",
    "change_learning",
    "resilience",
    "motivation",
  ];

  for (const dimension of dimensions) {
    const dimensionAnswers = dimensionScores[dimension];
    
    if (dimensionAnswers.length !== 6) {
      throw new Error(`Expected 6 answers for ${dimension}, got ${dimensionAnswers.length}`);
    }

    // Average the answers (1-5 scale)
    const avg = dimensionAnswers.reduce((a, b) => a + b, 0) / 6;

    // Convert to 0-100 scale: ((avg - 1) / 4) * 100
    const percentage = ((avg - 1) / 4) * 100;

    scores[dimension] = Math.round(percentage);
    levels[dimension] = getLevel(Math.round(percentage));
  }

  return { scores, levels };
}

/**
 * Get helpful one-liner explanations for each dimension level
 */
export function getDimensionExplanation(dimension: PersonalityDimension, level: PersonalityLevel): string {
  const explanations: Record<PersonalityDimension, Record<PersonalityLevel, string>> = {
    structure: {
      Low: "You adapt well to flexible, fluid environments and changing priorities.",
      Medium: "You balance structure with flexibility depending on the situation.",
      High: "You thrive with clear processes, plans, and consistent routines.",
    },
    collaboration: {
      Low: "You work effectively solo and prefer focused, independent work time.",
      Medium: "You enjoy collaboration but also value personal thinking time.",
      High: "You get energy from teamwork and regular interaction with colleagues.",
    },
    responsibility: {
      Low: "You prefer to support others' decisions and focus on execution.",
      Medium: "You seek a balance between autonomy and collaborative decision-making.",
      High: "You want ownership, leadership, and influence over outcomes.",
    },
    change_learning: {
      Low: "You prefer stability and mastering existing skills and processes.",
      Medium: "You adapt to change and learn new things at a steady pace.",
      High: "You embrace change as opportunity and learn quickly.",
    },
    resilience: {
      Low: "You work best in calm, predictable environments with stable expectations.",
      Medium: "You handle moderate pressure well but prefer reasonable workloads.",
      High: "You stay calm under pressure and thrive in demanding situations.",
    },
    motivation: {
      Low: "You value stability and predictability in your work and life.",
      Medium: "You seek a mix of stability and growth opportunities.",
      High: "You're driven by learning, impact, and personal development.",
    },
  };

  return explanations[dimension][level];
}
