// Test Apify Content Crawler (simplere approach)
import { scrapeWorkdayWithContentCrawler } from './lib/apifyConnector.js';

async function test() {
  const apiKey = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  
  if (!apiKey) {
    console.error('Error: APIFY_TOKEN environment variable not set');
    process.exit(1);
  }
  
  console.log('Testing Website Content Crawler on Grundfos...\n');
  
  const jobs = await scrapeWorkdayWithContentCrawler(
    'https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers',
    'Grundfos',
    apiKey
  );
  
  console.log(`\nResult: ${jobs.length} jobs found`);
  
  if (jobs.length > 0) {
    console.log('\nFirst 5 jobs:');
    jobs.slice(0, 5).forEach((job, i) => {
      console.log(`${i + 1}. ${job.title}`);
      console.log(`   ${job.location}`);
    });
  }
}

test().catch(console.error);
