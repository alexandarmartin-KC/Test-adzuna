import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Global Job Search - Adzuna",
  description: "Find jobs worldwide in 19 countries with Adzuna",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <nav style={{
          backgroundColor: "#0070f3",
          padding: "1rem 2rem",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
        }}>
          <Link 
            href="/" 
            style={{
              color: "white",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          >
            Job Search
          </Link>
          <Link 
            href="/cv-analysis" 
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "1rem",
            }}
          >
            CV Analysis
          </Link>
          <Link 
            href="/job-match" 
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "1rem",
            }}
          >
            Job Match
          </Link>
          <Link 
            href="/firecrawl" 
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "1rem",
            }}
          >
            Firecrawl
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
