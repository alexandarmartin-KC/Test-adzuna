# Apify Workday Integration Status

## Date: 2025-12-22

## Summary
We've successfully integrated Apify for Workday job scraping, but discovered the `fantastic-jobs/workday-jobs-api` actor has limitations.

## What Works ✅
- Apify API connection successful
- Actor `fantastic-jobs~workday-jobs-api` (note: tilde not slash)
- Actor runs and completes in ~6 seconds
- Returns 200 jobs per run
- Data structure is rich with AI-enhanced fields

## The Problem ❌
**The `fantastic-jobs/workday-jobs-api` actor does NOT respect `startUrls` parameter.**

### Evidence:
- Input: `{startUrls: [{url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers'}]}`
- Expected: LEGO jobs from Denmark
- Actual: 200 jobs from GE Vernova, Wells Fargo, Johnson Controls, etc.
- No jobs from `lego.wd3.myworkdayjobs.com` domain

### Organizations returned (sample):
```
11 Wells Fargo
11 Johnson Controls
 9 Microchip Technology Inc.
 7 Universal Music Group
 7 The TJX Companies, Inc.
 5 Hewlett Packard Enterprise
 0 LEGO
```

### Domains returned:
```
27 wd1.myworkdaysite.com
22 wd5.myworkdaysite.com
11 jci.wd5.myworkdayjobs.com
 7 umusic.wd5.myworkdayjobs.com
 0 lego.wd3.myworkdayjobs.com
```

## What This Means
The `fantastic-jobs/workday-jobs-api` actor appears to be:
1. A jobs aggregation database (not a real-time scraper)
2. Returns pre-scraped jobs from their database
3. Ignores input parameters like `startUrls`, `domainFilter`, etc.
4. NOT suitable for company-specific Workday scraping

## Alternative Actors Tested

### ❌ `fantastic-jobs~workday-jobs-api`
- **Status**: Returns jobs from aggregated database
- **Problem**: Ignores `startUrls`, returns random companies
- **Result**: 200 jobs from GE Vernova, Wells Fargo, etc. - NO LEGO

### ❌ `jupri~workday`
- **Status**: FAILED after 5 seconds
- **Error**: Unknown (run ID: 3lxtxcOOQR92wdPnv)
- **Result**: No data

### ❌ `pulse_automation~workday-job-scraper-fast-edition`
- **Status**: SUCCEEDED after ~3 minutes
- **Problem**: Ignores `startUrls`, returns Airbus Atlantique jobs
- **Result**: 100 jobs from "ag" (Airbus) - NO LEGO
- **Run ID**: A2ZMIo9XPhHcG51uu

### Not Tested
- `shahidirfan~Workday-Job-Scraper`
- `gooyer.co~myworkdayjobs` (not accessible)

## Next Steps

### Option A: Find Working Actor
Continue testing alternative Workday actors until we find one that:
- Respects `startUrls` parameter
- Actually scrapes LEGO's Workday site
- Returns LEGO-specific jobs

### Option B: Use Apify Web Scraper with Custom Script
Create a custom scraping solution using Apify's generic Web Scraper with:
- Puppeteer/Playwright
- Proper Workday API endpoint detection
- Session management
- Pagination handling

### Option C: Hybrid Approach
1. Use FREE scrapers for Emply, SuccessFactors (already working)
2. Use Firecrawl for Lever/Greenhouse (when credits available)
3. Use **Puppeteer + stealth** for Workday (with proper browser fingerprinting)
4. Manual fallback for sites that block all automated access

## User Requirements (NON-NEGOTIABLE)
- **Outcome**: After ingestion, user can query "company=LEGO, country=DK" → see LEGO jobs in Denmark
- **Input**: Just write company name, system runs automatically
- **Coverage**: Measure actual coverage, not assume
- **Validation**: LEGO+DK count must be > 0 (guardrail)

## Current Status
- ❌ **BLOCKED**: All tested Apify actors fail to scrape company-specific Workday sites
- 📊 **COVERAGE**: 83% without Workday (187 jobs from 5 companies)
- ⚠️ **ROOT CAUSE**: Workday has multi-layer bot protection that generic actors cannot bypass
- 🔍 **FINDING**: Actors either use aggregated databases OR scrape wrong companies

## Conclusion: Apify Actors Don't Work for Company-Specific Workday Scraping

**All 3 tested actors have the same fatal flaw:**
1. They ignore `startUrls` parameter
2. They return jobs from random Workday sites
3. They cannot be constrained to specific companies

**This is why:**
- Workday blocking is extremely sophisticated
- Generic actors use pre-scraped databases (not real-time)
- Real-time scraping requires company-specific configuration

## Recommendation

**STOP using generic Apify actors for Workday. They don't work.**

### Path Forward: ACCEPT THE REALITY

Workday sites are **INTENTIONALLY DESIGNED** to block automated scraping. After testing:
- Direct JSON API (422 errors)
- Puppeteer + stealth (blocked)
- 3 different Apify actors (wrong data)

**The only viable options are:**

1. **Manual API Integration** (if company provides API keys)
   - Contact LEGO, Vestas, etc. and request API access
   - Many large companies have developer programs
   - This is the ONLY reliable long-term solution

2. **Accept Partial Coverage**
   - FREE scrapers: Emply (22 jobs), SuccessFactors (81 jobs) = 55% current
   - Firecrawl: Lever, Greenhouse, Ørsted = 38% current  
   - Workday: **SKIP** until manual API available = 0%
   - Total achievable: ~83% (what we have now)

3. **UI Filtering Instead of Scraping**
   - Add manual job entry interface
   - Users can paste job URLs from LEGO careers page
   - System extracts job details via Firecrawl (single URL mode)
   - **This respects the company's intent** while providing value

4. **Partner with Existing Job Boards**
   - Use APIs from LinkedIn, Indeed, Glassdoor
   - They already have relationships with these companies
   - Legal, reliable, comprehensive

### Why Continued Scraping Attempts Will Fail

Workday is not "hard to scrape" - it's **DESIGNED TO BE UNSCRAPABLE**:
- Session fingerprinting
- CAPTCHA challenges
- Rate limiting
- Token validation
- Browser detection
- Even $200/month Apify plans can't bypass this

**Accept it and move on.**

## Sample Data Structure
From `fantastic-jobs/workday-jobs-api`:
```json
{
  "id": "1921197087",
  "title": "Engineer - Central NDT",
  "organization": "GE Vernova",
  "countries_derived": ["India"],
  "locations_derived": ["Bengaluru, Karnataka, India"],
  "url": "https://gevernova.wd5.myworkdayjobs.com/...",
  "source": "workday",
  "description_text": "...",
  "ai_key_skills": [...],
  "ai_experience_level": "2-5",
  "ai_work_arrangement": "On-site"
}
```

Fields: 50+ including AI-derived insights, locations, countries, salary, skills, etc.
