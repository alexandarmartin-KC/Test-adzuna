# Quick Start Guide - Personality Profile Feature

## Installation

No additional npm packages required! The implementation uses:
- React 18 (existing)
- Next.js 14 (existing)
- SVG charts (custom implementation)

## Setup

1. **Ensure API Key is set:**
   ```bash
   # Set one of these in your .env.local
   ANTHROPIC_API_KEY=your-key-here
   # OR
   OPENAI_API_KEY=your-key-here
   ```

2. **Files are already in place:**
   - `/app/components/PersonalityWizard.tsx` ✓
   - `/app/components/PersonalityVisualization.tsx` ✓
   - `/app/components/CombinedProfileSection.tsx` ✓
   - `/lib/personalityScoring.ts` ✓
   - `/app/api/career-advisor/combined-profile/route.ts` ✓
   - CV Analysis page updated with integration ✓

## Using the Feature

### User Flow

1. **Navigate to CV Analysis**
   - Go to `/cv-analysis` in your app

2. **Upload and Analyze CV**
   - Upload PDF or paste text CV
   - Click "Analyze CV"
   - Wait for results

3. **Complete Personality Wizard** (new step)
   - Scroll down to "Personality & Work-Style Profile"
   - Work through 6 sections (one at a time)
   - Answer 36 Likert scale questions (1-5 scale)
   - Complete 8 optional free-text questions
   - See progress indicator throughout

4. **View Visualization** (new step)
   - See 6-dimension overview
   - Toggle between Radar and Bar charts
   - Read dimension explanations

5. **Generate Combined Profile** (new step)
   - Click "Generate Combined Profile"
   - Wait for AI synthesis
   - See strengths, watchouts, preferred environments, summary

### Example Walkthrough

**CV Analysis → Results show ✓**

```
↓ Scroll down

Personality & Work-Style Profile
- Section 1 of 6: Structure
  [Questions 1-6 with Likert buttons]
  
- Progress bar shows: ▓▓▓▓▓▓▓░░░░░░░░░░░░
- Text: "Section 1 of 6: Structure • Question 1 of 36"

- After answering all 6 questions in section:
  [Next →] button becomes active

- Sections 2-6 appear one after another

- After Section 6:
  [Next (Free Text) →]

→ Free-Text Questions section appears
  - 8 optional questions
  - [Back] [Complete Profile]

→ Personality scores calculated ✓

Your Personality Overview
  [Toggle: Radar | Bar]
  
  [Chart visualization]
  
  [6 dimension cards showing score, level, explanation]

Combined Profile Synthesis
  [Generate Combined Profile button]
  
  → Shows:
    - Profile Summary
    - Your Strengths (bullets)
    - Areas to Watch Out For (bullets)
    - Where You Thrive (bullets)
```

## API Integration

### Backend Endpoint

**POST /api/career-advisor/combined-profile**

Call from frontend after personality quiz:
```typescript
const response = await fetch("/api/career-advisor/combined-profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cv_profile: { /* from CV analysis */ },
    personality: {
      scores: { /* 6 dimensions 0-100 */ },
      levels: { /* 6 dimensions Low/Medium/High */ },
      free_text: { /* ft1-ft8 */ }
    }
  })
});
```

Response:
```json
{
  "success": true,
  "data": {
    "strengths": ["...", "..."],
    "watchouts": ["...", "..."],
    "preferred_environments": ["...", "..."],
    "combined_summary": "..."
  }
}
```

## Configuration

### Scoring Dimensions

The 6 personality dimensions are pre-configured:

1. **Structure** - Need for clear procedures and routines
2. **Collaboration** - Energy from teamwork and interaction
3. **Responsibility** - Desire for ownership and influence
4. **Change & Learning** - Comfort with change and learning new things
5. **Resilience** - Ability to handle pressure and recover
6. **Motivation** - Drivers and values in work

### Scoring Levels

- **Low (0-39%)**: Suggests different preference or approach
- **Medium (40-69%)**: Balanced approach, context-dependent
- **High (70-100%)**: Strong preference or strength in this area

## Customization

### Modify Questions

Edit `/app/components/PersonalityWizard.tsx`:
```typescript
const QUESTIONS = [
  {
    id: 1,
    section: "A",
    sectionName: "Structure",
    text: "Your question here",
    reverse: false, // Set to true if answer should be flipped
  },
  // ... more questions
];
```

### Customize Explanations

Edit `/lib/personalityScoring.ts`:
```typescript
export function getDimensionExplanation(dimension, level) {
  const explanations = {
    structure: {
      Low: "Your custom explanation here",
      Medium: "...",
      High: "..."
    }
  };
  return explanations[dimension][level];
}
```

### Adjust Scoring Thresholds

Edit `/lib/personalityScoring.ts`:
```typescript
export function getLevel(score: number): PersonalityLevel {
  if (score < 40) return "Low";    // ← Change these values
  if (score < 70) return "Medium"; // ← Change these values
  return "High";
}
```

### Change Colors

Edit component style props:
```typescript
// In PersonalityVisualization.tsx
const levelColors = {
  Low: "#ff9800",    // Change orange
  Medium: "#2196f3", // Change blue
  High: "#4caf50"    // Change green
};
```

## Troubleshooting

### "Invalid response from server"
- Check API key is set in `.env.local`
- Check network tab in DevTools
- Verify endpoint is running

### Personality scores not calculating
- Ensure all 36 Likert answers are provided
- Check browser console for specific error
- Verify scoring utility file exists

### Chart not displaying
- Clear browser cache
- Check SVG rendering in DevTools
- Verify PersonalityVisualization component loaded

### AI synthesis fails
- Check API key validity
- Verify free text answers aren't too long
- Check API provider status (Anthropic/OpenAI)

## Performance Notes

- Wizard: ~50KB component, renders incrementally
- Charts: Custom SVG, lightweight (no external libs)
- API call: ~2-5 seconds depending on AI provider
- No database calls required (all client-side except final AI call)

## Accessibility

- Likert buttons: Large touch targets (48x48px minimum)
- Color contrast: WCAG AA compliant
- Semantic HTML structure
- Chart tooltips via SVG title elements
- Free-text inputs: Proper labels

## Mobile Responsiveness

- Likert buttons stack responsively
- Chart adjusts to screen width
- Dimension cards: 1-2 column responsive grid
- Text areas: Full width on mobile

## Browser Support

Works in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## What's New vs Original CV Analysis

**Before:**
1. Upload CV → Get analysis results
2. Optional: Match against job description

**After:**
1. Upload CV → Get analysis results
2. **NEW: Complete personality questionnaire**
3. **NEW: View personality visualization**
4. **NEW: Generate combined CV + personality profile**
5. Optional: Match against job description (unchanged)

---

**Questions?** Check `/PERSONALITY_PROFILE_IMPLEMENTATION.md` for detailed documentation.
