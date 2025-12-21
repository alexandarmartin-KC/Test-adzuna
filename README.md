# Global Job Search - CoreSignal API Integration

A Next.js application that fetches and displays job listings from worldwide using the CoreSignal Job Search API, with AI-powered CV analysis.

## Features

- 🌍 **Global Coverage**: Job listings from multiple countries worldwide
- 🔍 **Search Functionality**: Filter by job title, keywords, and location
- 🤖 **CV Analysis**: AI-powered career insights and recommendations using Anthropic Claude or OpenAI GPT
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Fast & Modern**: Built with Next.js 14 and TypeScript
- ☁️ **Vercel Ready**: Easy deployment to Vercel

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **API**: CoreSignal Job Search API
- **Styling**: Inline styles (minimal, ready for CSS framework)

## Project Structure

```
Test-adzuna/
├── app/
│   ├── api/
│   │   ├── jobs/
│   │   │   └── route.ts          # API endpoint for job fetching
│   │   └── cv-analysis/
│   │       └── route.ts          # API endpoint for CV analysis
│   ├── cv-analysis/
│   │   └── page.tsx              # CV analysis page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page with job listings
├── lib/
│   └── adzunaClient.ts           # CoreSignal API client
├── .env.example                  # Environment variables template
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js 18+ installed
- CoreSignal API credentials
- Anthropic API key (for Claude) or OpenAI API key (for GPT) for CV analysis

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Test-adzuna
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Add your AI API key (choose one):
   - For Anthropic Claude: Add `ANTHROPIC_API_KEY=sk-ant-...`
   - For OpenAI GPT: Add `OPENAI_API_KEY=sk-...`
   
   The CoreSignal API key is already integrated into the application.

## Running Locally

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) for job search or [http://localhost:3000/cv-analysis](http://localhost:3000/cv-analysis) for CV analysis

3. **Search for jobs**
   - Select a country from the dropdown (19 countries available)
   - Enter job keywords (e.g., "developer", "engineer")
   - Enter location (e.g., "New York", "London", "Berlin")
   - Click "Search Jobs"

4. **Analyze a CV**
   - Go to [http://localhost:3000/cv-analysis](http://localhost:3000/cv-analysis)
   - Paste CV text or upload a text file
   - Click "Analyze CV" to get AI-powered insights

## Supported Countries

Adzuna API supports job searches in the following countries:
- 🇺🇸 United States (us)
- 🇬🇧 United Kingdom (gb)
- 🇩🇪 Germany (de)
   - Enter job keywords (e.g., "developer", "engineer")
   - Enter location (e.g., "New York", "London", "Berlin")
   - Click "Search Jobs"

## API Documentation

### GET `/api/jobs`

Fetches job listings from the CoreSignal API.

**Query Parameters:**
- `country` (string, optional): Country code (e.g., "us", "gb", "de")
- `what` (string, optional): Job keywords
- `where` (string, optional): Location
- `company` (string, optional): Company name
- `page` (number, optional): Page number (default: 1)

**Example:**
```
GET /api/jobs?country=us&what=developer&where=New York&page=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "12345",
      "title": "Senior Software Developer",
      "company": "Tech Company Inc.",
      "location": "New York, NY",
      "country": "US",
      "description": "Job description...",
      "url": "https://...",
      "createdAt": "2025-12-21T10:00:00Z"
    }
  ],
  "meta": {
    "country": "us",
    "page": 1,
    "count": 20
  }
}
```

### POSNTHROPIC_API_KEY` or `OPENAI_API_KEY` (for CV analysis) AI to extract skills and provide career recommendations.

**Request Body:**
```json
{
  "cvText": "Full CV text content here..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hard_skills": ["Python", "React", "TypeScript", "AWS", "Docker"],
    "soft_skills": ["Leadership", "Communication", "Problem Solving"],
    "summary": "Experienced software engineer with 8 years...",
    "career_progression_same_track": "Based on your experience...",
    "career_progression_new_track": "With your technical skills..."
  },
  "provider": "anthropic"
}
```

## Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `ADZUNA_APP_ID`
   - `ADZUNA_API_KEY`
   - `ADZUNA_BASE_URL`
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. Click "Deploy" (no environment variables needed - API key is already integrated) ADZUNA_BASE_URL
   ```
**Add environment variables** (optional, for CV analysis)
   ```bash
   vercel env add ANTHROPIC_API_KEY
   # or
   vercel env add OPENAI_API_KEY
5. **Redeploy with environment variables**
   ```bash
   vercel --prod
   ```

## Environment Variables

| VaNTHROPIC_API_KEY` | Your Anthropic API key for Claude | Optional (for CV analysis) |
| `OPENAI_API_KEY` | Your OpenAI API key for GPT | Optional (for CV analysis) |

Choose either Anthropic or OpenAI for CV analysis. The API route will automatically detect which provider is configured.
| `ADZUNA_API_KEY` | Your Adzuna API key | Yes |
| `ADZUNA_BASE_URL` | Adzuna API base URL | No (defaults to `https://api.adzuna.com/v1/api`) |
application can be expanded with:
- 👤 **Candidate Profiling**: User profiles with skills and preferences
- 🏢 **Company/Cultural Data**: Company information and culture insights
- 🤖 **AI-Based Job Matching**: Intelligent job recommendations using CV analysis
- 💾 **Database Integration**: Save favorite jobs and applications
- 📄 **PDF CV Upload**: Support for PDF file uploads with text extraction
- 🔐 **Authentication**: User accounts and saved analyses
## Environment Variables

No environment variables are required. The CoreSignal API key is integrated directly into the application.
- Check that you're using a supported country code
## Key Features

- **API-Based**: CoreSignal API only - no web scraping
- **Modular Design**: Easy to extend with new features
- **Type Safety**: Fully typed with TypeScript
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **AI Integration**: Anthropic Claude and OpenAI GPT support for CV analysis

## Troubleshooting

### Job Search Issues
- Check that you're using a supported country code
- Try a broader search with fewer filters

### CV Analysis Issues
- Ensure you have set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in your `.env.local` file
- Restart the development server after adding environment variables
- Check that your CV text is in plain text format (not HTML or formatted text)
### No jobs returned
- Try a broader search with fewer filters
- Check your internet connection

### API rate limits
- CoreSignal