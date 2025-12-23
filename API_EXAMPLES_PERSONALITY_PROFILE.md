# API Examples - Personality Profile Combined Synthesis

## Endpoint: POST /api/career-advisor/combined-profile

### Request Example

```json
{
  "cv_profile": {
    "hard_skills": [
      "Python",
      "React",
      "SQL",
      "AWS",
      "Docker"
    ],
    "soft_skills": [
      "Communication",
      "Leadership",
      "Problem-solving",
      "Project management"
    ],
    "summary": "Senior software engineer with 8 years of experience building scalable web applications. Specialized in full-stack development with Python and React. Led teams of 3-5 engineers on multiple successful product launches.",
    "career_progression_same_track": "Continue as a senior engineer → Staff engineer → Principal engineer. Take on more mentorship responsibilities and contribute to architectural decisions.",
    "career_progression_new_track": "Transition into engineering management. Leverage technical background to manage teams of engineers, focusing on technical strategy and team development."
  },
  "personality": {
    "scores": {
      "structure": 72,
      "collaboration": 65,
      "responsibility": 78,
      "change_learning": 55,
      "resilience": 82,
      "motivation": 70
    },
    "levels": {
      "structure": "High",
      "collaboration": "Medium",
      "responsibility": "High",
      "change_learning": "Medium",
      "resilience": "High",
      "motivation": "High"
    },
    "free_text": {
      "ft1": "I get energy from solving complex technical problems and shipping features that users love.",
      "ft2": "Unclear requirements and constant scope changes drain me. I prefer clarity upfront.",
      "ft3": "A team environment where technical excellence is valued, where I can mentor others, and where there's autonomy in how I approach problems.",
      "ft4": "Micromanagement and rigid hierarchies. I need trust and the ability to make decisions.",
      "ft5": "Strong technical skills, reliability, can explain complex concepts clearly, and good at mentoring junior engineers.",
      "ft6": "I sometimes take on too much work and don't delegate enough. I want to improve my ability to trust others.",
      "ft7": "Impact - working on products that matter. Growth - continuing to develop my skills. Flexibility - remote or hybrid setup.",
      "ft8": "More: Strategic work, mentoring, architecture decisions. Less: Repetitive tasks, meetings, context switching."
    }
  }
}
```

### Response Example (Success)

```json
{
  "success": true,
  "data": {
    "strengths": [
      "Strong technical foundation paired with proven leadership ability makes you well-suited for senior or staff roles",
      "High resilience combined with high responsibility suggests you thrive under pressure and can be counted on to deliver",
      "Natural mentoring ability (clear communication + responsibility) complements your technical expertise well",
      "Reliable execution of complex projects; your structure and resilience suggest you can own delivery end-to-end",
      "Cross-functional bridge builder - technical enough to earn engineering respect, clear communicator for stakeholder management",
      "Your drive for learning and change, even at medium level, suggests you won't become stagnant as you advance"
    ],
    "watchouts": [
      "High responsibility combined with medium collaboration could mean taking on too much solo - be intentional about team distribution",
      "Preference for clarity (high structure) may create friction in fast-moving startups or highly ambiguous environments",
      "Your mentoring strength is valuable, but ensure you're not mentoring at the expense of your own strategic impact",
      "Medium change-learning score vs high responsibility may create tension in roles requiring constant reinvention",
      "Risk of burnout if you continue over-committing (high resilience doesn't mean unlimited capacity)"
    ],
    "preferred_environments": [
      "Technically-led organization where engineering opinions shape product direction",
      "Scaling company with clear technical strategy and room for mentorship roles",
      "Teams that value code quality and technical excellence alongside shipping speed",
      "Stable product roadmap with opportunity for meaningful architectural work",
      "Culture that respects work-life boundaries and offers flexibility in how/where you work",
      "Companies with clear career progression (IC track to staff engineer or management track)"
    ],
    "combined_summary": "You are a high-performing engineer with the rare combination of strong technical skills, leadership drive, and reliability under pressure. Your profile suggests you're ready for a senior role with mentorship responsibilities or early management. The natural next step could be either a staff engineer position leveraging your architecture and mentoring skills, or an engineering manager role where you can scale your impact through others. Your medium comfort with change suggests you thrive in environments with some clarity and structure, rather than constant pivoting. Be mindful not to over-commit given your high sense of responsibility—clarity on scope and intentional delegation will help you reach your next level sustainably. Your ideal role combines technical autonomy with leadership opportunities, likely in a team where you can mentor others and influence technical decisions."
  },
  "provider": "anthropic"
}
```

### Response Example (Error)

```json
{
  "error": "Invalid input",
  "message": "personality.scores must contain change_learning"
}
```

## Test Requests

### Minimum Valid Request
```json
{
  "cv_profile": {
    "hard_skills": ["JavaScript", "SQL"],
    "soft_skills": ["Communication"],
    "summary": "Software engineer"
  },
  "personality": {
    "scores": {
      "structure": 50,
      "collaboration": 50,
      "responsibility": 50,
      "change_learning": 50,
      "resilience": 50,
      "motivation": 50
    }
  }
}
```

