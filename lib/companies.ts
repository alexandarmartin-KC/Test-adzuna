// ============================================================
// SHARED COMPANY CONFIGURATION
// Add your companies here - they'll appear in both API and UI!
// ============================================================

export interface CompanyConfig {
  name: string;
  careersUrl: string;
  country?: string;
}

// ============================================================
// ADD YOUR COMPANIES HERE - just name and careers URL!
// Priority order: Fast scrapers first to avoid timeouts
// ============================================================
export const COMPANIES: CompanyConfig[] = [
  // Fast scrapers (APIs, no pagination) - crawl first
  { name: "CoreWeave Europe", careersUrl: "https://boards.greenhouse.io/coreweaveu" },  // Greenhouse API (EU jobs) - FAST
  { name: "CoreWeave", careersUrl: "https://boards.greenhouse.io/coreweave" },  // Greenhouse API (US jobs) - FAST
  { name: "Matas", careersUrl: "matas.dk", country: "DK" },  // Emply API - FAST
  { name: "Arla", careersUrl: "https://jobs.arla.com/", country: "DK" },  // Lever API - FAST
  
  // Medium speed scrapers
  { name: "Novo Nordisk", careersUrl: "https://careers.novonordisk.com/search/?q=&locationsearch=denmark", country: "DK" },  // SuccessFactors with pagination
  { name: "Carlsberg", careersUrl: "https://careers.carlsberg.com/CarlsbergDK/search/?q=&locale=en_GB", country: "DK" },  // SuccessFactors with pagination
  
  // Slow/complex scrapers - may timeout on Hobby plan
  { name: "LEGO", careersUrl: "https://lego.wd3.myworkdayjobs.com/LEGO_Careers", country: "DK" },  // Workday - SLOW/BLOCKED
  { name: "Ørsted", careersUrl: "https://orsted.com/en/careers/vacancies-list" },  // Unknown platform - SLOW
  
  // Add more: { name: "Company", careersUrl: "https://..." or just "domain.com" },
];

// Helper to get company names for UI dropdowns
export function getCompanyNames(): string[] {
  return COMPANIES.map(c => c.name).sort();
}
