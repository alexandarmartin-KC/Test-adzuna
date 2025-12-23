import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";

export const dynamic = 'force-dynamic';

export async function GET() {
  const companies = COMPANIES.map(c => ({
    name: c.name,
    url: c.careersUrl,
    country: c.country || 'Not set'
  }));
  
  return NextResponse.json({
    totalCompanies: companies.length,
    companies,
    note: "This shows the companies configured in the system",
    timestamp: new Date().toISOString()
  });
}
