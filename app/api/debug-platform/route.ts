import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

type Platform = "emply" | "successfactors" | "greenhouse" | "workday" | "lever" | "unknown";

function detectPlatform(url: string, html?: string): Platform {
  const lower = url.toLowerCase();
  
  // URL-based detection
  if (lower.includes('.emply.com') || lower.includes('career.emply')) return "emply";
  if (lower.includes('successfactors') || lower.includes('jobs.sap.com') || lower.includes('careers.novonordisk')) return "successfactors";
  if (lower.includes('greenhouse.io') || lower.includes('boards.greenhouse')) return "greenhouse";
  if (lower.includes('myworkdayjobs.com') || lower.includes('.wd')) return "workday";
  if (lower.includes('lever.co') || lower.includes('jobs.lever')) return "lever";
  
  // HTML-based detection
  if (html) {
    if (html.includes('emply.com') || html.includes('ui_jobs_grid') || html.includes('sectionId:')) return "emply";
    if (html.includes('jobTitle-link') || html.includes('class="jobLocation"')) return "successfactors";
    if (html.includes('greenhouse')) return "greenhouse";
    if (html.includes('workday')) return "workday";
    if (html.includes('lever.co')) return "lever";
  }
  
  return "unknown";
}

export async function GET() {
  const careersUrl = 'https://careers.carlsberg.com/CarlsbergDK/search/?q=&locale=en_GB';
  const logs: string[] = [];
  
  logs.push(`URL: ${careersUrl}`);
  
  let html: string | undefined;
  try {
    const resp = await fetch(careersUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    logs.push(`Fetch status: ${resp.status}`);
    
    if (resp.ok) {
      html = await resp.text();
      logs.push(`HTML length: ${html.length}`);
      logs.push(`HTML contains jobTitle-link: ${html.includes('jobTitle-link')}`);
      logs.push(`HTML contains class="jobLocation": ${html.includes('class="jobLocation"')}`);
    }
  } catch (e) {
    logs.push(`Fetch error: ${e}`);
  }
  
  const platform = detectPlatform(careersUrl, html);
  logs.push(`Platform detected: ${platform}`);
  
  return NextResponse.json({ logs, platform });
}
