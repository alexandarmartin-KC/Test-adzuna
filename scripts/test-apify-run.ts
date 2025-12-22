#!/usr/bin/env node
// Test Apify actor execution
// Usage: npx tsx scripts/test-apify-run.ts

async function testActorRun() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  if (!token) {
    console.error('❌ APIFY_TOKEN not found');
    process.exit(1);
  }
  
  console.log('🚀 Starting Apify actor run...\n');
  
  const input = {
    startUrls: [{ url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers' }],
    maxItems: 5, // Very small test
    proxyConfiguration: {
      useApifyProxy: true,
    },
  };
  
  try {
    // Start run
    console.log('[1/4] Starting actor...');
    const actorId = 'fantastic-jobs~workday-jobs-api';
    const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!startResponse.ok) {
      const error = await startResponse.text();
      throw new Error(`Failed to start: ${startResponse.status} - ${error}`);
    }
    
    const startData = await startResponse.json();
    const runId = startData.data.id;
    console.log(`✓ Run started: ${runId}\n`);
    
    // Wait for completion
    console.log('[2/4] Waiting for completion (timeout: 5 minutes)...');
    const startTime = Date.now();
    const timeoutMs = 300000; // 5 minutes
    
    let status;
    while (Date.now() - startTime < timeoutMs) {
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      
      process.stdout.write(`  Status: ${status}\r`);
      
      if (status === 'SUCCEEDED') {
        console.log(`\n✓ Run completed in ${Math.round((Date.now() - startTime) / 1000)}s\n`);
        break;
      }
      
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Run ${status}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3s
    }
    
    if (status !== 'SUCCEEDED') {
      throw new Error('Run timed out');
    }
    
    // Fetch dataset
    console.log('[3/4] Fetching results...');
    const datasetId = startData.data.defaultDatasetId;
    const dataResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json`);
    
    if (!dataResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${dataResponse.status}`);
    }
    
    const items = await dataResponse.json();
    console.log(`✓ Fetched ${items.length} items\n`);
    
    // Analyze results
    console.log('[4/4] Analyzing results...');
    
    if (items.length === 0) {
      console.warn('⚠️  No jobs returned - actor may be blocked or input invalid');
      process.exit(1);
    }
    
    const sample = items[0];
    console.log('\n✅ SUCCESS! Sample job:');
    console.log(`  Title: ${sample.title || sample.jobTitle || 'N/A'}`);
    console.log(`  Location: ${sample.location || sample.locations?.[0] || 'N/A'}`);
    console.log(`  Apply URL: ${sample.applyUrl || sample.url || 'N/A'}`);
    console.log(`\nAll fields in first item:`, Object.keys(sample).join(', '));
    console.log(`\nTotal jobs: ${items.length}`);
    
    // Save sample for inspection
    const fs = require('fs');
    fs.writeFileSync('/tmp/apify-sample.json', JSON.stringify(items[0], null, 2));
    console.log('\n💾 Sample saved to /tmp/apify-sample.json');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testActorRun();
