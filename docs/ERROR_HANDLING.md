# Error Handling & Troubleshooting Guide

## Fixed Issues ✅

### "Failed to execute 'json' on 'Response': Unexpected end of JSON input"

**What was the problem:**
- The frontend was trying to parse JSON before checking if the response was successful
- Empty or error responses would cause JSON parsing to fail

**What was fixed:**
1. ✅ Check `response.ok` BEFORE calling `response.json()`
2. ✅ Wrap JSON parsing in try-catch blocks
3. ✅ Validate that parsed data has expected structure
4. ✅ Provide fallback error messages when JSON parsing fails
5. ✅ Add console logging for debugging

**Implemented in:**
- `/app/cv-analysis/page.tsx` - Frontend error handling
- `/app/api/cv-analysis/route.ts` - Backend CV analysis API
- `/app/api/parse-pdf/route.ts` - Backend PDF parsing API

## Error Handling Features

### Input Validation

**CV Text:**
- ✅ Must be non-empty string
- ✅ Maximum 50,000 characters
- ✅ Clear error message if validation fails

**PDF Upload:**
- ✅ Must be valid PDF file (application/pdf)
- ✅ Maximum 10MB file size
- ✅ Must contain extractable text
- ✅ Helpful messages for scanned PDFs

### API Error Handling

**CV Analysis API (`/api/cv-analysis`):**
```typescript
- Invalid JSON → "Request body must be valid JSON"
- Missing cvText → "cvText is required and must be a non-empty string"
- CV too long → "CV text must be less than 50,000 characters"
- No API key → "AI API key not configured"
- AI service error → Detailed error from OpenAI/Anthropic
```

**PDF Parse API (`/api/parse-pdf`):**
```typescript
- Invalid form data → "Request must be multipart/form-data"
- No file → "File is required"
- Wrong file type → "Only PDF files are supported. Got: [type]"
- File too large → "PDF file must be less than 10MB"
- Empty file → "File appears to be empty"
- No text → "No text content found in PDF" (scanned images)
- Parsing error → "PDF parsing failed: [details]"
```

### Frontend Error Handling

**Network Errors:**
- Connection failures are caught and displayed
- Timeout errors show user-friendly message
- Console logging for debugging

**Response Validation:**
- Checks for successful HTTP status
- Validates response data structure
- Provides specific error messages

## Common Errors & Solutions

### 1. "Request body must be valid JSON"
**Cause:** Malformed request or network interruption  
**Solution:** 
- Check network connection
- Ensure CV text is properly formatted
- Try again - temporary network issue

### 2. "No text content found in PDF"
**Cause:** PDF contains scanned images without OCR  
**Solution:**
- Use a PDF with selectable text
- Run OCR on scanned documents first
- Convert images to text before uploading

### 3. "AI API key not configured"
**Cause:** Missing OpenAI API key in environment  
**Solution:**
- Add `OPENAI_API_KEY` to `.env.local` (local dev)
- Add to Vercel environment variables (production)
- Restart dev server after adding key

### 4. "CV text must be less than 50,000 characters"
**Cause:** CV is too long  
**Solution:**
- Shorten CV to essential information
- Remove unnecessary sections
- Focus on recent/relevant experience

### 5. "PDF file must be less than 10MB"
**Cause:** PDF file is too large  
**Solution:**
- Compress PDF file
- Remove high-resolution images
- Use a different PDF tool to reduce size

### 6. Network timeout or no response
**Cause:** AI service taking too long  
**Solution:**
- Wait 30-60 seconds for analysis
- Try with shorter CV
- Check AI service status (status.openai.com)

## Debugging

### Enable Debug Mode

The application now logs errors to the browser console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages starting with:
   - `CV Analysis error:`
   - `PDF parsing error:`

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for requests to:
   - `/api/cv-analysis`
   - `/api/parse-pdf`
4. Check:
   - Status code (should be 200 for success)
   - Response body (should contain JSON)
   - Request payload (verify data sent correctly)

### API Testing

Test endpoints directly with curl:

**Test CV Analysis:**
```bash
curl -X POST http://localhost:3000/api/cv-analysis \
  -H "Content-Type: application/json" \
  -d '{"cvText": "Test CV content here..."}'
```

**Test PDF Parse:**
```bash
curl -X POST http://localhost:3000/api/parse-pdf \
  -F "file=@your-cv.pdf"
```

## Production Checklist

Before deploying to production:

- [ ] Environment variable `OPENAI_API_KEY` is set
- [ ] Test CV analysis with sample text
- [ ] Test PDF upload with sample PDF
- [ ] Verify error messages are user-friendly
- [ ] Check browser console shows no errors
- [ ] Test with slow network connection
- [ ] Test file size limits (>10MB should fail gracefully)
- [ ] Test with various PDF formats
- [ ] Test with very long CV text

## Monitoring

In production, monitor:
- API response times (should be <30s)
- Error rates by type
- OpenAI API usage and costs
- Failed uploads (file type/size issues)
- User feedback on error messages

## Support

If errors persist:
1. Check GitHub Issues
2. Review console logs
3. Verify environment variables
4. Test with minimal example
5. Check AI service status pages
