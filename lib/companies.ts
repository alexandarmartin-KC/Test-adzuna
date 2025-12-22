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
// ============================================================
export const COMPANIES: CompanyConfig[] = [
  { name: "Ørsted", careersUrl: "https://orsted.com/en/careers/vacancies-list" },
  { name: "Novo Nordisk", careersUrl: "https://careers.novonordisk.com/search/?q=&locationsearch=denmark", country: "DK" },
  { name: "Matas", careersUrl: "matas.dk", country: "DK" },  // Auto-discovers Emply!
  { name: "Carlsberg", careersUrl: "https://careers.carlsberg.com/CarlsbergDK/search/?q=&locale=en_GB", country: "DK" },  // SuccessFactors with pagination
  { name: "Arla", careersUrl: "https://jobs.arla.com/", country: "DK" },  // Lever platform
  { name: "LEGO", careersUrl: "https://lego.wd3.myworkdayjobs.com/LEGO_Careers", country: "DK" },  // Workday JSON API
  // Add more: { name: "Company", careersUrl: "https://..." or just "domain.com" },
];

// Helper to get company names for UI dropdowns
export function getCompanyNames(): string[] {
  return COMPANIES.map(c => c.name).sort();
}
