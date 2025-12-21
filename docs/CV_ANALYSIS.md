# CV Analysis Feature Documentation

## Overview

The CV Analysis feature uses AI (Anthropic Claude or OpenAI GPT) to analyze CV text and provide comprehensive career insights including skills extraction, professional summary, and career progression recommendations.

## System Prompt

The AI uses the following system prompt to analyze CVs:

```text
You are an experienced career advisor AI.

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

Do NOT include any other top-level keys. Do NOT include explanations outside the JSON.
```

## API Endpoint

### POST `/api/cv-analysis`

Analyzes CV text and returns structured career insights.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "cvText": "Your full CV text here..."
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "hard_skills": [
      "Python",
      "React",
      "TypeScript",
      "AWS",
      "Docker",
      "PostgreSQL"
    ],
    "soft_skills": [
      "Leadership",
      "Communication",
      "Problem Solving",
      "Team Collaboration"
    ],
    "summary": "Experienced software engineer with 8 years in full-stack development. Strong technical foundation in modern web technologies and cloud infrastructure. Demonstrated leadership through mentoring junior developers and leading cross-functional teams. Proven ability to deliver complex projects on time while maintaining code quality.",
    "career_progression_same_track": "Based on your experience, a natural next step would be a Senior Engineering Manager or Technical Lead role. This progression leverages your technical expertise and growing leadership skills. To prepare, consider: 1) Strengthening people management skills through formal training, 2) Gaining more experience in strategic planning and roadmap development, 3) Building stronger stakeholder management capabilities.",
    "career_progression_new_track": "Your technical skills and problem-solving abilities could transfer well to Product Management. Your engineering background provides valuable technical credibility when working with development teams. Missing skills include: market research, user research methodologies, and product strategy frameworks. To bridge this gap: 1) Take courses in product management fundamentals (e.g., Pragmatic Marketing), 2) Shadow product managers at your current company, 3) Lead product-facing initiatives to gain hands-on experience."
  },
  "provider": "anthropic"
}
```

**Error (400 - Invalid Input):**
```json
{
  "error": "Invalid input",
  "message": "cvText is required and must be a non-empty string"
}
```

**Error (500 - Configuration):**
```json
{
  "error": "Configuration error",
  "message": "AI API key not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables"
}
```

**Error (500 - Analysis Failed):**
```json
{
  "error": "Analysis failed",
  "message": "Error details..."
}
```

## Configuration

### Environment Variables

Set ONE of the following in your `.env.local` file:

**Option 1: Anthropic Claude (Recommended)**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**Option 2: OpenAI GPT**
```bash
OPENAI_API_KEY=sk-xxxxx
```

### Getting API Keys

**Anthropic:**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy and add to `.env.local`

**OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy and add to `.env.local`

## Models Used

- **Anthropic**: `claude-3-5-sonnet-20241022` (latest Sonnet model)
- **OpenAI**: `gpt-4o` (GPT-4 Optimized)

## UI Component

### Usage

The CV analysis page is available at `/cv-analysis`:

```typescript
http://localhost:3000/cv-analysis
```

### Features

1. **Text Input**: Large textarea for pasting CV content
2. **File Upload**: Upload `.txt` files (PDF support coming soon)
3. **Real-time Analysis**: Progress indicator during analysis
4. **Structured Display**: Results organized into clear sections:
   - Professional Summary
   - Hard Skills (blue badges)
   - Soft Skills (purple badges)
   - Career Progression - Same Track (green border)
   - Alternative Career Track (orange border)

### Example Usage

```typescript
// From your own React component
const analyzCV = async (cvText: string) => {
  const response = await fetch('/api/cv-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cvText }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Hard Skills:', data.data.hard_skills);
    console.log('Soft Skills:', data.data.soft_skills);
    console.log('Summary:', data.data.summary);
  }
};
```

## Implementation Details

### API Route (`/app/api/cv-analysis/route.ts`)

The API route:
1. Validates input (cvText must be non-empty string)
2. Checks for API keys (Anthropic or OpenAI)
3. Sends CV text to the AI service with the system prompt
4. Parses and validates the JSON response
5. Returns structured data to the client

### Type Definitions

```typescript
export type CVAnalysisResult = {
  hard_skills: string[];
  soft_skills: string[];
  summary: string;
  career_progression_same_track: string;
  career_progression_new_track: string;
};
```

### Error Handling

The API includes comprehensive error handling:
- Input validation (empty or missing cvText)
- Configuration validation (missing API keys)
- API response validation (non-200 status codes)
- JSON parsing validation (malformed responses)
- Type validation (ensures all required fields are present and correct type)

## Best Practices

1. **CV Format**: Plain text works best. Strip HTML formatting before analysis.
2. **CV Length**: Include full CV for best results. The AI analyzes entire content.
3. **Privacy**: CV text is sent to AI provider. Ensure compliance with data policies.
4. **Rate Limiting**: Implement rate limiting for production use.
5. **Caching**: Consider caching results for repeated analyses.

## Future Enhancements

- [ ] PDF file upload with text extraction
- [ ] Support for multiple CV formats (LinkedIn, JSON Resume)
- [ ] Job matching based on extracted skills
- [ ] CV improvement suggestions
- [ ] Save analysis history
- [ ] Export analysis as PDF/JSON
- [ ] Multi-language support
- [ ] Salary insights based on skills

## Costs

### Anthropic Claude
- Model: Claude 3.5 Sonnet
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens
- Typical CV analysis: ~$0.01-0.05 per request

### OpenAI GPT
- Model: GPT-4o
- Input: ~$5 per million tokens
- Output: ~$15 per million tokens
- Typical CV analysis: ~$0.02-0.08 per request

## Troubleshooting

### "AI API key not configured"
- Ensure you've set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `.env.local`
- Restart your development server after adding environment variables

### "Invalid JSON response from AI service"
- Check your API key is valid and has sufficient credits
- Verify the CV text is properly formatted plain text
- Try with a simpler CV to isolate the issue

### "Analysis failed"
- Check console logs for detailed error messages
- Verify your API key has the correct permissions
- Ensure you have sufficient API credits/quota

### Rate Limiting
- Anthropic: Default limits vary by plan
- OpenAI: Default limits vary by plan
- Implement request throttling if needed

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use `.env.local` for local development
3. **Production**: Use platform environment variables (Vercel, AWS, etc.)
4. **Data Privacy**: CV data is sent to third-party AI services
5. **Rate Limiting**: Implement to prevent abuse
6. **Input Sanitization**: Already implemented in the API route

## Testing

### Manual Testing

1. **Valid CV**:
   ```bash
   curl -X POST http://localhost:3000/api/cv-analysis \
     -H "Content-Type: application/json" \
     -d '{"cvText": "Full CV text here..."}'
   ```

2. **Empty CV**:
   ```bash
   curl -X POST http://localhost:3000/api/cv-analysis \
     -H "Content-Type: application/json" \
     -d '{"cvText": ""}'
   ```

3. **Missing cvText**:
   ```bash
   curl -X POST http://localhost:3000/api/cv-analysis \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

## License

Same as the parent project.
