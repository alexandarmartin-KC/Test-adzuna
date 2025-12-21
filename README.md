# Global Job Search - CoreSignal API Integration

A Next.js application that fetches and displays job listings from worldwide using the CoreSignal Job Search API.

## Features

- 🌍 **Global Coverage**: Job listings from multiple countries worldwide
- 🔍 **Search Functionality**: Filter by job title, keywords, and location
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
│   │   └── jobs/
│   │       └── route.ts          # API endpoint for job fetching
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
   
   The CoreSignal API key is already integrated into the application. No additional environment variables are required.

## Running Locally

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Search for jobs**
   - Select a country from the dropdown (19 countries available)
   - Enter job keywords (e.g., "developer", "engineer")
   - Enter location (e.g., "New York", "London", "Berlin")
   - Click "Search Jobs"

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

Fetches job listings from the CoreSignal?country=us&what=developer&where=New York&page=1"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "12345",
      "title": "Senior Software Developer",
      "company": "Tech Company A/S",
      "location": "Copenhagen",
      "country": "DK",
      "description": "Job description...",
      "url": "https://...",
      "createdAt": "2025-12-21T10:00:00Z",
      "salaryMin": 500000,
      "salaryMax": 700000
    }
  ],
  "meta": {
    "country": "dk",
    "page": 1,
    "count": 20
  }
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

5. **Redeploy with environment variables**
   ```bash
   vercel --prod
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ADZUNA_APP_ID` | Your Adzuna application ID | Yes |
| `ADZUNA_API_KEY` | Your Adzuna API key | Yes |
| `ADZUNA_BASE_URL` | Adzuna API base URL | No (defaults to `https://api.adzuna.com/v1/api`) |

## Future Enhancements

This MVP is designed to be expanded with:
- 👤 **Candidate Profiling**: User profiles with skills and preferences
- 🏢 **Company/Cultural Data**: Company information and culture insights
- 🤖 **AI-Based Matching**: Intelligent job recommendations using AI
- 💾 **Database Integration**: Save favorite jobs and applications
- 🔐 Deploy to production**
   ```bash
   vercel --prod
   ```

## Environment Variables

No environment variables are required. The CoreSignal API key is integrated directly into the application.
- Check that you're using a supported country code
- Try a broader search with fewer filtersCoreSignal API only - no web scraping
- **Modular Design**: Easy to extend with new features
- **Type Safety**: Fully typed with TypeScript
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Security**: API credentials securely integrated

## Troubleshooting

### No jobs returned
- Try a broader search with fewer filters
- Check your internet connection

### API rate limits
- CoreSignal