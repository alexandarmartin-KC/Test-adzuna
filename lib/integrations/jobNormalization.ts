// Job normalization and country detection
import crypto from 'crypto';
import type { ApifyDatasetItem } from './apifyWorkday';

export interface NormalizedJob {
  canonical_job_id: string;
  source: string;
  external_id: string;
  company_name: string;
  company_id: string;
  title: string;
  apply_url: string;
  source_url: string;
  locations: string[];
  locations_raw: string[];
  countries: string[];
  primary_country: string;
  posted_at?: string;
  updated_at?: string;
  description_text?: string;
  description_html?: string;
  raw_data: any;
}

const COUNTRY_PATTERNS: Record<string, RegExp[]> = {
  'DK': [
    /denmark/i,
    /danmark/i,
    /danish/i,
    /copenhagen|københavn/i,
    /aarhus|århus/i,
    /odense/i,
    /aalborg/i,
    /esbjerg/i,
    /randers/i,
    /billund/i,
  ],
  'SE': [
    /sweden/i,
    /sverige/i,
    /swedish/i,
    /stockholm/i,
    /göteborg|gothenburg/i,
    /malmö|malmo/i,
  ],
  'NO': [
    /norway/i,
    /norge/i,
    /norwegian/i,
    /oslo/i,
    /bergen/i,
    /trondheim/i,
  ],
  'GB': [
    /united kingdom/i,
    /uk\b/i,
    /england/i,
    /london/i,
    /manchester/i,
    /scotland/i,
    /wales/i,
  ],
  'DE': [
    /germany/i,
    /deutschland/i,
    /german\b/i,
    /berlin/i,
    /munich|münchen/i,
    /hamburg/i,
    /frankfurt/i,
  ],
  'US': [
    /united states/i,
    /usa\b/i,
    /\bu\.s\./i,
    /new york/i,
    /california/i,
    /texas/i,
  ],
  'PL': [
    /poland/i,
    /polska/i,
    /polish/i,
    /warsaw|warszawa/i,
    /krakow|kraków/i,
  ],
};

/**
 * Detect country codes from location string
 */
export function detectCountriesFromLocation(location: string): string[] {
  const countries = new Set<string>();
  
  for (const [countryCode, patterns] of Object.entries(COUNTRY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(location)) {
        countries.add(countryCode);
        break; // Don't test other patterns for this country
      }
    }
  }
  
  return Array.from(countries);
}

/**
 * Parse all locations and extract countries
 */
export function parseLocationsAndCountries(locations: string[]): {
  countries: string[];
  primaryCountry: string;
} {
  const allCountries = new Set<string>();
  
  for (const location of locations) {
    const detected = detectCountriesFromLocation(location);
    detected.forEach(c => allCountries.add(c));
  }
  
  const countries = Array.from(allCountries);
  
  // Primary country: first detected, or first in list if none detected
  const primaryCountry = countries[0] || 'UNKNOWN';
  
  return { countries, primaryCountry };
}

/**
 * Generate stable canonical job ID
 */
export function generateCanonicalJobId(externalId: string): string {
  const hash = crypto.createHash('sha256')
    .update(`apify:workday:${externalId}`)
    .digest('hex');
  return hash;
}

/**
 * Normalize Apify Workday job to our schema
 */
export function normalizeWorkdayJob(
  item: ApifyDatasetItem,
  companyId: string,
  companyName: string
): NormalizedJob {
  // Extract external ID (prefer jobId, post_id, requisitionId, or derive from URL)
  const externalId = 
    (item as any).post_id ||
    item.jobId || 
    item.requisitionId || 
    (item as any).job_url?.split('/').pop()?.split('_').pop() ||
    item.applyUrl?.split('/').pop() || 
    item.url?.split('/').pop() ||
    crypto.createHash('md5').update(JSON.stringify(item)).digest('hex');
  
  // Generate canonical job ID
  const canonical_job_id = generateCanonicalJobId(externalId);
  
  // Extract locations (handle both single location and array)
  let locationsRaw: string[] = [];
  if (item.locations && Array.isArray(item.locations)) {
    locationsRaw = item.locations;
  } else if (item.location) {
    locationsRaw = [item.location];
  } else if ((item as any).locations_derived && Array.isArray((item as any).locations_derived)) {
    locationsRaw = (item as any).locations_derived;
  }
  
  // Parse countries from locations
  const { countries, primaryCountry } = parseLocationsAndCountries(locationsRaw);
  
  // Use explicit country field if provided
  if (item.country) {
    const explicitCountries = detectCountriesFromLocation(item.country);
    explicitCountries.forEach(c => {
      if (!countries.includes(c)) {
        countries.push(c);
      }
    });
  }
  
  if (item.countries && Array.isArray(item.countries)) {
    item.countries.forEach((c: string) => {
      const detected = detectCountriesFromLocation(c);
      detected.forEach(code => {
        if (!countries.includes(code)) {
          countries.push(code);
        }
      });
    });
  }
  
  // URLs
  const apply_url = (item as any).job_url || item.applyUrl || item.url || '';
  const source_url = (item as any).job_url || item.url || item.applyUrl || '';
  
  // Dates
  const posted_at = item.postedDate ? new Date(item.postedDate).toISOString() : undefined;
  const updated_at = item.updatedDate ? new Date(item.updatedDate).toISOString() : undefined;
  
  return {
    canonical_job_id,
    source: 'apify:pulse_automation/workday-job-scraper-fast-edition',
    external_id: externalId,
    company_name: companyName,
    company_id: companyId,
    title: (item as any).job_title || item.title || '',
    apply_url,
    source_url,
    locations: locationsRaw,
    locations_raw: locationsRaw,
    countries,
    primary_country: primaryCountry,
    posted_at,
    updated_at,
    description_text: (item as any).description || item.description,
    description_html: item.descriptionHtml || (item as any).description || item.description,
    raw_data: item,
  };
}

/**
 * Validate normalized job has required fields
 */
export function validateNormalizedJob(job: NormalizedJob): boolean {
  const required = [
    job.canonical_job_id,
    job.source,
    job.external_id,
    job.company_name,
    job.company_id,
    job.title,
  ];
  
  return required.every(field => field && field.length > 0);
}
