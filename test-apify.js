// Test Apify integration
import { testApifyConnection, scrapeWorkdayWithApify } from './lib/apifyConnector.js';

async function testApify() {
  // Get API key from environment or use provided key
  const apiKey = process.env.APIFY_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('❌ No API key provided');
    console.error('Usage: npx tsx test-apify.js YOUR_APIFY_API_KEY');
    console.error('Or set APIFY_API_KEY environment variable');
    process.exit(1);
  }
  
  console.log('🔑 Testing Apify connection...\n');
  
  // Test connection
  const connectionTest = await testApifyConnection(apiKey);
  
  if (!connectionTest.success) {
    console.error('❌ Connection failed:', connectionTest.error);
    process.exit(1);
  }
  
  console.log('✅ Connection successful!');
  console.log('User:', connectionTest.user.username);
  console.log('Email:', connectionTest.user.email);
  console.log('Plan:', connectionTest.user.plan);
  
  console.log('\n📋 Testing Workday scraping...\n');
  
  // Test on a small company first (Grundfos)
  const testUrl = 'https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers';
  const jobs = await scrapeWorkdayWithApify(testUrl, 'Grundfos', { apiKey });
  
  if (jobs.length > 0) {
    console.log(`\n✅ SUCCESS! Found ${jobs.length} jobs`);
    console.log('\nFirst 3 jobs:');
    jobs.slice(0, 3).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title}`);
      console.log(`   Location: ${job.location || 'N/A'}`);
      console.log(`   URL: ${job.url || 'N/A'}`);
    });
  } else {
    console.log('⚠️  No jobs found - may need custom actor or different approach');
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Jobs found: ${jobs.length}`);
  console.log(`- Company: Grundfos`);
  console.log(`- URL: ${testUrl}`);
}

testApify().catch(console.error);
