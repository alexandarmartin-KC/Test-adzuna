#!/usr/bin/env node
// Test gooyer.co/myworkdayjobs actor
// Usage: npx tsx scripts/test-gooyer-actor.ts

async function testGooyer() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  console.log('🚀 Testing gooyer.co/myworkdayjobs actor...\n');
  
  const input = {
    startUrls: [{ url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers' }],
    maxRequestsPerCrawl: 10,
  };
  
  try {
    const actorId = 'gooyer.co~myworkdayjobs';
    console.log(`[1/4] Starting actor: ${actorId}`);
    
    const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const runId = data.data.id;
    console.log(`✓ Run started: ${runId}\n`);
    
    console.log('[2/4] Waiting for completion (timeout: 3 minutes)...');
    const startTime = Date.now();
    const timeoutMs = 180000;
    
    let status;
    while (Date.now() - startTime < timeoutMs) {
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      
      process.stdout.write(`  Status: ${status}\r`);
      
      if (status === 'SUCCEEDED') {
        console.log(`\n✓ Completed in ${Math.round((Date.now() - startTime) / 1000)}s\n`);
        
        console.log('[3/4] Fetching results...');
        const datasetId = statusData.data.defaultDatasetId;
        const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json`);
        const items = await itemsResponse.json();
        
        console.log(`✓ Fetched ${items.length} items\n`);
        
        if (items.length === 0) {
          console.warn('⚠️  No jobs returned');
          return;
        }
        
        console.log('[4/4] Analyzing results...');
        const sample = items[0];
        console.log('\n✅ Sample job:');
        console.log(`  Title: ${sample.jobTitle || sample.title || 'N/A'}`);
        console.log(`  Company: ${sample.company || sample.organization || 'N/A'}`);
        console.log(`  Location: ${sample.location || sample.locations?.[0] || 'N/A'}`);
        console.log(`  Apply URL: ${sample.applyUrl || sample.url || 'N/A'}`);
        console.log(`\nFields: ${Object.keys(sample).join(', ')}`);
        console.log(`\nTotal jobs: ${items.length}`);
        
        // Check for LEGO
        const legoJobs = items.filter((item: any) => 
          (item.company && item.company.toLowerCase().includes('lego')) ||
          (item.organization && item.organization.toLowerCase().includes('lego')) ||
          (item.url && item.url.includes('lego'))
        );
        
        console.log(`\n${legoJobs.length} jobs from LEGO`);
        
        // Check for Denmark
        const dkJobs = items.filter((item: any) => {
          const location = item.location || item.locations?.[0] || '';
          return location.toLowerCase().includes('denmark') || 
                 location.toLowerCase().includes('danmark') ||
                 location.toLowerCase().includes('copenhagen') ||
                 location.toLowerCase().includes('billund');
        });
        
        console.log(`${dkJobs.length} jobs in Denmark`);
        
        // Save sample
        const fs = require('fs');
        fs.writeFileSync('/tmp/gooyer-sample.json', JSON.stringify(sample, null, 2));
        console.log('\n💾 Sample saved to /tmp/gooyer-sample.json');
        
        break;
      }
      
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Run ${status}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testGooyer();
