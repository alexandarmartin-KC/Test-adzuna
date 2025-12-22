#!/usr/bin/env node
// Workday Jobs Ingestion Script via Apify
// Usage: npx tsx scripts/ingest-workday-apify.ts [company-id]

import { runActorAndFetchResults } from '../lib/integrations/apifyWorkday';
import { getCompanyMapping, WORKDAY_COMPANY_MAPPINGS } from '../lib/integrations/companyMappings';
import { normalizeWorkdayJob, validateNormalizedJob } from '../lib/integrations/jobNormalization';
import { upsertJobs, markMissingJobsInactive, queryJobs, getJobStats } from '../lib/integrations/jobDatabase';

interface IngestionMetrics {
  companyId: string;
  companyName: string;
  runId?: string;
  datasetId?: string;
  itemsFetched: number;
  itemsNormalized: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsFailed: number;
  itemsInvalidated: number;
  dkCount: number;
  byCountry: Record<string, number>;
  durationMs: number;
  errors: string[];
}

async function ingestCompany(companyId: string): Promise<IngestionMetrics> {
  const startTime = Date.now();
  const metrics: IngestionMetrics = {
    companyId,
    companyName: '',
    itemsFetched: 0,
    itemsNormalized: 0,
    itemsInserted: 0,
    itemsUpdated: 0,
    itemsUnchanged: 0,
    itemsFailed: 0,
    itemsInvalidated: 0,
    dkCount: 0,
    byCountry: {},
    durationMs: 0,
    errors: [],
  };
  
  try {
    // Get company mapping
    const mapping = getCompanyMapping(companyId);
    if (!mapping) {
      throw new Error(`Company mapping not found for: ${companyId}`);
    }
    
    metrics.companyName = mapping.name;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Ingesting jobs for: ${mapping.name} (${companyId})`);
    console.log(`Workday URL: ${mapping.workdayUrl}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Build actor input
    const input = {
      start_url: mapping.workdayUrl,
      max_items: 1000,
      proxy_configuration: {
        useApifyProxy: true,
      },
      keyword_filter: '',
      location_filter: '',
    };
    
    console.log('[1/5] Running Apify actor...');
    const items = await runActorAndFetchResults(input, { maxItems: 1000, timeoutMs: 1200000 });
    metrics.itemsFetched = items.length;
    
    console.log(`[2/5] Fetched ${items.length} jobs from Apify`);
    
    // Normalize jobs
    console.log('[3/5] Normalizing jobs...');
    const normalizedJobs = [];
    
    for (const item of items) {
      try {
        const normalized = normalizeWorkdayJob(item, companyId, mapping.name);
        
        if (validateNormalizedJob(normalized)) {
          normalizedJobs.push(normalized);
          metrics.itemsNormalized++;
          
          // Count by country
          normalized.countries.forEach(country => {
            metrics.byCountry[country] = (metrics.byCountry[country] || 0) + 1;
          });
          
          // Count DK jobs
          if (normalized.countries.includes('DK')) {
            metrics.dkCount++;
          }
        } else {
          console.warn(`Invalid job skipped: ${item.title || 'unknown'}`);
          metrics.itemsFailed++;
        }
      } catch (error) {
        console.error(`Failed to normalize job:`, error);
        metrics.itemsFailed++;
        metrics.errors.push(error.message);
      }
    }
    
    console.log(`Normalized ${normalizedJobs.length} valid jobs`);
    
    // Upsert to database
    console.log('[4/5] Upserting to database...');
    const upsertResult = await upsertJobs(normalizedJobs);
    metrics.itemsInserted = upsertResult.inserted;
    metrics.itemsUpdated = upsertResult.updated;
    metrics.itemsUnchanged = upsertResult.unchanged;
    metrics.itemsFailed += upsertResult.failed;
    
    console.log(`  Inserted: ${upsertResult.inserted}`);
    console.log(`  Updated: ${upsertResult.updated}`);
    console.log(`  Unchanged: ${upsertResult.unchanged}`);
    console.log(`  Failed: ${upsertResult.failed}`);
    
    // Mark missing jobs as inactive
    console.log('[5/5] Marking missing jobs inactive...');
    const currentJobIds = normalizedJobs.map(j => j.canonical_job_id);
    const inactivated = await markMissingJobsInactive(companyId, currentJobIds);
    metrics.itemsInvalidated = inactivated;
    console.log(`  Marked ${inactivated} jobs as inactive`);
    
  } catch (error) {
    console.error(`\n❌ Ingestion failed:`, error);
    metrics.errors.push(error.message);
    throw error;
  } finally {
    metrics.durationMs = Date.now() - startTime;
  }
  
  return metrics;
}

async function printStats(companyId?: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('DATABASE STATISTICS');
  console.log(`${'='.repeat(60)}\n`);
  
  const stats = await getJobStats(companyId);
  
  console.log(`Total jobs: ${stats.total}`);
  console.log(`Active jobs: ${stats.active}`);
  
  console.log('\nBy country:');
  Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`  ${country}: ${count}`);
    });
  
  console.log('\nBy company:');
  Object.entries(stats.byCompany)
    .sort((a, b) => b[1] - a[1])
    .forEach(([company, count]) => {
      console.log(`  ${company}: ${count}`);
    });
  
  // Check LEGO + DK specifically
  if (!companyId || companyId === 'lego') {
    const legoDkJobs = await queryJobs({ companyId: 'lego', country: 'DK', isActive: true });
    console.log(`\n🎯 LEGO + DK active jobs: ${legoDkJobs.length}`);
    
    if (legoDkJobs.length === 0) {
      console.warn('⚠️  WARNING: LEGO+DK count is 0!');
    }
  }
}

async function main() {
  const companyArg = process.argv[2];
  
  if (companyArg && companyArg !== 'all') {
    // Ingest single company
    const metrics = await ingestCompany(companyArg);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('INGESTION METRICS');
    console.log(`${'='.repeat(60)}\n`);
    console.log(JSON.stringify(metrics, null, 2));
    
    await printStats(companyArg);
    
    // Fail if DK count is 0 for critical companies
    if (companyArg === 'lego' && metrics.dkCount === 0) {
      console.error('\n❌ CRITICAL: LEGO+DK count is 0 - failing ingestion');
      process.exit(1);
    }
    
  } else {
    // Ingest all companies
    console.log('Ingesting all Workday companies...\n');
    
    const allMetrics: IngestionMetrics[] = [];
    
    for (const mapping of WORKDAY_COMPANY_MAPPINGS) {
      try {
        const metrics = await ingestCompany(mapping.id);
        allMetrics.push(metrics);
      } catch (error) {
        console.error(`Failed to ingest ${mapping.id}:`, error);
        allMetrics.push({
          companyId: mapping.id,
          companyName: mapping.name,
          itemsFetched: 0,
          itemsNormalized: 0,
          itemsInserted: 0,
          itemsUpdated: 0,
          itemsUnchanged: 0,
          itemsFailed: 0,
          itemsInvalidated: 0,
          dkCount: 0,
          byCountry: {},
          durationMs: 0,
          errors: [error.message],
        });
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('ALL COMPANIES METRICS');
    console.log(`${'='.repeat(60)}\n`);
    console.log(JSON.stringify(allMetrics, null, 2));
    
    await printStats();
  }
  
  console.log('\n✅ Ingestion complete!');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
