# Adding New Companies to Firecrawl

## Overview

The Firecrawl feature now automatically discovers career pages for companies. You only need to provide basic company information.

## How to Add a New Company

Edit [`app/api/firecrawl/jobs/route.ts`](../app/api/firecrawl/jobs/route.ts) and add to the `COMPANIES` array:

```typescript
const COMPANIES: CompanyConfig[] = [
  // ... existing companies ...
  
  // Add your new company:
  { 
    name: "CompanyName",
    domain: "https://www.company.com",
    country: "DK" // Optional: use if company is country-specific
  },
];
```

## Configuration Options

### Required Fields

- **name**: Company name (will be displayed in results)
- **domain**: Base domain URL (e.g., `https://www.company.com`)

### Optional Fields

- **country**: Two-letter country code ("DK", "SE", "NO", etc.) if the domain is country-specific
- **careersPath**: If you know the exact careers path (e.g., `/en/careers/jobs`), provide it to skip auto-discovery

## How It Works

### 1. Auto-Discovery
When you add a company with just `name` and `domain`, the system will:
1. Use Firecrawl's `/map` API to search for careers-related pages
2. Try common careers page paths (`/careers`, `/jobs`, `/career`, etc.)
3. Select the most relevant careers page automatically

### 2. Job Extraction
Once the careers page is found:
1. Firecrawl scrapes and extracts structured job data
2. Jobs are normalized to a consistent format
3. Results are cached in memory

### 3. Filtering
Users can filter jobs by:
- Company name
- Country
- Text search (title/location)

## Examples

### Simple Configuration
```typescript
{ 
  name: "Microsoft", 
  domain: "https://www.microsoft.com"
}
```
→ System will automatically find the careers page

### With Known Careers Path
```typescript
{ 
  name: "Google", 
  domain: "https://www.google.com",
  careersPath: "/careers/jobs"
}
```
→ Will go directly to `https://www.google.com/careers/jobs`

### Country-Specific
```typescript
{ 
  name: "IKEA", 
  domain: "https://www.ikea.dk",
  country: "DK"
}
```
→ Jobs will be tagged with country "DK"

### Multiple Countries for Same Company
```typescript
{ name: "Canon", domain: "https://www.canon.dk", country: "DK" },
{ name: "Canon", domain: "https://www.canon.se", country: "SE" },
{ name: "Canon", domain: "https://www.canon.no", country: "NO" },
```
→ Each domain is crawled separately

## Testing

After adding companies:

1. **Redeploy** the application
2. **Force a recrawl**: Visit `/api/firecrawl/jobs?recrawl=true`
3. **Check logs** in Vercel to see discovery and crawl results
4. **Verify results** on the Firecrawl page

## Troubleshooting

### No Jobs Found
- Check Vercel logs for discovery results
- Try providing `careersPath` explicitly if auto-discovery fails
- Verify the domain is accessible and has a careers section

### Wrong Jobs Extracted
- The AI extraction may need tuning for specific page structures
- Consider adjusting the extraction prompt in the code
- Some career pages may require custom handling

### Slow Performance
- First crawl takes 1-3 minutes (normal)
- Add `careersPath` to skip discovery step and speed up crawling
- Cached results are instant on subsequent requests

## Advanced: Custom Careers Path Patterns

If you're adding multiple companies from the same platform (e.g., Oracle Cloud, Workday), you can create a helper function:

```typescript
// Helper for Oracle Cloud careers pages
function oracleCloudJobs(company: string, countryName: string, locationId: string) {
  return {
    name: company,
    domain: `https://ejqe.fa.em2.oraclecloud.com`,
    careersPath: `/hcmUI/CandidateExperience/en/sites/CX_1/jobs?location=${countryName}&locationId=${locationId}&locationLevel=country&mode=location`,
    country: countryName.slice(0, 2).toUpperCase()
  };
}

// Use it:
const COMPANIES: CompanyConfig[] = [
  oracleCloudJobs("Canon", "Denmark", "300000000294904"),
  oracleCloudJobs("Canon", "Sweden", "300000000294905"), // example ID
  // ... etc
];
```

## Benefits of This Approach

✅ **Scalable**: Add dozens of companies with minimal configuration  
✅ **Automatic**: No manual URL hunting required  
✅ **Flexible**: Works with different career page structures  
✅ **Maintainable**: Simple, declarative configuration  
✅ **Fast**: Optional caching of discovered URLs (future enhancement)

## Next Steps

1. Add your companies to the configuration
2. Deploy and test
3. Monitor logs for any issues
4. Adjust configuration as needed
