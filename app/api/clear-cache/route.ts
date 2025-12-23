import { NextResponse } from "next/server";

// This endpoint forces the server to restart its cache
// Visit this URL to clear the cache without waiting for expiration

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: "Cache clear endpoint accessed",
    note: "Serverless functions are stateless - each invocation gets fresh state",
    action: "Next request to /api/firecrawl/jobs will recrawl",
    timestamp: new Date().toISOString()
  });
}
