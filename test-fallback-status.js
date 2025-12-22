// Simple test of fallback system
import { getCompanyStatus, WORKDAY_FALLBACK_REGISTRY } from './lib/workdayFallback.js';
import { COMPANIES } from './lib/companies.js';

console.log('\n========== COMPANY STATUS REPORT ==========\n');

const companiesStatus = COMPANIES.map(company => {
  const companyId = company.name.toLowerCase().replace(/\s+/g, '-');
  const fallback = WORKDAY_FALLBACK_REGISTRY[companyId];
  const status = getCompanyStatus(companyId);
  
  return {
    name: company.name,
    careersUrl: company.careersUrl,
    available: status.available,
    status: status.status,
    message: status.message,
    fallbackType: fallback?.fallbackType || null,
    requiresOnboarding: !status.available && fallback?.fallbackType === 'BLOCKED'
  };
});

// Calculate stats
const total = companiesStatus.length;
const available = companiesStatus.filter(c => c.available).length;
const blocked = companiesStatus.filter(c => !c.available).length;
const needsOnboarding = companiesStatus.filter(c => c.requiresOnboarding).length;

console.log(`Total companies: ${total}`);
console.log(`✅ Available: ${available} (${Math.round((available / total) * 100)}%)`);
console.log(`❌ Blocked: ${blocked} (${Math.round((blocked / total) * 100)}%)`);
console.log(`🔧 Needs onboarding: ${needsOnboarding}`);

console.log('\n========== DETAILED STATUS ==========\n');

companiesStatus.forEach(company => {
  const icon = company.available ? '✅' : '❌';
  console.log(`${icon} ${company.name}`);
  console.log(`   Status: ${company.status}`);
  console.log(`   Message: ${company.message}`);
  if (company.fallbackType) {
    console.log(`   Fallback: ${company.fallbackType}`);
  }
  console.log('');
});

console.log('========================================\n');
