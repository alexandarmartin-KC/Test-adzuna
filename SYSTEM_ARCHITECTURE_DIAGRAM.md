# System Architecture - Personality Profile Feature

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CV Analysis Page                                │
│                  (/app/cv-analysis/page.tsx)                        │
└─────────────────────────────────────────────────────────────────────┘
  │
  ├──────────────────────────────────────────────────────────────────────┐
  │  STEP 1: CV Upload & Analysis (existing)                             │
  │  - Upload PDF/text → /api/cv-analysis → Display results              │
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├──────────────────────────────────────────────────────────────────────┐
  │  STEP 2: Personality Wizard (NEW)                                   │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  PersonalityWizard Component                               │    │
  │  │  /app/components/PersonalityWizard.tsx                     │    │
  │  │                                                             │    │
  │  │  ┌─ Section 1: Structure (Q1-6)                            │    │
  │  │  ├─ Section 2: Collaboration (Q7-12)                       │    │
  │  │  ├─ Section 3: Responsibility (Q13-18)                     │    │
  │  │  ├─ Section 4: Change & Learning (Q19-24)                 │    │
  │  │  ├─ Section 5: Resilience (Q25-30)                        │    │
  │  │  ├─ Section 6: Motivation (Q31-36)                        │    │
  │  │  └─ Free-Text Questions (FT1-8)                           │    │
  │  │                                                             │    │
  │  │  Progress: [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  │    │
  │  │  Question: 15/36                                           │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  │                          ↓                                           │
  │  Emits: answers: Record<number, number>                             │
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├─────────────────────────────────────────────────────────────────────┐
  │  Score Calculation (Client-Side)                                    │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  personalityScoring.ts                                      │   │
  │  │                                                             │   │
  │  │  1. Extract Likert answers (1-36)                          │   │
  │  │  2. Apply reverse scoring (questions 4,9,16,21,23,27,29) │   │
  │  │  3. Calculate per-dimension average (6 items each)         │   │
  │  │  4. Convert to 0-100: ((avg-1)/4)*100                    │   │
  │  │  5. Determine levels: Low/Medium/High                      │   │
  │  │  6. Extract free-text answers (ft1-8)                      │   │
  │  │                                                             │   │
  │  │  Output:                                                   │   │
  │  │  {                                                          │   │
  │  │    scores: {                                                │   │
  │  │      structure: 72,                                         │   │
  │  │      collaboration: 55,                                     │   │
  │  │      responsibility: 80,                                    │   │
  │  │      change_learning: 40,                                   │   │
  │  │      resilience: 65,                                        │   │
  │  │      motivation: 60                                         │   │
  │  │    },                                                       │   │
  │  │    levels: {                                                │   │
  │  │      structure: "High",                                     │   │
  │  │      collaboration: "Medium",                               │   │
  │  │      ...                                                    │   │
  │  │    }                                                        │   │
  │  │  }                                                          │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────┘
  │
  ├──────────────────────────────────────────────────────────────────────┐
  │  STEP 3: Personality Visualization (NEW)                            │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  PersonalityVisualization Component                         │    │
  │  │  /app/components/PersonalityVisualization.tsx              │    │
  │  │                                                             │    │
  │  │  [Toggle: Radar Chart | Bar Chart]                         │    │
  │  │                                                             │    │
  │  │  ┌─ Radar Chart                                            │    │
  │  │  │  - 6 axes (one per dimension)                           │    │
  │  │  │  - Grid circles (20%, 40%, 60%, 80%, 100%)            │    │
  │  │  │  - Polygon connecting the 6 scores                      │    │
  │  │  │  - Custom SVG (no external libraries)                   │    │
  │  │  │                                                         │    │
  │  │  └─ Bar Chart                                              │    │
  │  │     - Horizontal bars for each dimension                   │    │
  │  │     - Color-coded by level (Low/Med/High)                 │    │
  │  │                                                             │    │
  │  │  ┌──────────────┬──────────────┬──────────────┐           │    │
  │  │  │  Structure   │ Collaboration│Responsibility│           │    │
  │  │  │  High (72%)  │Medium (55%)  │  High (80%)  │           │    │
  │  │  │  Thrive with │Balanced work │Strong leader │           │    │
  │  │  │  clear plans │and solo time │and owner     │           │    │
  │  │  └──────────────┴──────────────┴──────────────┘           │    │
  │  │  ... (6 cards total)                                       │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────┘
  │
  ├──────────────────────────────────────────────────────────────────────┐
  │  STEP 4: Combined Profile Synthesis (NEW)                           │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │  CombinedProfileSection Component                          │    │
  │  │  /app/components/CombinedProfileSection.tsx                │    │
  │  │                                                             │    │
  │  │  [Generate Combined Profile Button]                        │    │
  │  │                      ↓                                      │    │
  │  │  POST /api/career-advisor/combined-profile                 │    │
  │  │  with:                                                      │    │
  │  │  - CV Profile (from Step 1)                                │    │
  │  │  - Personality Scores (from Step 2)                        │    │
  │  │  - Personality Levels (from Step 2)                        │    │
  │  │  - Free-Text Answers (from Step 2)                         │    │
  │  │                      ↓                                      │    │
  │  │  AI Synthesis (Anthropic/OpenAI)                           │    │
  │  │                      ↓                                      │    │
  │  │  Response:                                                  │    │
  │  │  ✓ Strengths (5-8 bullets)                                │    │
  │  │  ✓ Watchouts (3-6 bullets)                                │    │
  │  │  ✓ Preferred Environments (4-8 bullets)                   │    │
  │  │  ✓ Combined Summary (6-10 sentences)                      │    │
  │  │                                                             │    │
  │  │  Display Results with color-coded sections                │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────┘
  │
  └──────────────────────────────────────────────────────────────────────┐
     STEP 5: (Optional) Job Match - Existing feature, unchanged
  └──────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────┐
│   User Upload CV                │
│   (PDF or Text)                 │
└──────────────┬──────────────────┘
               │
               ↓
┌─────────────────────────────────┐
│  /api/cv-analysis               │
│  (Existing Endpoint)            │
└──────────────┬──────────────────┘
               │
               ↓
        ┌──────────────┐
        │ CVAnalysis   │
        │ Result {     │
        │  hard_skills │
        │  soft_skills │
        │  summary     │
        │  career_prog │
        │ }            │
        └──────┬───────┘
               │
               ├───────────────────────────────────┐
               │                                   │
               ↓                                   ↓
    ┌──────────────────┐          ┌───────────────────────┐
    │ PersonalityWizard│          │ (Store for later)     │
    │ Component        │          │                       │
    └────────┬─────────┘          │ Shown in synthesis    │
             │                    │ request               │
             ↓                    └───────────────────────┘
      Likert Answers
      (36 questions)
      + Free-Text (8)
             │
             ↓
    ┌──────────────────┐
    │ computPersonality│
    │ Scores()         │
    │                  │
    │ - Apply reverse  │
    │   scoring        │
    │ - Calculate      │
    │   averages       │
    │ - Convert to     │
    │   0-100          │
    │ - Get levels     │
    └────────┬─────────┘
             │
             ├──────────────────┐
             │                  │
             ↓                  ↓
    ┌────────────────┐  ┌──────────────┐
    │ PersonalityCore│  │ PersonalityL │
    │ ({             │  │ evels ({     │
    │  structure:72, │  │  structure:  │
    │  collabor.:55, │  │  "High",     │
    │  ...           │  │  collabor.:  │
    │ })             │  │  "Medium"... │
    │                │  │ })           │
    └────────┬───────┘  └────────┬─────┘
             │                   │
             └────────────┬──────┘
                          │
                          ↓
    ┌──────────────────────────────────┐
    │ PersonalityVisualization Component│
    │                                  │
    │ ├─ Render Radar Chart            │
    │ ├─ Toggle to Bar Chart           │
    │ └─ Show 6 dimension cards        │
    └─────────────────────────────────┐
                          │
                          ├───────────────────────────────┐
                          │                               │
                          ↓                               ↓
    ┌──────────────────────────────┐    ┌───────────────────────┐
    │ CombinedProfileSection       │    │ (Store for API call)  │
    │ Component                    │    │ - personalityScores   │
    │                              │    │ - personalityLevels   │
    │ [Generate Profile Button]    │    │ - freeText            │
    └──────────────┬───────────────┘    └───────────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │ POST /api/career-advisor/        │
    │      combined-profile            │
    │                                  │
    │ Request Body:                    │
    │ {                                │
    │   cv_profile: {...},             │
    │   personality: {                 │
    │     scores: {...},               │
    │     levels: {...},               │
    │     free_text: {...}             │
    │   }                              │
    │ }                                │
    └──────────────┬───────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │ Backend Processing               │
    │ - Validate all inputs            │
    │ - Check API key                  │
    │ - Select AI provider             │
    └──────────────┬───────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │ AI Provider (Anthropic/OpenAI)  │
    │                                  │
    │ System Prompt:                   │
    │ "You are a career advisor..."    │
    │                                  │
    │ User Message:                    │
    │ "CV Profile: {...}"              │
    │ "Personality: {...}"             │
    │                                  │
    │ Response (JSON):                 │
    │ {                                │
    │   strengths: [...],              │
    │   watchouts: [...],              │
    │   preferred_environments: [...], │
    │   combined_summary: "..."        │
    │ }                                │
    └──────────────┬───────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │ Response Validation              │
    │ - Parse JSON                     │
    │ - Validate structure             │
    │ - Check required fields          │
    │ - Return 400 if invalid          │
    └──────────────┬───────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │ Frontend Display                 │
    │                                  │
    │ ✓ Profile Summary (paragraph)    │
    │ ✓ Strengths (green bullets)      │
    │ ✓ Watchouts (orange bullets)     │
    │ ✓ Environments (blue bullets)    │
    └──────────────────────────────────┘
```

## State Management Diagram

```
CV Analysis Page State
├─ cvText: string
├─ isLoading: boolean
├─ result: CVAnalysisResult | null
├─ error: string | null
│
├─ jobDescription: string (existing job match)
├─ isMatchLoading: boolean (existing)
├─ matchResult: JobMatchResult | null (existing)
├─ matchError: string | null (existing)
│
├─ personalityAnswers: Record<number, number>  ◄ NEW
│  └─ Stores all 36 Likert answers (1-5) + 8 free text answers
│
├─ personalityScores: PersonalityScores | null  ◄ NEW
│  └─ {
│       structure: 0-100,
│       collaboration: 0-100,
│       responsibility: 0-100,
│       change_learning: 0-100,
│       resilience: 0-100,
│       motivation: 0-100
│     }
│
├─ personalityLevels: PersonalityLevels | null  ◄ NEW
│  └─ {
│       structure: "Low" | "Medium" | "High",
│       collaboration: "Low" | "Medium" | "High",
│       ... (all 6 dimensions)
│     }
│
└─ personalityFreeText: Record<string, string>  ◄ NEW
   └─ {
        ft1: "...",
        ft2: "...",
        ...
        ft8: "..."
      }
```

## Scoring Algorithm Diagram

```
For each dimension (Structure, Collaboration, etc.):

Question 1 Answer: 4 (Agree)
Question 2 Answer: 5 (Strongly agree)
Question 3 Answer: 3 (Neutral)
Question 4 Answer: 2 (Disagree) ◄ REVERSE SCORED
  → Becomes: 6 - 2 = 4
Question 5 Answer: 4 (Agree)
Question 6 Answer: 5 (Strongly agree)

Scores: [4, 5, 3, 4, 4, 5]
Average: (4+5+3+4+4+5) / 6 = 25/6 = 4.167

Convert to 0-100:
percentage = ((4.167 - 1) / 4) * 100
           = (3.167 / 4) * 100
           = 0.79175 * 100
           = 79.175
           ≈ 79 (rounded)

Determine Level:
79 >= 70 → "High"

Result for this dimension:
{
  score: 79,
  level: "High",
  explanation: "You thrive with clear processes..."
}
```

## Component Dependencies

```
CV Analysis Page
├─ PersonalityWizard (rendered when: result && !personalityScores)
│  └─ FreeTextQuestions (subcomponent)
├─ PersonalityVisualization (rendered when: personalityScores && personalityLevels)
│  ├─ RadarChart (subcomponent)
│  └─ BarChart (subcomponent)
└─ CombinedProfileSection (rendered when: personalityScores && personalityLevels)
   └─ API call to /api/career-advisor/combined-profile

Utilities
├─ personalityScoring.ts
│  ├─ computePersonalityScores()
│  ├─ getLevel()
│  └─ getDimensionExplanation()
```

## API Request/Response Cycle

```
┌────────────────────────────────┐
│ Frontend Component             │
│ CombinedProfileSection         │
│                                │
│ onClick: handleGenerate()      │
│  ├─ setIsLoading(true)        │
│  ├─ setError(null)            │
│  └─ fetch("/api/...")         │
└────────────┬───────────────────┘
             │
             ↓
┌────────────────────────────────┐
│ HTTP POST Request              │
│ /api/career-advisor/           │
│ combined-profile               │
│                                │
│ Headers:                       │
│ Content-Type: application/json │
│                                │
│ Body: {                        │
│   cv_profile: {...},           │
│   personality: {               │
│     scores: {...},             │
│     levels: {...},             │
│     free_text: {...}           │
│   }                            │
│ }                              │
└────────────┬───────────────────┘
             │
             ↓
┌────────────────────────────────┐
│ Backend Route Handler          │
│ /app/api/.../route.ts          │
│                                │
│ 1. Parse request.json()        │
│ 2. Validate cv_profile         │
│ 3. Validate personality.scores │
│ 4. Check API key setup         │
│ 5. Select provider             │
│    (Anthropic or OpenAI)       │
└────────────┬───────────────────┘
             │
             ↓
┌────────────────────────────────┐
│ AI Provider API Call           │
│ (anthropic.com or openai.com)  │
│                                │
│ Send:                          │
│ - System prompt                │
│ - User message (CV + personal) │
│ - max_tokens, temperature      │
│                                │
│ Receive:                       │
│ - response_format: json_object │
│ - text content                 │
└────────────┬───────────────────┘
             │
             ↓
┌────────────────────────────────┐
│ Response Processing            │
│                                │
│ 1. Extract text from response  │
│ 2. Strip markdown (if present) │
│ 3. Parse as JSON               │
│ 4. Validate structure          │
│ 5. Check required fields       │
│                                │
│ If valid:                      │
│   Return 200 {                 │
│     success: true,             │
│     data: {...}                │
│   }                            │
│                                │
│ If invalid:                    │
│   Return 400 { error, message }│
└────────────┬───────────────────┘
             │
             ↓
┌────────────────────────────────┐
│ Frontend Response Handler      │
│                                │
│ if (!response.ok)              │
│   → setError(message)          │
│ else if (response.data)        │
│   → setResult(data)            │
│   → Display results            │
│ finally                        │
│   → setIsLoading(false)        │
└────────────────────────────────┘
```

---

This architecture ensures clean separation of concerns, type safety, and robust error handling throughout the entire personality profiling workflow.
