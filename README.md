# Global Job Search - Adzuna API Integration

A Next.js application that fetches and displays job listings from 19 countries worldwide using the Adzuna Job Search API.

## Features

- 🌍 **Global Coverage**: 19 countries including USA, UK, Germany, France, Canada, Australia, and more
- 🔍 **Search Functionality**: Filter by job title, keywords, and location
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Fast & Modern**: Built with Next.js 14 and TypeScript
- ☁️ **Vercel Ready**: Easy deployment to Vercel

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **API**: Adzuna Job Search API
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
│   └── adzunaClient.ts           # Adzuna API client
├── .env.example                  # Environment variables template
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js 18+ installed
- Adzuna API credentials (get them at [developer.adzuna.com](https://developer.adzuna.com/))

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
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Adzuna API credentials:
   ```env
   ADZUNA_APP_ID=your_app_id_here
   ADZUNA_API_KEY=your_api_key_here
   ADZUNA_BASE_URL=https://api.adzuna.com/v1/api
   ```

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
- 🇫🇷 France (fr)
- 🇨🇦 Canada (ca)
- 🇦🇺 Australia (au)
- 🇦🇹 Austria (at)
- 🇧🇪 Belgium (be)
- 🇧🇷 Brazil (br)
- 🇨🇭 Switzerland (ch)
- 🇪🇸 Spain (es)
- 🇮🇳 India (in)
- 🇮🇹 Italy (it)
- 🇲🇽 Mexico (mx)
- 🇳🇱 Netherlands (nl)
- 🇳🇿 New Zealand (nz)
- 🇵🇱 Poland (pl)
- 🇸🇬 Singapore (sg)
- 🇿🇦 South Africa (za)

## API Documentation

### GET `/api/jobs`

Fetches job listings from the Adzuna API.

**Query Parameters:**
- `country` (string, optional): Country code - see supported countries list above. Default: `us`
- `what` (string, optional): Job title or keywords
- `where` (string, optional): Location name
- `page` (number, optional): Page number for pagination. Default: `1`

**Example Request:**
```bash
curl "http://localhost:3000/api/jobs?country=us&what=developer&where=New York&page=1"
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

4. **Add environment variables**
   ```bash
   vercel env add ADZUNA_APP_ID
   vercel env add ADZUNA_API_KEY
   vercel env add ADZUNA_BASE_URL
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
- 🔐 **Authentication**: User accounts and saved searches
- 📊 **Analytics**: Track job market trends

## Development Notes

- **No Scraping**: This project uses the official Adzuna API only - no web scraping
- **Modular Design**: Easy to extend with new features
- **Type Safety**: Fully typed with TypeScript
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Security**: API credentials never exposed to the client

## Troubleshooting

### "Missing Adzuna API credentials" error
- Make sure `.env.local` exists and contains valid credentials
- Restart the development server after adding environment variables

### No jobs returned
- Verify your API credentials are correct
- Check that you're using a supported country code
- Try a broader search with fewer filters

### API rate limits
- Adzuna has rate limits on their API
- Consider implementing caching for production use

## License

MIT

## Contributing

This is a private project. For questions or suggestions, please contact the repository owner.

---

**Built with ❤️ for the global job market**
