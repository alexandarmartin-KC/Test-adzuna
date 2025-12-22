// ============================================================
// WORKDAY FALLBACK INGESTION SYSTEM
// For enterprise sites with max bot-protection
// ============================================================

export type FallbackType = 'OFFICIAL_FEED' | 'PARTNER_API' | 'MANUAL_ONBOARD' | 'BLOCKED';

export interface FallbackConfig {
  company_id: string;
  company_name: string;
  fallbackType: FallbackType;
  feedUrl?: string;
  feedType?: 'XML' | 'JSON' | 'RSS';
  partnerName?: string;
  partnerApiKey?: string;
  notes?: string;
  enabled: boolean;
}

export interface FallbackRegistry {
  [company_id: string]: FallbackConfig;
}

// ============================================================
// FALLBACK REGISTRY
// Configure enterprise sites that need alternative ingestion
// ============================================================

export const WORKDAY_FALLBACK_REGISTRY: FallbackRegistry = {
  'lego': {
    company_id: 'lego',
    company_name: 'LEGO',
    fallbackType: 'BLOCKED',
    notes: 'Enterprise Workday with max bot-protection. Requires official feed or partnership.',
    enabled: true
  },
  'ikea': {
    company_id: 'ikea',
    company_name: 'IKEA',
    fallbackType: 'BLOCKED',
    notes: 'Enterprise Workday with max bot-protection.',
    enabled: true
  },
  'vestas': {
    company_id: 'vestas',
    company_name: 'Vestas',
    fallbackType: 'BLOCKED',
    notes: 'Enterprise Workday with max bot-protection.',
    enabled: true
  },
  'danske-bank': {
    company_id: 'danske-bank',
    company_name: 'Danske Bank',
    fallbackType: 'BLOCKED',
    notes: 'Enterprise Workday with max bot-protection.',
    enabled: true
  }
};

// ============================================================
// FALLBACK ORCHESTRATOR
// ============================================================

export async function fetchJobsWithFallback(
  company_id: string,
  company_name: string,
  workdayUrl: string
): Promise<{ jobs: any[]; source: 'WORKDAY_API' | 'OFFICIAL_FEED' | 'PARTNER' | 'BLOCKED' }> {
  // Check if company has fallback configured
  const fallbackConfig = WORKDAY_FALLBACK_REGISTRY[company_id];
  
  if (!fallbackConfig || !fallbackConfig.enabled) {
    // Try normal Workday scraping
    return { jobs: [], source: 'WORKDAY_API' };
  }
  
  console.log(`[Fallback] ${company_name} uses fallback: ${fallbackConfig.fallbackType}`);
  
  switch (fallbackConfig.fallbackType) {
    case 'OFFICIAL_FEED':
      return await ingestFromOfficialFeed(fallbackConfig);
    
    case 'PARTNER_API':
      return await ingestFromPartnerAPI(fallbackConfig);
    
    case 'MANUAL_ONBOARD':
      console.log(`[Fallback] ${company_name} requires manual onboarding`);
      return { jobs: [], source: 'BLOCKED' };
    
    case 'BLOCKED':
      console.log(`[Fallback] ${company_name} is blocked - needs feed/partnership`);
      return { jobs: [], source: 'BLOCKED' };
    
    default:
      return { jobs: [], source: 'BLOCKED' };
  }
}

// ============================================================
// OFFICIAL FEED INGESTION (XML/JSON)
// ============================================================

async function ingestFromOfficialFeed(config: FallbackConfig): Promise<{ jobs: any[]; source: 'OFFICIAL_FEED' }> {
  if (!config.feedUrl) {
    console.log(`[Fallback] No feed URL configured for ${config.company_name}`);
    return { jobs: [], source: 'OFFICIAL_FEED' };
  }
  
  console.log(`[Fallback] Fetching official feed: ${config.feedUrl}`);
  
  try {
    const response = await fetch(config.feedUrl);
    
    if (!response.ok) {
      console.log(`[Fallback] Feed fetch failed: HTTP ${response.status}`);
      return { jobs: [], source: 'OFFICIAL_FEED' };
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('xml') || config.feedType === 'XML') {
      return await parseXMLFeed(await response.text(), config);
    } else if (contentType.includes('json') || config.feedType === 'JSON') {
      return await parseJSONFeed(await response.json(), config);
    }
    
    console.log(`[Fallback] Unknown feed type for ${config.company_name}`);
    return { jobs: [], source: 'OFFICIAL_FEED' };
    
  } catch (error) {
    console.error(`[Fallback] Error fetching official feed:`, error);
    return { jobs: [], source: 'OFFICIAL_FEED' };
  }
}

