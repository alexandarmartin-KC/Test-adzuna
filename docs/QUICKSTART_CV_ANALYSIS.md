# Quick Start Guide - CV Analysis Feature

## Setup (5 minutes)

### 1. Get an AI API Key

Choose **one** of these providers:

#### Option A: Anthropic Claude (Recommended)
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up for a free account
3. Go to "API Keys" in the dashboard
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

#### Option B: OpenAI GPT
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up for an account
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### 2. Configure Your Environment

Create a `.env.local` file in the project root:

```bash
# For Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OR for OpenAI GPT
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Open the CV Analysis Page

Navigate to: [http://localhost:3000/cv-analysis](http://localhost:3000/cv-analysis)

## Usage

### Method 1: Paste CV Text

1. Copy your CV text to clipboard
2. Paste into the textarea
3. Click "Analyze CV"
4. Wait 5-15 seconds for results

### Method 2: Upload Text File

1. Save your CV as a `.txt` file
2. Click "Upload CV (text file)"
3. Select your file
4. Click "Analyze CV"

## What You'll Get

The analysis provides:

1. **Hard Skills**: Technical skills, tools, and technologies
2. **Soft Skills**: Leadership, communication, problem-solving, etc.
3. **Professional Summary**: 4-7 sentence overview of your profile
4. **Career Progression (Same Track)**: Next step in your current career path
5. **Alternative Career Track**: New career direction using transferable skills

## Example CV Format

```text
John Doe
Software Engineer

EXPERIENCE
Senior Developer at Tech Corp (2020-2025)
- Led team of 5 developers building React applications
- Implemented CI/CD pipelines using GitHub Actions
- Reduced deployment time by 60%

Developer at StartupCo (2017-2020)
- Built RESTful APIs using Node.js and Express
- Worked with PostgreSQL and MongoDB
- Collaborated with product team on feature planning

EDUCATION
B.S. Computer Science, University of Example (2017)

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker
```

## Tips for Best Results

✅ **Do:**
- Include full work history with responsibilities
- List specific technologies and tools used
- Mention achievements and impact
- Include education and certifications

❌ **Don't:**
- Submit HTML-formatted CVs (extract text first)
- Submit CVs shorter than 100 words
- Include sensitive personal information you don't want analyzed

## Troubleshooting

### "AI API key not configured"

**Solution:** 
1. Check that `.env.local` exists in project root
2. Verify the API key is correct and starts with `sk-`
3. Restart the dev server: `npm run dev`

### "Analysis failed"

**Solution:**
1. Verify you have API credits remaining
2. Check the browser console for error details
3. Try with a shorter CV to test

### No results appear

**Solution:**
1. Check browser console for errors (F12)
2. Verify the API endpoint is responding: [http://localhost:3000/api/cv-analysis](http://localhost:3000/api/cv-analysis)
3. Check that your CV text is plain text, not formatted

## Costs

- Typical analysis: $0.01-0.05 per CV
- Both providers offer free trial credits
- See [docs/CV_ANALYSIS.md](./CV_ANALYSIS.md) for detailed pricing

## Next Steps

After analyzing your CV:
1. Review the skills identified
2. Consider the career progression suggestions
3. Use insights to update your CV
4. Search for matching jobs at [http://localhost:3000](http://localhost:3000)

## Need Help?

- Full documentation: [docs/CV_ANALYSIS.md](./CV_ANALYSIS.md)
- API reference: [README.md](../README.md#api-documentation)
- Open an issue on GitHub for bugs or questions
