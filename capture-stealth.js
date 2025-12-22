// Capture actual browser requests using stealth mode
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function captureWithStealth() {
  console.log('Launching stealth browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Capture API calls
  const apiCalls = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/wday/cxs/') || url.includes('/jobs')) {
      console.log('\n🔍 REQUEST:', request.method(), url.substring(0, 100));
      apiCalls.push({
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
      console.log('\n✅ RESPONSE:', response.status(), url);
      try {
        const body = await response.text();
        console.log('Body preview:', body.substring(0, 500));
        
        if (response.status() === 200) {
          const data = JSON.parse(body);
          console.log('\n🎉 SUCCESS!');
          console.log('Total jobs:', data.total);
          console.log('Jobs in response:', data.jobPostings?.length);
          if (data.jobPostings?.length > 0) {
            console.log('\nFirst 2 titles:');
            data.jobPostings.slice(0, 2).forEach((job, i) => {
              console.log(`  ${i + 1}. ${job.title}`);
            });
          }
          
          // Print exact curl command
          const req = apiCalls.find(r => r.url === url);
          if (req) {
            console.log('\n🔧 WORKING CURL COMMAND:');
            console.log(`curl -X ${req.method} '${req.url}' \\`);
            Object.entries(req.headers).forEach(([k, v]) => {
              if (!k.startsWith(':')) {
                console.log(`  -H '${k}: ${v}' \\`);
              }
            });
            if (req.payload) {
              console.log(`  --data-raw '${req.payload}'`);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing response:', err.message);
      }
    }
  });
  
  try {
    console.log('\n📍 Navigating to Grundfos...');
    await page.goto('https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers', {
      waitUntil: 'networkidle0',
      timeout: 45000
    });
    
    const title = await page.title();
    console.log('\nPage title:', title);
    
    if (title.includes('Error') || title.includes('unavailable')) {
      console.log('❌ Page shows error - Puppeteer detected even with stealth');
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (apiCalls.length === 0) {
      console.log('\n⚠️  No API calls detected to /wday/cxs/.../jobs');
      console.log('Page may use different loading mechanism or jobs embedded in HTML');
    }
    
  } catch (error) {
    console.error('Navigation error:', error.message);
  } finally {
    await browser.close();
  }
}

captureWithStealth().catch(console.error);
