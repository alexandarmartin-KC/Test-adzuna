#!/usr/bin/env node
// Test with different input parameters
// Usage: npx tsx scripts/test-apify-params.ts

async function testParameters() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  console.log('🧪 Testing different input parameters...\n');
  
  const testInputs = [
    {
      name: 'Test 1: startUrls only',
      input: {
        startUrls: [{ url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers' }],
        maxItems: 5,
      },
    },
    {
      name: 'Test 2: domain filter',
      input: {
        domainFilter: 'lego.wd3.myworkdayjobs.com',
        maxItems: 5,
      },
    },
    {
      name: 'Test 3: organization filter',
      input: {
        organizationFilter: 'LEGO',
        maxItems: 5,
      },
    },
    {
      name: 'Test 4: url as string',
      input: {
        url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers',
        maxItems: 5,
      },
    },
  ];
  
  for (const test of testInputs) {
    console.log(`\n${test.name}`);
    console.log(`Input: ${JSON.stringify(test.input, null, 2)}`);
    
    try {
      const actorId = 'fantastic-jobs~workday-jobs-api';
      const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.input),
      });
      
      if (!response.ok) {
        console.log(`❌ Failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const runId = data.data.id;
      console.log(`✓ Started run: ${runId}`);
      
      // Wait 30 seconds
      console.log('Waiting 30s...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check status
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const statusData = await statusResponse.json();
      console.log(`Status: ${statusData.data.status}`);
      
      if (statusData.data.status === 'SUCCEEDED') {
        const datasetId = statusData.data.defaultDatasetId;
        const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json&limit=5`);
        const items = await itemsResponse.json();
        
        console.log(`Items: ${items.length}`);
        if (items.length > 0) {
          const orgs = items.map((item: any) => item.organization).filter(Boolean);
          const domains = items.map((item: any) => item.source_domain).filter(Boolean);
          console.log(`Organizations: ${[...new Set(orgs)].join(', ')}`);
          console.log(`Domains: ${[...new Set(domains)].join(', ')}`);
          
          const hasLego = orgs.some((org: string) => org.toLowerCase().includes('lego'));
          console.log(hasLego ? '✅ LEGO jobs found!' : '❌ No LEGO jobs');
        }
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
}

testParameters();
