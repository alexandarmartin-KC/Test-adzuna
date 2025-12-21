"use client";

import { useState } from "react";

export default function TestAPIPage() {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const testEndpoints = async () => {
    setTesting(true);
    const tests: any = {};

    // Test 1: CV Analysis GET (should return 405)
    try {
      const res = await fetch("/api/cv-analysis", { method: "GET" });
      tests.cvAnalysisGET = {
        status: res.status,
        ok: res.ok,
        data: await res.json(),
      };
    } catch (err: any) {
      tests.cvAnalysisGET = { error: err.message };
    }

    // Test 2: CV Analysis POST (should work)
    try {
      const res = await fetch("/api/cv-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: "Test CV content for API testing." }),
      });
      tests.cvAnalysisPOST = {
        status: res.status,
        ok: res.ok,
        data: await res.json().catch(() => "Non-JSON response"),
      };
    } catch (err: any) {
      tests.cvAnalysisPOST = { error: err.message };
    }

    // Test 3: PDF Parse GET (should return 405)
    try {
      const res = await fetch("/api/parse-pdf", { method: "GET" });
      tests.parsePdfGET = {
        status: res.status,
        ok: res.ok,
        data: await res.json(),
      };
    } catch (err: any) {
      tests.parsePdfGET = { error: err.message };
    }

    setResults(tests);
    setTesting(false);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>API Diagnostics</h1>
      
      <button
        onClick={testEndpoints}
        disabled={testing}
        style={{
          padding: "12px 24px",
          backgroundColor: testing ? "#ccc" : "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: testing ? "not-allowed" : "pointer",
          fontSize: "16px",
          marginBottom: "30px",
        }}
      >
        {testing ? "Testing..." : "Test All Endpoints"}
      </button>

      {Object.keys(results).length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>Test Results</h2>
          
          {Object.entries(results).map(([endpoint, result]: [string, any]) => (
            <div
              key={endpoint}
              style={{
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                borderLeft: `4px solid ${result.error ? "#f44" : result.ok ? "#4f4" : "#fa4"}`,
              }}
            >
              <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>
                {endpoint}
              </h3>
              
              {result.error && (
                <div style={{ color: "#c00" }}>
                  <strong>Error:</strong> {result.error}
                </div>
              )}
              
              {result.status && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>Status:</strong> {result.status} ({result.ok ? "OK" : "Error"})
                </div>
              )}
              
              {result.data && (
                <div>
                  <strong>Response:</strong>
                  <pre
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      backgroundColor: "#fff",
                      borderRadius: "4px",
                      overflow: "auto",
                      fontSize: "12px",
                    }}
                  >
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Expected Behavior:</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li><strong>cvAnalysisGET:</strong> Status 405 - Method not allowed</li>
          <li><strong>cvAnalysisPOST:</strong> Status 500 or 400 - API key or validation error (expected in test)</li>
          <li><strong>parsePdfGET:</strong> Status 405 - Method not allowed</li>
        </ul>
      </div>

      <div style={{ marginTop: "20px" }}>
        <a href="/cv-analysis" style={{ color: "#0070f3" }}>← Back to CV Analysis</a>
      </div>
    </div>
  );
}
