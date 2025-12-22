// ============================================================
// WORKDAY COVERAGE HARNESS
// Test and measure Workday connector success rate
// ============================================================

import { scrapeWorkdayCompany, discoverWorkdaySource } from './workdayConnector.js';

export type WorkdayStatus = 'OK' | 'PARTIAL' | 'BLOCKED' | 'MISCONFIG';

export interface WorkdayTestResult {
  company: string;
  url: string;
  status: WorkdayStatus;
  jobCount: number;
  countriesFound: string[];
  dkJobCount: number;
  errorType?: string;
  errorMessage?: string;
  responseTime: number;
  discoverySuccess: boolean;
  apiAccessible: boolean;
  locationQuality: 'GOOD' | 'POOR' | 'NONE';
}

export interface CoverageReport {
  totalTested: number;
  okCount: number;
  partialCount: number;
  blockedCount: number;
  misconfigCount: number;
  avgJobsPerCompany: number;
  avgResponseTime: number;
  results: WorkdayTestResult[];
}

// ============================================================
// TEST DATASET: Known Workday sites
// ============================================================

export const WORKDAY_TEST_SITES = [
  // Tier 1: Enterprise (expected to be blocked)
  { company: "LEGO", url: "https://lego.wd3.myworkdayjobs.com/LEGO_Careers", tier: "enterprise" },
  { company: "Vestas", url: "https://vestas.wd3.myworkdayjobs.com/Vestas", tier: "enterprise" },
  { company: "Danske Bank", url: "https://danskebank.wd3.myworkdayjobs.com/Danske_Bank_Careers", tier: "enterprise" },
  { company: "Coloplast", url: "https://coloplast.wd3.myworkdayjobs.com/Coloplast", tier: "enterprise" },
  { company: "IKEA", url: "https://IKEA.wd3.myworkdayjobs.com/INGKA_Careers", tier: "enterprise" },
  { company: "Ericsson", url: "https://ericsson.wd3.myworkdayjobs.com/Ericsson_Careers", tier: "enterprise" },
  { company: "Volvo", url: "https://volvo.wd5.myworkdayjobs.com/careers", tier: "enterprise" },
  { company: "SAS", url: "https://sasgroup.wd3.myworkdayjobs.com/SAS_Careers", tier: "enterprise" },
  { company: "DNB", url: "https://dnb.wd3.myworkdayjobs.com/DNB", tier: "enterprise" },
  
  // Tier 2: Mid-size (might work)
  { company: "Rockwool", url: "https://rockwool.wd3.myworkdayjobs.com/Rockwool_Careers", tier: "midsize" },
  { company: "Grundfos", url: "https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers", tier: "midsize" },
  { company: "Chr. Hansen", url: "https://chr-hansen.wd3.myworkdayjobs.com/chr-hansen", tier: "midsize" },
  
  // Tier 3: Smaller companies (best chance)
  { company: "Example Corp", url: "https://example.myworkdayjobs.com/Example", tier: "small" },
];

// ============================================================
// COVERAGE TESTER
// ============================================================