async function parseXMLFeed(xml: string, config: FallbackConfig): Promise<{ jobs: any[]; source: 'OFFICIAL_FEED' }> {
  // TODO: Implement XML parsing based on feed schema
  console.log(`[Fallback] XML feed parsing not yet implemented for ${config.company_name}`);
  return { jobs: [], source: 'OFFICIAL_FEED' };
}

async function parseJSONFeed(data: any, config: FallbackConfig): Promise<{ jobs: any[]; source: 'OFFICIAL_FEED' }> {
  // TODO: Implement JSON parsing based on feed schema
  console.log(`[Fallback] JSON feed parsing not yet implemented for ${config.company_name}`);
  return { jobs: [], source: 'OFFICIAL_FEED' };
}

// ============================================================
// PARTNER API INGESTION
// ============================================================

async function ingestFromPartnerAPI(config: FallbackConfig): Promise<{ jobs: any[]; source: 'PARTNER' }> {
  if (!config.partnerApiKey) {
    console.log(`[Fallback] No partner API key configured for ${config.company_name}`);
    return { jobs: [], source: 'PARTNER' };
  }
  
  console.log(`[Fallback] Fetching from partner: ${config.partnerName}`);
  
  // TODO: Implement partner API integrations
  // Examples: Adzuna, Indeed, LinkedIn partner APIs
  
  return { jobs: [], source: 'PARTNER' };
}

// ============================================================
// ONBOARDING FLOW
// ============================================================

export interface OnboardingRequest {
  company_name: string;
  company_id: string;
  workday_url: string;
  contact_email?: string;
  feed_url?: string;
  feed_type?: 'XML' | 'JSON' | 'RSS';
  notes?: string;
}

export function createOnboardingRequest(request: OnboardingRequest): FallbackConfig {
  const config: FallbackConfig = {
    company_id: request.company_id,
    company_name: request.company_name,
    fallbackType: request.feed_url ? 'OFFICIAL_FEED' : 'MANUAL_ONBOARD',
    feedUrl: request.feed_url,
    feedType: request.feed_type,
    notes: request.notes || 'Awaiting feed configuration',
    enabled: false // Must be manually enabled after verification
  };
  
  console.log(`[Onboarding] Created config for ${request.company_name}`);
  console.log(`  Feed URL: ${request.feed_url || 'Not provided'}`);
  console.log(`  Status: Requires manual verification and enablement`);
  
  return config;
}

// ============================================================
// UI STATUS HELPER
// ============================================================

export function getCompanyStatus(company_id: string): {
  available: boolean;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING_FEED' | 'PENDING_PARTNERSHIP';
  message: string;
} {
  const fallback = WORKDAY_FALLBACK_REGISTRY[company_id];
  
  if (!fallback) {
    return {
      available: true,
      status: 'ACTIVE',
      message: 'Jobs available via standard scraping'
    };
  }
  
  if (!fallback.enabled) {
    return {
      available: false,
      status: 'PENDING_FEED',
      message: 'Onboarding in progress - awaiting feed setup'
    };
  }
  
  switch (fallback.fallbackType) {
    case 'OFFICIAL_FEED':
      return {
        available: true,
        status: 'ACTIVE',
        message: 'Jobs available via official feed'
      };
    
    case 'PARTNER_API':
      return {
        available: true,
        status: 'ACTIVE',
        message: `Jobs available via ${fallback.partnerName} partnership`
      };
    
    case 'BLOCKED':
      return {
        available: false,
        status: 'BLOCKED',
        message: 'This company requires an official feed or partnership. Contact support to onboard.'
      };
    
    case 'MANUAL_ONBOARD':
      return {
        available: false,
        status: 'PENDING_FEED',
        message: 'Onboarding in progress - awaiting configuration'
      };
    
    default:
      return {
        available: false,
        status: 'BLOCKED',
        message: 'Currently unavailable'
      };
  }
}
