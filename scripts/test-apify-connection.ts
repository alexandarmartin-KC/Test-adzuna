#!/usr/bin/env node
// Test Apify API connection
// Usage: npx tsx scripts/test-apify-connection.ts

async function testConnection() {
  const token = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  if (!token) {
    console.error('❌ APIFY_TOKEN not found in environment');
    process.exit(1);
  }
  
  console.log('✓ Token found:', token.substring(0, 20) + '...');
  
  // Test API access
  try {
    console.log('\n[TEST] Checking Apify API access...');
    const response = await fetch(`https://api.apify.com/v2/acts/fantastic-jobs~workday-jobs-api?token=${token}`);
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('✓ Actor found:', data.data.name);
    console.log('✓ Version:', data.data.taggedBuilds?.latest || 'latest');
    console.log('\n✅ Connection successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
