import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { getCompanyStatus, WORKDAY_FALLBACK_REGISTRY } from "@/lib/workdayFallback";

export const dynamic = 'force-dynamic';

/**
 * GET /api/companies/status
 * Shows which companies are available vs blocked
 */
export async function GET() {
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
  
  return NextResponse.json({
    stats: {
      total,
      available,
      blocked,
      needsOnboarding,
      coveragePercentage: Math.round((available / total) * 100)
    },
    companies: companiesStatus
  });
}
