// Capture actual browser Network requests to Workday API
import puppeteer from 'puppeteer';

async function captureWorkdayRequest() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  
  // Capture all network requests
  const apiRequests = [];
  const apiResponses = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/wday/cxs/') && url.includes('/jobs')) {
      console.log('\n🔍 API REQUEST CAPTURED:');
      console.log('URL:', url);
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(request.headers(), null, 2));
      
      if (request.postData()) {
        console.log('Payload:', request.postData());
      }
      
      apiRequests.push({
        url,
        method: request.method(),
        headers: request.headers(),
        payload: request.postData()
      });
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/wday/cxs/') && url.includes('/jobs')) {
      console.log('\n✅ API RESPONSE CAPTURED:');
      console.log('URL:', url);
      console.log('Status:', response.status());
      console.log('Status Text:', response.statusText());
      console.log('Headers:', JSON.stringify(response.headers(), null, 2));
      
      try {
        const responseBody = await response.text();
        console.log('Body (first 1000 chars):', responseBody.substring(0, 1000));
        
        if (response.status() === 200) {
          const data = JSON.parse(responseBody);
          console.log('\n🎉 SUCCESS! Jobs returned:', data.jobPostings?.length || 0);
          console.log('Total jobs:', data.total);
          if (data.jobPostings && data.jobPostings.length > 0) {
            console.log('\nFirst 2 job titles:');
            data.jobPostings.slice(0, 2).forEach((job, i) => {
              console.log(`  ${i + 1}. ${job.title}`);
            });
          }
        }
        
        apiResponses.push({
          url,
          status: response.status(),
          headers: response.headers(),
          body: responseBody.substring(0, 2000)
        });
      } catch (error) {
        console.error('Error reading response:', error.message);
      }
    }
  });
  
  try {
    console.log('\n📍 Navigating to Grundfos careers page...');
    await page.goto('https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded');
    
    // Wait a bit more for any async API calls
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/workday-browser.png' });
    console.log('📸 Screenshot saved to /tmp/workday-browser.png');
    
    // Get page title and content
    const title = await page.title();
    console.log('\nPage title:', title);
    
    // Check if any API calls were made
    if (apiRequests.length === 0) {
      console.log('\n⚠️  NO API CALLS TO /wday/cxs/.../jobs DETECTED');
      console.log('This suggests:');
      console.log('  1. Jobs are loaded differently (not via this API)');
      console.log('  2. OR page structure changed');
      console.log('  3. OR jobs are embedded in initial HTML');
    } else {
      console.log(`\n✅ Captured ${apiRequests.length} API request(s)`);
      console.log(`✅ Captured ${apiResponses.length} API response(s)`);
      
      // Generate curl command
      if (apiRequests.length > 0) {
        const req = apiRequests[0];
        console.log('\n🔧 CURL COMMAND TO REPRODUCE:');
        console.log('curl -X POST \\');
        console.log(`  '${req.url}' \\`);
        Object.entries(req.headers).forEach(([key, value]) => {
          console.log(`  -H '${key}: ${value}' \\`);
        });
        if (req.payload) {
          console.log(`  --data-raw '${req.payload}'`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error navigating:', error.message);
  } finally {
    await browser.close();
  }
  
  return { requests: apiRequests, responses: apiResponses };
}

captureWorkdayRequest().catch(console.error);
