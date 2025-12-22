#!/usr/bin/env node
// Test different Workday actors
// Usage: npx tsx scripts/test-workday-actors.ts

async function testActor(actorId: string, input: any) {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${actorId}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Check if actor exists
    const checkResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}?token=${token}`);
    if (!checkResponse.ok) {
      console.log(`❌ Actor not accessible (${checkResponse.status})`);
      return false;
    }
    
    const actorData = await checkResponse.json();
    console.log(`✓ Actor found: ${actorData.data.name || actorData.data.title}`);
    
    // Start run
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.log(`❌ Failed to start: ${runResponse.status}`);
      return false;
    }
    
    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`✓ Run started: ${runId}`);
    console.log('Waiting 60s...');
    
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Check status
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const statusData = await statusResponse.json();
    const status = statusData.data.status;
    
    console.log(`Status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      const datasetId = statusData.data.defaultDatasetId;
      const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json&limit=10`);
      const items = await itemsResponse.json();
      
      console.log(`✅ SUCCESS! Got ${items.length} jobs`);
      
      if (items.length > 0) {
        const sample = items[0];
        console.log(`Sample: ${JSON.stringify(sample, null, 2).substring(0, 500)}...`);
        
        // Check for LEGO
        const hasLego = items.some((item: any) => 
          JSON.stringify(item).toLowerCase().includes('lego')
        );
        
        console.log(hasLego ? '🎯 Contains LEGO jobs!' : '⚠️  No LEGO jobs in results');
        
        return true;
      }
    } else if (status === 'RUNNING') {
      console.log('⏳ Still running (may succeed later)');
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Workday actors...\n');
  
  const actors = [
    {
      id: 'jupri~workday',
      input: {
        startUrls: [{ url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers' }],
        maxCrawlPages: 5,
      },
    },
    {
      id: 'shahidirfan~Workday-Job-Scraper',
      input: {
        startUrls: [{ url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers' }],
        maxItems: 10,
      },
    },
    {
      id: 'pulse_automation~workday-job-scraper-fast-edition',
      input: {
        url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers',
        maxJobs: 10,
      },
    },
  ];
  
  for (const actor of actors) {
    const success = await testActor(actor.id, actor.input);
    if (success) {
      console.log(`\n✅ Found working actor: ${actor.id}`);
      break;
    }
  }
}

main();
