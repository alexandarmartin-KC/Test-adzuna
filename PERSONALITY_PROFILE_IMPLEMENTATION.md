# Personality Profile + Visualization Implementation

## Overview

This implementation extends the CV Analysis page with a comprehensive personality profiling system, including:

1. **Multi-step Personality Wizard** - 36-item Likert scale questionnaire across 6 dimensions
2. **Visualization System** - Interactive radar and bar charts
3. **Free-text Questions** - 8 optional open-ended questions for nuance
4. **Combined AI Profile** - Backend synthesis of CV + personality + free text

## Architecture

### Frontend Components

#### 1. PersonalityWizard (`/app/components/PersonalityWizard.tsx`)
- Multi-step form with 6 sections (one per dimension)
- Progress indicator showing "Section X of 6" + "Question Y of 36"
- Large, click-friendly Likert scale buttons (1-5)
- Free-text questions at the end (8 optional questions)
- Validates that all Likert questions are answered before proceeding

**Props:**
```typescript
interface PersonalityWizardProps {
  onComplete: (answers: Record<number, number>) => void;
}
```

**Dimensions Covered:**
1. Structure (questions 1-6)
2. Collaboration (questions 7-12)
3. Responsibility (questions 13-18)
4. Change & Learning (questions 19-24)
5. Resilience (questions 25-30)
6. Motivation (questions 31-36)

**Features:**
- Section navigation (Next/Previous buttons)
- Reverse scoring indication for applicable questions
- Free-text component embedded at the end
- Stores answers including free text (ft1-ft8) in the answers object

#### 2. PersonalityVisualization (`/app/components/PersonalityVisualization.tsx`)
- Displays results after quiz completion
- Toggle between Radar and Bar chart views
- 6 dimension cards below chart with:
  - Score (0-100%)
  - Level badge (Low/Medium/High)
  - Job-focused explanation of the dimension

**Props:**
```typescript
interface PersonalityVisualizationProps {
  scores: PersonalityScores;
  levels: PersonalityLevels;
}
```

**Chart Types:**
- **Radar Chart**: 6-axis radar with grid circles and percentage labels
- **Bar Chart**: Horizontal bars with color coding by level

