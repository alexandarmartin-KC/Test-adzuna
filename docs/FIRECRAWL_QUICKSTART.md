# Firecrawl Feature - Quick Start

## 🚀 Getting Started in 3 Steps

### 1. Environment Variable (Already Done ✅)
The `FIRECRAWL_API_KEY` has been added to `.env.local`

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Open the Firecrawl Page
Navigate to: http://localhost:3000/firecrawl

## 📋 What Was Implemented

- **New Page**: `/firecrawl` accessible from main navigation
- **Backend API**: `/api/firecrawl/jobs` with filtering support
- **Features**:
  - One-time crawl from Ørsted and Canon career pages
  - Server-side caching
  - Company filter (Ørsted / Canon)
  - Country filter (DK / SE / NO)
  - Text search (title & location)
  - Results table with external links

## 🧪 Quick Test

### Option 1: Use the UI
1. Go to http://localhost:3000/firecrawl
2. Click "Fetch Jobs"
3. Try different filters

### Option 2: Test the API
```bash
# Run the automated test script
./test-firecrawl.sh
```

### Option 3: Manual API Test
```bash
# Fetch all jobs (triggers initial crawl)
curl http://localhost:3000/api/firecrawl/jobs | jq

# Filter by company
curl "http://localhost:3000/api/firecrawl/jobs?company=orsted" | jq

# Search
curl "http://localhost:3000/api/firecrawl/jobs?q=engineer" | jq
```

## 📁 Files Created/Modified

### New Files
- `app/api/firecrawl/jobs/route.ts` - Backend API
- `app/firecrawl/page.tsx` - Frontend page
- `docs/FIRECRAWL_SETUP.md` - Setup guide
- `docs/FIRECRAWL_IMPLEMENTATION.md` - Implementation details
- `test-firecrawl.sh` - Test script
- `.env.local` - Environment config

### Modified Files
- `app/layout.tsx` - Added navigation link

## 🌐 For Production Deployment

Add this environment variable to Vercel:
```
FIRECRAWL_API_KEY=fc-208e755be49d410caead6d4277556495
```

Then deploy normally.

## 📚 Full Documentation

- [Setup Guide](FIRECRAWL_SETUP.md) - Detailed setup instructions
- [Implementation Summary](FIRECRAWL_IMPLEMENTATION.md) - Complete technical details

## ❓ Common Questions

**Q: Where is the data stored?**  
A: In-memory cache on the server (resets on restart)

**Q: How do I refresh the data?**  
A: Add `?recrawl=true` to the API URL or restart the server

**Q: Which sites are crawled?**  
A: 
- https://orsted.com/en/careers/vacancies-list
- https://www.canon.dk/careers/
- https://www.canon.no/careers/
- https://www.canon.se/careers/

**Q: Does it respect robots.txt?**  
A: Yes, Firecrawl API handles this automatically

## ✅ You're Ready!

Everything is set up and ready to use. Just start the dev server and navigate to `/firecrawl`.
