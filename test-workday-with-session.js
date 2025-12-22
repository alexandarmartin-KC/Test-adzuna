// Test med session cookies først

async function testWithSession() {
  const baseUrl = 'https://coloplast.wd3.myworkdayjobs.com';
  const careersPath = '/en-US/Coloplast';
  const apiPath = '/wday/cxs/coloplast/Coloplast/jobs';
  
  console.log('=== Step 1: Visit careers page to get session ===');
  const careersResponse = await fetch(baseUrl + careersPath, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  });
  
  console.log('Careers page status:', careersResponse.status);
  
  // Extract cookies
  const cookies = careersResponse.headers.getSetCookie();
  console.log('Cookies received:', cookies.length);
  
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie header:', cookieHeader.substring(0, 200) + '...');
  
  console.log('\n=== Step 2: Call API with session cookies ===');
  const apiResponse = await fetch(baseUrl + apiPath, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': baseUrl + careersPath,
      'Origin': baseUrl,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      limit: 5,
      offset: 0,
      searchText: '',
      appliedFacets: {}
    })
  });
  
  console.log('API status:', apiResponse.status);
  const contentType = apiResponse.headers.get('content-type');
  console.log('Content-Type:', contentType);
  
  const responseText = await apiResponse.text();
  
  if (apiResponse.ok) {
    const data = JSON.parse(responseText);
    console.log('\n✅ SUCCESS!');
    console.log('Total jobs:', data.total);
    console.log('Jobs returned:', data.jobPostings?.length);
    if (data.jobPostings && data.jobPostings.length > 0) {
      console.log('First job:', data.jobPostings[0].title);
    }
  } else {
    console.log('\n❌ FAILED');
    console.log('Response:', responseText.substring(0, 500));
  }
}

testWithSession().catch(console.error);
