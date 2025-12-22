// Company to Workday URL mapping
// Add new companies here as they are onboarded

export interface CompanyMapping {
  id: string;
  name: string;
  workdayUrl: string;
  country: string; // Primary country
}

export const WORKDAY_COMPANY_MAPPINGS: CompanyMapping[] = [
  {
    id: 'lego',
    name: 'LEGO',
    workdayUrl: 'https://lego.wd103.myworkdayjobs.com/da-DK/LEGO_External',
    country: 'DK'
  },
  {
    id: 'vestas',
    name: 'Vestas',
    workdayUrl: 'https://vestas.wd3.myworkdayjobs.com/Vestas',
    country: 'DK'
  },
  {
    id: 'coloplast',
    name: 'Coloplast',
    workdayUrl: 'https://coloplast.wd3.myworkdayjobs.com/Coloplast',
    country: 'DK'
  },
  {
    id: 'danske-bank',
    name: 'Danske Bank',
    workdayUrl: 'https://danskebank.wd3.myworkdayjobs.com/Danske_Bank_Careers',
    country: 'DK'
  },
  {
    id: 'grundfos',
    name: 'Grundfos',
    workdayUrl: 'https://grundfos.wd3.myworkdayjobs.com/Grundfos_Careers',
    country: 'DK'
  }
];

export function getCompanyMapping(companyId: string): CompanyMapping | undefined {
  return WORKDAY_COMPANY_MAPPINGS.find(c => c.id === companyId);
}

export function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
