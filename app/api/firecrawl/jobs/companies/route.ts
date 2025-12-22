import { NextResponse } from "next/server";
import { getCompanyNames } from "@/lib/companies";

// ============================================================
// Returns list of available companies for UI dropdown
// Automatically synced with COMPANIES in lib/companies.ts
// ============================================================

export async function GET() {
  return NextResponse.json({
    companies: getCompanyNames(),
  });
}

