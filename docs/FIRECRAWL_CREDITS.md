# Firecrawl Credit Usage Guide

## Credit Cost Per Request

Based on Firecrawl's pricing, each API call consumes credits:
- **Scrape (v1/scrape)**: 1 credit per page
- **Extract (with schema)**: Additional credits for AI extraction
- **Map (v1/map)**: Multiple credits (maps entire site)

## Current Implementation Credit Usage

### Per Crawl (when clicking "Fetch Jobs")

For the current 5 companies:

1. **Ørsted** (has careersPath):
   - 1 scrape + extract = ~1-2 credits

2. **Novo Nordisk** (has careersPath):
   - 1 scrape + extract = ~1-2 credits

3. **Canon DK** (has careersPath):
   - 1 scrape + extract = ~1-2 credits

4. **Canon NO** (has careersPath):
   - 1 scrape + extract = ~1-2 credits

5. **Canon SE** (has careersPath):
   - 1 scrape + extract = ~1-2 credits

**Total per full crawl: ~5-10 credits**

### If Discovery is Needed (no careersPath)

For each company without careersPath:
- Map API (DISABLED to save credits): 0 credits
- Test up to 3 URLs: 3-6 credits
- Final crawl: 1-2 credits
**Total: 4-8 credits per company**

## Optimizations Applied

✅ **All companies now have careersPath** - No discovery needed!
✅ **Map API disabled** - Saves multiple credits per company
✅ **Discovery limited to 3 URLs** (if needed) - Down from 10
✅ **Early exit on 5+ jobs** - Stops testing as soon as viable page found
✅ **Cached results** - Subsequent requests use cache (0 credits)

## Recommendations

### To Minimize Credit Usage:

1. **Always specify careersPath** when adding companies:
   ```typescript
   { 
     name: "Company", 
     domain: "https://company.com",
     careersPath: "/careers/jobs" // <-- This saves 3-6 credits!
   }
   ```

2. **Use recrawl sparingly**: 
   - Only use `?recrawl=true` when you need fresh data
   - Normal requests use cache (0 credits)

3. **Test locally first** if possible:
   - Manually find the careers page URL
   - Add it to careersPath
   - Avoid expensive discovery

### Current Credit Estimate

With current configuration:
- **First crawl**: ~5-10 credits (all 5 companies)
- **Subsequent requests**: 0 credits (cached)
- **Manual recrawl**: ~5-10 credits

### For 1000 Companies

If you add 1000 companies WITH careersPath defined:
- First crawl: ~1000-2000 credits
- With caching: 0 credits for all subsequent requests

If WITHOUT careersPath (discovery needed):
- First crawl: ~4000-8000 credits (very expensive!)

## Best Practices

1. ✅ **Always specify careersPath** - This is the #1 way to save credits
2. ✅ **Cache results** - Don't recrawl unnecessarily  
3. ✅ **Test URLs manually** - Find careers page yourself, add to config
4. ✅ **Batch companies** - Add many at once, crawl once
5. ❌ **Avoid discovery** - Map API + testing uses many credits

## Monitoring Credits

Check your Firecrawl dashboard:
- https://www.firecrawl.dev/app/usage

You'll see:
- Credits used
- Credits remaining
- API call history

## If You Run Low on Credits

1. **Reduce companies**: Comment out some companies temporarily
2. **Increase cache time**: Modify code to cache longer (currently: until restart)
3. **Manual discovery**: Find URLs yourself, add careersPath
4. **Upgrade plan**: Get more credits from Firecrawl

## Current Status

✅ **Optimized for minimal credit usage**
- Map API: DISABLED
- Discovery: Only 3 URLs tested (if needed)
- All current companies: Have careersPath defined
- Estimated cost per crawl: **5-10 credits**

Your test credits should be sufficient for multiple full crawls!
