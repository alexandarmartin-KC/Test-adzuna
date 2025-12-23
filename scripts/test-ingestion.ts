#!/usr/bin/env node
// Quick smoke test for Workday ingestion
// Usage: npx tsx scripts/test-ingestion.ts

import { clearAllJobs, queryJobs, getJobStats, upsertJobs } from '../lib/integrations/jobDatabase';
import { runActorAndFetchResults } from '../lib/integrations/apifyWorkday';
import { normalizeWorkdayJob } from '../lib/integrations/jobNormalization';

async function smokeTest() {
  console.log('🧪 Running Workday ingestion smoke test...\n');
  
  // Clear database
  await clearAllJobs();
  console.log('✓ Database cleared');
  
  // Test LEGO ingestion
  console.log('\n[TEST] Ingesting LEGO jobs...');
  
  const input = {
     start_url: 'https://lego.wd3.myworkdayjobs.com/LEGO_Careers',
     max_items: 10, // Small test batch
     proxy_configuration: {
      useApifyProxy: true,
    },
  };
  
  try {
    const items = await runActorAndFetchResults(input, { maxItems: 10, timeoutMs: 300000 });
    console.log(`✓ Fetched ${items.length} jobs from Apify`);
    
    if (items.length === 0) {
      console.warn('⚠️  No jobs returned - this may indicate API issues or bot detection');
      return;
    }
    
    // Normalize
    const normalized = items.map(item => normalizeWorkdayJob(item, 'lego', 'LEGO'));
    console.log(`✓ Normalized ${normalized.length} jobs`);
    
    // Upsert
    const result = await upsertJobs(normalized);
    console.log(`✓ Upserted: ${result.inserted} inserted, ${result.updated} updated`);
    
    // Query LEGO + DK
    const legoDkJobs = await queryJobs({ companyId: 'lego', country: 'DK' });
    console.log(`\n✅ LEGO + DK jobs: ${legoDkJobs.length}`);
    
    if (legoDkJobs.length > 0) {
      console.log('\nSample job:');
      const sample = legoDkJobs[0];
      console.log(`  Title: ${sample.title}`);
      console.log(`  Locations: ${sample.locations.join(', ')}`);
      console.log(`  Countries: ${sample.countries.join(', ')}`);
      console.log(`  Apply URL: ${sample.apply_url}`);
    }
    
    // Stats
    const stats = await getJobStats('lego');
    console.log('\nStatistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  By country:`, stats.byCountry);
    
    // Assertions
    console.log('\n[ASSERTIONS]');
    
    if (legoDkJobs.length === 0) {
      throw new Error('❌ FAILED: LEGO+DK count is 0');
    }
    console.log('✓ LEGO+DK count > 0');
    
    if (!legoDkJobs[0].canonical_job_id) {
      throw new Error('❌ FAILED: Missing canonical_job_id');
    }
    console.log('✓ Jobs have canonical_job_id');
    
    if (!legoDkJobs[0].countries.includes('DK')) {
      throw new Error('❌ FAILED: DK not in countries array');
    }
    console.log('✓ Jobs have DK in countries array');
    
    console.log('\n✅ All assertions passed!');
    
  } catch (error) {
    console.error('\n❌ Smoke test failed:', error);
    throw error;
  }
}

smokeTest().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