export async function testWorkdayCoverage(
  sites = WORKDAY_TEST_SITES,
  options = { timeout: 30000, includeEnterprise: true }
): Promise<CoverageReport> {
  console.log(`\n========== WORKDAY COVERAGE TEST ==========`);
  console.log(`Testing ${sites.length} Workday sites...`);
  
  const results: WorkdayTestResult[] = [];
  
  for (const site of sites) {
    // Skip enterprise if not included
    if (!options.includeEnterprise && site.tier === 'enterprise') {
      continue;
    }
    
    console.log(`\n[Test] ${site.company}...`);
    const result = await testSingleWorkdaySite(site.company, site.url, options.timeout);
    results.push(result);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate report
  const report = generateCoverageReport(results);
  printCoverageReport(report);
  
  return report;
}

async function testSingleWorkdaySite(
  company: string,
  url: string,
  timeout: number
): Promise<WorkdayTestResult> {
  const startTime = Date.now();
  const result: WorkdayTestResult = {
    company,
    url,
    status: 'MISCONFIG',
    jobCount: 0,
    countriesFound: [],
    dkJobCount: 0,
    responseTime: 0,
    discoverySuccess: false,
    apiAccessible: false,
    locationQuality: 'NONE'
  };
  
  try {
    // Step 1: Test discovery
    console.log(`  [Discovery]...`);
    const source = await discoverWorkdaySource(url);
    
    if (!source) {
      result.status = 'MISCONFIG';
      result.errorType = 'DISCOVERY_FAILED';
      result.errorMessage = 'Could not discover Workday source';
      result.responseTime = Date.now() - startTime;
      return result;
    }
    
    result.discoverySuccess = true;
    
    // Step 2: Test API access by fetching jobs
    console.log(`  [Fetching jobs]...`);
    const jobs = await scrapeWorkdayCompany(url, company);
    
    result.jobCount = jobs.length;
    result.responseTime = Date.now() - startTime;
    
    if (jobs.length === 0) {
      result.status = 'BLOCKED';
      result.errorType = 'NO_JOBS_RETURNED';
      result.apiAccessible = false;
    } else {
      result.apiAccessible = true;
      
      // Analyze job quality
      const countriesSet = new Set<string>();
      let dkJobs = 0;
      let jobsWithLocations = 0;
      
      for (const job of jobs) {
        if (job.countries && job.countries.length > 0) {
          jobsWithLocations++;
          job.countries.forEach(c => countriesSet.add(c));
          if (job.countries.includes('DK')) {
            dkJobs++;
          }
        }
      }
      
      result.countriesFound = Array.from(countriesSet);
      result.dkJobCount = dkJobs;
      
      // Determine location quality
      const locationCoverage = jobsWithLocations / jobs.length;
      if (locationCoverage > 0.9) {
        result.locationQuality = 'GOOD';
      } else if (locationCoverage > 0.5) {
        result.locationQuality = 'POOR';
      } else {
        result.locationQuality = 'NONE';
      }
      
      // Determine overall status
      if (jobs.length >= 10 && result.locationQuality === 'GOOD') {
        result.status = 'OK';
      } else if (jobs.length >= 5 && result.locationQuality !== 'NONE') {
        result.status = 'PARTIAL';
      } else {
        result.status = 'PARTIAL';
      }
    }
    
    console.log(`  ✅ ${result.status}: ${result.jobCount} jobs, ${result.dkJobCount} DK, ${result.locationQuality} location quality`);
    
  } catch (error) {
    result.status = 'BLOCKED';
    result.errorType = 'EXCEPTION';
    result.errorMessage = error instanceof Error ? error.message : String(error);
    result.responseTime = Date.now() - startTime;
    console.log(`  ❌ ${result.errorType}: ${result.errorMessage}`);
  }
  
  return result;
}

// ============================================================
// REPORTING
// ============================================================

function generateCoverageReport(results: WorkdayTestResult[]): CoverageReport {
  const okCount = results.filter(r => r.status === 'OK').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  const blockedCount = results.filter(r => r.status === 'BLOCKED').length;
  const misconfigCount = results.filter(r => r.status === 'MISCONFIG').length;
  
  const totalJobs = results.reduce((sum, r) => sum + r.jobCount, 0);
  const avgJobsPerCompany = results.length > 0 ? totalJobs / results.length : 0;
  
  const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
  const avgResponseTime = results.length > 0 ? totalResponseTime / results.length : 0;
  
  return {
    totalTested: results.length,
    okCount,
    partialCount,
    blockedCount,
    misconfigCount,
    avgJobsPerCompany,
    avgResponseTime,
    results
  };
}

function printCoverageReport(report: CoverageReport) {
  console.log(`\n========== COVERAGE REPORT ==========`);
  console.log(`Total tested: ${report.totalTested}`);
  console.log(`\nStatus breakdown:`);
  console.log(`  ✅ OK:        ${report.okCount} (${(report.okCount / report.totalTested * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  PARTIAL:  ${report.partialCount} (${(report.partialCount / report.totalTested * 100).toFixed(1)}%)`);
  console.log(`  ❌ BLOCKED:   ${report.blockedCount} (${(report.blockedCount / report.totalTested * 100).toFixed(1)}%)`);
  console.log(`  🔧 MISCONFIG: ${report.misconfigCount} (${(report.misconfigCount / report.totalTested * 100).toFixed(1)}%)`);
  
  console.log(`\nMetrics:`);
  console.log(`  Avg jobs per company: ${report.avgJobsPerCompany.toFixed(1)}`);
  console.log(`  Avg response time: ${(report.avgResponseTime / 1000).toFixed(1)}s`);
  
  console.log(`\nDetailed results:`);
  console.log(`\nCompany                | Status    | Jobs | DK  | Quality | Error`);
  console.log(`-----------------------|-----------|------|-----|---------|------------------`);
  
  for (const result of report.results) {
    const statusEmoji = {
      'OK': '✅',
      'PARTIAL': '⚠️ ',
      'BLOCKED': '❌',
      'MISCONFIG': '🔧'
    }[result.status];
    
    const companyPad = result.company.padEnd(22);
    const statusPad = result.status.padEnd(9);
    const jobsPad = String(result.jobCount).padStart(4);
    const dkPad = String(result.dkJobCount).padStart(3);
    const qualityPad = result.locationQuality.padEnd(7);
    const error = result.errorType || '-';
    
    console.log(`${companyPad} | ${statusEmoji} ${statusPad} | ${jobsPad} | ${dkPad} | ${qualityPad} | ${error}`);
  }
  
  console.log(`\n========================================\n`);
}

// ============================================================
// EXPORT FOR CLI USAGE
// ============================================================

export async function runCoverageTest() {
  const report = await testWorkdayCoverage();
  
  // Save to file
  const fs = require('fs');
  const reportPath = '/workspaces/Test-adzuna/workday-coverage-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);
  
  return report;
}
