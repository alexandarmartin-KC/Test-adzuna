# Firecrawl Feature Setup

## Overview

The Firecrawl feature crawls job postings from Ørsted and Canon career pages using the Firecrawl API. It performs a one-time crawl, caches the results server-side, and provides filtering capabilities.

## Environment Variable Setup

### Required Environment Variable

Add the following environment variable to your `.env.local` file:

```bash
FIRECRAWL_API_KEY=fc-208e755be49d410caead6d4277556495
```

### For Local Development

1. Create a `.env.local` file in the root directory if it doesn't exist:
   ```bash
   touch .env.local
   ```

2. Add the API key:
   ```bash
   echo "FIRECRAWL_API_KEY=fc-208e755be49d410caead6d4277556495" >> .env.local
   ```

3. Restart your development server for the changes to take effect.

### For Production (Vercel)

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name**: `FIRECRAWL_API_KEY`
   - **Value**: `fc-208e755be49d410caead6d4277556495`
   - **Environment**: Production (and/or Preview/Development as needed)
4. Redeploy your application

## Features

### API Endpoint

**GET** `/api/firecrawl/jobs`

Query Parameters:
- `company` (optional): Filter by company - "orsted" or "canon"
- `country` (optional): Filter by country - "dk", "se", or "no"
- `q` (optional): Free text search in job title or location
- `recrawl` (optional): Set to "true" to force a new crawl (for testing)

Example:
```bash
/api/firecrawl/jobs?company=orsted&country=dk&q=engineer
```

### Frontend Page

Access the Firecrawl page at `/firecrawl`

Features:
- **Company Filter**: Filter jobs by Ørsted or Canon
- **Country Filter**: Filter jobs by Denmark, Sweden, or Norway
- **Search Box**: Search for keywords in job title or location
- **Results Table**: Displays job title, company, location, country, and application link
- **Caching**: Shows when data was last crawled

## Crawled Sources

The feature crawls the following career pages:
- https://orsted.com/en/careers/vacancies-list
- https://www.canon.dk/careers/
- https://www.canon.no/careers/
- https://www.canon.se/careers/

## How It Works

1. **First Request**: When the API endpoint is called for the first time, it initiates a Firecrawl crawl of all configured URLs
2. **Caching**: Results are cached in memory on the server
3. **Subsequent Requests**: Cached data is returned with applied filters
4. **Filtering**: Filters are applied server-side before returning results
5. **Recrawl**: Use the `recrawl=true` parameter to fetch fresh data

## Data Model

Each job posting includes:
```typescript
{
  title: string;           // Job title
  company: string;         // "Orsted" or "Canon"
  country: string;         // "DK", "SE", "NO", etc.
  location: string;        // City or location description
  department?: string;     // Department/team (optional)
  url: string;            // URL to job application page
}
```

## Notes

- The crawl respects robots.txt for all domains
- Crawling is performed once per server instance to minimize API usage
- For persistent caching across deployments, consider implementing database storage
- The in-memory cache will be cleared when the server restarts

## Troubleshooting

### "FIRECRAWL_API_KEY is not configured" Error

Make sure the environment variable is properly set:
1. Check `.env.local` file exists and contains the API key
2. Restart your development server
3. For production, verify the environment variable in Vercel settings

### No Jobs Returned

1. Check the server logs for crawling errors
2. Try using `?recrawl=true` to force a fresh crawl
3. Verify the Firecrawl API key is valid and has sufficient credits

### Filtering Not Working

- Ensure filter values are lowercase (e.g., "orsted", not "Orsted")
- Country codes should be lowercase ("dk", "se", "no")
- Search query is case-insensitive and searches both title and location
