# Browser Network Capture Instructions

For at bevise om dette er bot protection eller forkert endpoint format, skal vi capture en WORKING browser request.

## Steps to Capture

1. **Open browser** (Chrome/Firefox)
2. **Open DevTools** (F12)
3. **Go to Network tab**
4. **Visit:** https://coloplast.wd3.myworkdayjobs.com/en-US/Coloplast
5. **Wait for jobs to load**
6. **Find POST request to:** `/wday/cxs/coloplast/Coloplast/jobs`
7. **Right-click → Copy → Copy as cURL**
8. **Save the:**
   - Full URL
   - Request method (POST)
   - All headers
   - Request payload
   - Response status (should be 200)
   - Response body (first 2 job titles)

## What We're Looking For

**If endpoint works in browser:**
```bash
curl 'https://coloplast.wd3.myworkdayjobs.com/wday/cxs/coloplast/Coloplast/jobs' \
  -H 'Cookie: PLAY_SESSION=...; wd-browser-id=...' \
  -H 'some-token-header: ...' \
  --data-raw '{"limit":20,"offset":0,"searchText":"","appliedFacets":{}}' 

# Response: 200 OK
{
  "total": 123,
  "jobPostings": [
    {"title": "Senior Engineer"},
    {"title": "Product Manager"}
  ]
}
```

**Then we know:** We're missing cookies/tokens → implement session management

**If endpoint returns 422 even in browser:**
Then Workday changed their API structure and we need different endpoint.