**Color Scheme:**
- Low (0-39%): Orange (#ff9800)
- Medium (40-69%): Blue (#2196f3)
- High (70-100%): Green (#4caf50)

#### 3. CombinedProfileSection (`/app/components/CombinedProfileSection.tsx`)
- Displays after personality quiz completes
- Button to "Generate Combined Profile" (calls AI endpoint)
- Shows results:
  - Strengths (green bullets)
  - Watchouts (orange bullets, constructive tone)
  - Preferred Environments (blue bullets)
  - Combined Summary paragraph

### Utilities

#### personalityScoring.ts (`/lib/personalityScoring.ts`)
- **computePersonalityScores()** - Calculates dimension scores from Likert answers
  - Applies reverse scoring for 7 items (4, 9, 16, 21, 23, 27, 29)
  - Averages 6 items per dimension
  - Converts 1-5 scale to 0-100: `((avg - 1) / 4) * 100`
- **getLevel()** - Categorizes scores: Low (0-39), Medium (40-69), High (70-100)
- **getDimensionExplanation()** - Returns friendly job-focused explanations

### Backend Endpoint

#### POST /api/career-advisor/combined-profile (`/app/api/career-advisor/combined-profile/route.ts`)

**Request Body:**
```json
{
  "cv_profile": {
    "hard_skills": ["Skill1", "Skill2"],
    "soft_skills": ["Communication", "Leadership"],
    "summary": "Professional summary text",
    "career_progression_same_track": "Career advice text",
    "career_progression_new_track": "Alternative career text"
  },
  "personality": {
    "scores": {
      "structure": 72,
      "collaboration": 55,
      "responsibility": 80,
      "change_learning": 40,
      "resilience": 65,
      "motivation": 60
    },
    "levels": {
      "structure": "High",
      "collaboration": "Medium",
      "responsibility": "High",
      "change_learning": "Low",
      "resilience": "Medium",
      "motivation": "Medium"
    },
    "free_text": {
      "ft1": "Answer to question 1...",
      "ft2": "Answer to question 2...",
      ...
      "ft8": "Answer to question 8..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "strengths": ["Strength 1", "Strength 2", ...],
    "watchouts": ["Area to watch 1", ...],
    "preferred_environments": ["Environment 1", ...],
    "combined_summary": "A fluent summary paragraph..."
  },
  "provider": "anthropic" | "openai"
}
```

**Validation:**
- Requires cv_profile with hard_skills, soft_skills, summary
- Requires personality.scores with all 6 dimensions (0-100 range)
- Supports optional personality.levels (auto-calculated if missing)
- Supports optional personality.free_text

**AI Integration:**
- Uses Anthropic Claude 3.5 Sonnet (preferred) or OpenAI GPT-4o
- Implements system prompt specifying exact JSON output format
- Strips markdown code blocks from response if present
- Validates JSON structure before returning

## Integration Flow

### CV Analysis Page (`/app/cv-analysis/page.tsx`)

1. **Step 1: Upload & Analyze CV** (existing)
   - User uploads PDF/text CV
   - Displays CV analysis results

2. **Step 2: Personality Wizard** (new)
   - Renders after `result` is populated
   - User completes 36 Likert questions across 6 sections
   - User optionally completes 8 free-text questions
   - On completion:
     - Extracts free text answers
     - Computes scores and levels via `computePersonalityScores()`
     - Sets `personalityScores` and `personalityLevels` state

3. **Step 3: Visualization** (new)
   - Renders after personality scores are computed
   - Shows radar/bar chart with dimension cards
   - User can toggle between chart types

4. **Step 4: Combined Profile** (new)
   - Renders below visualization
   - User clicks "Generate Combined Profile"
   - Calls POST /api/career-advisor/combined-profile
   - Displays AI-synthesized results

### State Management
```typescript
// Personality state
const [personalityAnswers, setPersonalityAnswers] = useState<Record<number, number>>({});
const [personalityScores, setPersonalityScores] = useState<PersonalityScores | null>(null);
const [personalityLevels, setPersonalityLevels] = useState<PersonalityLevels | null>(null);
const [personalityFreeText, setPersonalityFreeText] = useState<Record<string, string>>({});
```

## Questionnaire Details

### Likert Scale
- 1 = Strongly disagree
- 2 = Disagree
- 3 = Neutral
- 4 = Agree
- 5 = Strongly agree

### Question Distribution

**A) Structure (Q1-6)**
- Clear procedures and consistent ways of working
- Discomfort with last-minute plan changes
- Double-checking details for accuracy
- Flexibility to switch tasks without clear plan (REVERSE)
- Planning before work
- Comfort with routine tasks

**B) Collaboration (Q7-12)**
- Energy from colleague interaction
- Direct communication style
- Feeling drained from social interaction (REVERSE)
- Preference for collaborative problem-solving
- Sensing others' emotions
- Conflict avoidance

**C) Responsibility (Q13-18)**
- Taking informal leadership
- Motivation from accountability
- Wanting influence over decisions
- Comfort with supporting vs leading (REVERSE)
- Proactive task-seeking
- Thriving in supportive roles (REVERSE)

**D) Change & Learning (Q19-24)**
- Curiosity about new systems/methods
- Viewing role changes as opportunity
- Preference for similar tasks (REVERSE)
- Investment in career-supporting learning
- Frustration with organizational change (REVERSE)
- Quick learning of tools/workflows

**E) Resilience (Q25-30)**
- Managing multiple tasks/deadlines
- Mental ability to "switch off" from work
- Letting criticism linger in mind (REVERSE)
- Staying calm under others' pressure
- Workplace conflicts affecting wellbeing (REVERSE)
- Handling temporary high-pressure periods

**F) Motivation (Q31-36)**
- Job security > career growth
- Meaning > salary
- Flexibility as important factor
- Motivation from goals and visible results
- Importance of social community at work
- Professional and personal development drive

