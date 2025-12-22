# MANUAL VERIFICATION REQUIRED

## Current Status

**What we've tested:**
- ✅ Multiple payload variations (appliedFacets as {}, [], missing) → All return 422
- ✅ Session cookies from GET request → Still returns 422
- ✅ Browser User-Agent headers → Still returns 422
- ✅ Puppeteer automation (even with stealth) → Returns "Workday is currently unavailable"
- ✅ Direct curl to HTML pages → Returns 500 error

**Current classification:**
- HTTP 422: `VALIDATION_ERROR` (JSON response with empty message)
- HTTP 500: `SERVER_ERROR_UNKNOWN` (no specific challenge signature in body)

## What We Cannot Verify Programmatically

We **cannot** prove this is bot protection vs wrong endpoint without seeing a **working browser request**.

Workday blocks:
- All automated tools (curl, Python requests, Node fetch)
- Puppeteer (even with stealth plugin)
- Any non-browser client

## MANUAL VERIFICATION NEEDED

Please perform this test in your browser:

### Step 1: Open Browser DevTools

1. Open Chrome/Firefox
2. Press F12 → Go to "Network" tab
3. Visit: https://coloplast.wd3.myworkdayjobs.com/en-US/Coloplast
4. Wait for jobs to load on the page

### Step 2: Find the Jobs API Call

Look for a POST request to something like:
```
/wday/cxs/coloplast/Coloplast/jobs
```

**If you find it:**
- ✅ Right-click → "Copy" → "Copy as cURL"
- Paste the command here
- Note the response status (should be 200)
- Copy first 2 job titles from response

**If you DON'T find it:**
- ❌ Jobs may be embedded in HTML
- ❌ OR different API endpoint is used
- ❌ OR Workday changed their architecture

### Step 3: Test the cURL Command

Run the copied cURL command in terminal:
```bash
# Your copied command here
curl 'https://...' -H 'Cookie: ...' --data-raw '...'
```

**Expected if endpoint works with session:**
```json
{
  "total": 123,
  "jobPostings": [
    {"title": "Senior Engineer", "locations": [...]},
    {"title": "Product Manager", "locations": [...]}
  ]
}
```

## Possible Outcomes

### Outcome A: curl command returns jobs (200 OK)
**Conclusion:** We're missing cookies/tokens → Need session management
**Fix:** Implement proper cookie jar + session initialization

### Outcome B: curl command also returns 422
**Conclusion:** Session requires browser fingerprint → Bot protection
**Evidence:** Same endpoint fails even with exact browser headers/cookies

### Outcome C: No such API call exists in Network tab
**Conclusion:** Wrong endpoint assumption → Jobs loaded differently
**Fix:** Find actual data source (embedded JSON, GraphQL, different endpoint)

## Current Evidence Summary

| Test | Result | Conclusion |
|------|--------|------------|
| POST with various payloads | 422 | Rejects all automated requests |
| GET to HTML page | 500 | Blocks before API attempt |
| Puppeteer (stealth) | "Workday unavailable" | Detects automation |
| 12/12 companies | Same pattern | Consistent blocking |

**Hypothesis:** Strong bot protection OR wrong endpoint

**What's missing:** Proof that endpoint works in real browser

## Next Steps

1. **Manual browser test** (see above)
2. **If endpoint works with browser:**
   - Implement session management
   - Add cookie jar
   - Research Workday session initialization
   
3. **If endpoint doesn't exist:**
   - Find actual data source
   - Parse HTML for embedded data
   - OR accept that automated access is not possible

4. **Update classification:**
   - 422 + empty message + works in browser = SESSION_REQUIRED
   - 422 + empty message + fails in browser = WRONG_ENDPOINT
   - 500 + "unavailable" = BOT_DETECTED_WORKDAY
   - 500 + generic error = SERVER_ERROR_UNKNOWN

## Request to User

**Can you please:**
1. Open https://coloplast.wd3.myworkdayjobs.com/en-US/Coloplast in Chrome
2. Open DevTools (F12) → Network tab
3. Find POST request to `/jobs` endpoint (if exists)
4. Copy as cURL and share result

This is the only way to definitively prove whether:
- A) Endpoint exists and we need better session handling
- B) Endpoint doesn't exist and we need different approach
- C) Bot protection blocks even browser requests

Without this, we're just guessing based on error codes.