### With Free Text
```json
{
  "cv_profile": { ... },
  "personality": {
    "scores": { ... },
    "free_text": {
      "ft1": "Clear deadlines and finished projects",
      "ft2": "Ambiguous feedback",
      "ft3": "Small team with clear goals",
      "ft4": "Large organizations with red tape",
      "ft5": "Strong problem solver",
      "ft6": "Better communication",
      "ft7": "Work-life balance, learning opportunities",
      "ft8": "More coding, less meetings"
    }
  }
}
```

## Error Responses

### Missing CV Profile
```json
{
  "error": "Invalid input",
  "message": "cv_profile is required and must be an object"
}
```

### Missing Dimension Score
```json
{
  "error": "Invalid personality.scores",
  "message": "personality.scores must contain resilience"
}
```

### Invalid Score Range
```json
{
  "error": "Invalid personality.scores",
  "message": "collaboration must be a number between 0 and 100"
}
```

### Missing Hard Skills
```json
{
  "error": "Invalid cv_profile",
  "message": "cv_profile must contain hard_skills"
}
```

### No API Key
```json
{
  "error": "Configuration error",
  "message": "AI API key not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables"
}
```

### API Provider Error (e.g., quota exceeded)
```json
{
  "error": "Synthesis failed",
  "message": "Anthropic API error: 429 - Rate limit exceeded"
}
```

## Response Validation

The endpoint validates that the JSON response contains exactly these keys:
- `strengths` (array of strings)
- `watchouts` (array of strings)
- `preferred_environments` (array of strings)
- `combined_summary` (string)

If any key is missing or wrong type, the request fails with:
```json
{
  "error": "Synthesis failed",
  "message": "Invalid JSON response from AI service"
}
```

## Real-World Integration Code

### TypeScript
```typescript
interface PersonalityRequest {
  cv_profile: {
    hard_skills: string[];
    soft_skills: string[];
    summary: string;
    career_progression_same_track: string;
    career_progression_new_track: string;
  };
  personality: {
    scores: {
      structure: number;
      collaboration: number;
      responsibility: number;
      change_learning: number;
      resilience: number;
      motivation: number;
    };
    levels?: {
      structure: "Low" | "Medium" | "High";
      collaboration: "Low" | "Medium" | "High";
      responsibility: "Low" | "Medium" | "High";
      change_learning: "Low" | "Medium" | "High";
      resilience: "Low" | "Medium" | "High";
      motivation: "Low" | "Medium" | "High";
    };
    free_text?: {
      ft1?: string;
      ft2?: string;
      ft3?: string;
      ft4?: string;
      ft5?: string;
      ft6?: string;
      ft7?: string;
      ft8?: string;
    };
  };
}

interface PersonalityResponse {
  success: boolean;
  data: {
    strengths: string[];
    watchouts: string[];
    preferred_environments: string[];
    combined_summary: string;
  };
  provider: "anthropic" | "openai";
}

async function generateCombinedProfile(request: PersonalityRequest): Promise<PersonalityResponse> {
  const response = await fetch("/api/career-advisor/combined-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to generate profile");
  }

  return response.json();
}
```

### JavaScript
```javascript
async function generateProfile(cvData, personalityScores, freeText) {
  try {
    const res = await fetch("/api/career-advisor/combined-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cv_profile: cvData,
        personality: {
          scores: personalityScores,
          free_text: freeText
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Error:", err.message);
      return null;
    }

    const result = await res.json();
    return result.data;
  } catch (error) {
    console.error("Network error:", error);
    return null;
  }
}
```

### cURL
```bash
curl -X POST http://localhost:3000/api/career-advisor/combined-profile \
  -H "Content-Type: application/json" \
  -d '{
    "cv_profile": {
      "hard_skills": ["Python", "React"],
      "soft_skills": ["Communication"],
      "summary": "Software engineer",
      "career_progression_same_track": "Senior engineer",
      "career_progression_new_track": "Product manager"
    },
    "personality": {
      "scores": {
        "structure": 70,
        "collaboration": 65,
        "responsibility": 75,
        "change_learning": 60,
        "resilience": 80,
        "motivation": 70
      }
    }
  }'
```

## Response Structure Details

### Strengths (5-8 bullets)
- Grounded in actual CV data and personality traits
- Practical and job-market relevant
- Specific to the person's profile

### Watchouts (3-6 bullets)
- Constructive, not judgmental
- Based on potential conflicts or risks in the profile
- Include mitigation suggestions where relevant

### Preferred Environments (4-8 bullets)
- Specific working conditions where person likely thrives
- Based on both CV competencies and personality traits
- Includes team type, structure, pace, etc.

### Combined Summary (6-10 sentences)
- Integrates all data (CV + personality + free text)
- Plain language, not clinical
- Actionable recommendations for next role
- Balanced and encouraging tone

## Performance Characteristics

- **Request size**: ~2-5KB (typical)
- **Processing time**: 2-5 seconds (API-dependent)
- **Response size**: ~1.5-3KB (typical)
- **Concurrent requests**: No special handling needed

## Rate Limiting

Uses provider's built-in rate limits:
- **Anthropic**: 50k tokens/day (free tier), more for paid
- **OpenAI**: Depends on tier (free: limited, pro: higher)

No rate limiting on the endpoint itself - respects provider limits.