### Reverse Scored Items
Questions 4, 9, 16, 21, 23, 27, 29 are reverse-scored:
- Original answer: 1→5, 2→4, 3→3, 4→2, 5→1
- Formula: `reversed_answer = 6 - original_answer`

### Free-Text Questions
1. What gives you the most energy at work (be specific)?
2. What drains you the most at work (be specific)?
3. Describe a work environment where you thrive best.
4. Describe a work environment you prefer to avoid, and why.
5. What would colleagues say are your biggest strengths?
6. What feedback have you received that you want to improve?
7. What matters most in your next job (pick 2–3 priorities and explain briefly)?
8. If you could choose freely: what tasks do you want more of, and less of?

## Scoring Logic

### Per-Dimension Calculation
1. For each dimension, collect 6 Likert answers
2. Apply reverse scoring where applicable
3. Calculate average: `avg = sum(answers) / 6`
4. Convert to 0-100: `percentage = ((avg - 1) / 4) * 100`
5. Round to nearest integer
6. Determine level: Low (0-39), Medium (40-69), High (70-100)

### Example
If a respondent answers [5, 4, 5, 5, 4, 5] for Structure:
- avg = (5 + 4 + 5 + 5 + 4 + 5) / 6 = 28 / 6 = 4.67
- percentage = ((4.67 - 1) / 4) * 100 = 91.67 ≈ 92
- level = "High"

## UI/UX Features

1. **Progress Indicator**
   - Visual progress bar (6 sections)
   - Text: "Section X of 6: Dimension Name • Question Y of 36"

2. **Likert Button Design**
   - Large, clickable buttons with number and label
   - Selected state: blue background, blue border
   - Hover-friendly with visual feedback

3. **Chart Visualization**
   - Radar: 6-axis with grid circles at 20%, 40%, 60%, 80%, 100%
   - Bars: Horizontal with aligned labels and percentage text
   - Both use consistent color coding

4. **Dimension Cards**
   - Border color matches dimension level
   - Badge with level and score
   - Job-focused explanation (1-2 lines)

5. **Wizard Navigation**
   - Back button disabled on first section
   - Next button validates current section
   - Free-text section has Back and Complete buttons

6. **Loading States**
   - "Analyzing..." button text during API call
   - Disabled button state during processing
   - Error messages with red background

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` OR `OPENAI_API_KEY`

The endpoint supports both providers:
- Anthropic preferred (uses Claude 3.5 Sonnet)
- Falls back to OpenAI (uses GPT-4o)

## Component Dependencies

**No external chart libraries required** - Custom SVG implementations for:
- Radar chart with grid circles, axes, and polygon
- Bar chart with grid lines and percentage markers

All styling uses inline CSS for simplicity and consistency with the existing page design.

## Testing Checklist

- [ ] Upload CV and get analysis results
- [ ] Personality Wizard displays after CV analysis
- [ ] Navigate through 6 sections without errors
- [ ] All Likert questions answer validation works
- [ ] Free-text section displays after section 6
- [ ] Can complete free-text questions
- [ ] Personality scores calculate correctly
- [ ] Visualization displays with correct values
- [ ] Can toggle between radar and bar charts
- [ ] Dimension cards show correct levels and explanations
- [ ] "Generate Combined Profile" button works
- [ ] AI endpoint returns valid JSON
- [ ] Combined profile displays all 4 sections
- [ ] Mobile responsive behavior

## Files Created/Modified

**New Files:**
- `/app/components/PersonalityWizard.tsx` - Multi-step form
- `/app/components/PersonalityVisualization.tsx` - Chart + cards
- `/app/components/CombinedProfileSection.tsx` - Results display
- `/lib/personalityScoring.ts` - Scoring utilities
- `/app/api/career-advisor/combined-profile/route.ts` - Backend endpoint

**Modified Files:**
- `/app/cv-analysis/page.tsx` - Integration and state management

## Future Enhancements

1. Export profile as PDF
2. Compare personality profiles over time
3. Job matching with personality fit
4. Personality-based recommendations for development
5. Team complementarity analysis
6. Personality norm benchmarks by role/industry
