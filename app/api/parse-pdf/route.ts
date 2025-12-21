import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * OPTIONS /api/parse-pdf
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * POST /api/parse-pdf
 * Extract text from PDF file
 * Body: FormData with 'file' field containing PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid request", message: "Request must be multipart/form-data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Invalid input", message: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type", message: "Only PDF files are supported. Got: " + file.type },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large", message: "PDF file must be less than 5MB" },
        { status: 400 }
      );
    }

    // Get file content
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Extract text from PDF
    const text = extractTextFromPDF(bytes);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          error: "PDF extraction limited",
          message: "Could not extract text from this PDF. Please copy-paste your CV text directly into the text field instead.",
          suggestion: "Open your PDF, select all (Ctrl+A), copy (Ctrl+C), paste in the text field."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: text.trim(),
    });

  } catch (error: any) {
    console.error("PDF parsing error:", error);
    
    return NextResponse.json(
      {
        error: "Parse failed",
        message: "PDF parsing failed. Please copy-paste your CV text directly instead.",
      },
      { status: 500 }
    );
  }
}

/**
 * Extract text from PDF binary data
 */
function extractTextFromPDF(bytes: Uint8Array): string {
  const textParts: string[] = [];
  const content = new TextDecoder('latin1').decode(bytes);
  
  // Method 1: Extract from text objects (Tj and TJ operators)
  const tjMatches = content.matchAll(/\(([^)]{1,500})\)\s*Tj/g);
  for (const match of tjMatches) {
    textParts.push(decodePDFString(match[1]));
  }
  
  // Method 2: Extract from TJ arrays
  const tjArrayMatches = content.matchAll(/\[([^\]]{1,2000})\]\s*TJ/gi);
  for (const match of tjArrayMatches) {
    const parts = match[1].matchAll(/\(([^)]*)\)/g);
    for (const part of parts) {
      textParts.push(decodePDFString(part[1]));
    }
  }
  
  // Method 3: Extract readable strings from streams
  const streamMatches = content.matchAll(/stream\r?\n([\s\S]{10,50000}?)\r?\nendstream/g);
  for (const match of streamMatches) {
    const readable = match[1].match(/[A-Za-z][A-Za-z0-9\s.,;:!?@#$%&*()\-+='"\/]{10,}/g);
    if (readable) {
      textParts.push(...readable);
    }
  }
  
  // Clean and deduplicate
  let result = textParts
    .map(s => s.trim())
    .filter(s => s.length > 1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Fallback: extract printable ASCII sequences
  if (result.length < 100) {
    const words: string[] = [];
    let word = '';
    
    for (const byte of bytes) {
      if (byte >= 32 && byte <= 126) {
        word += String.fromCharCode(byte);
      } else if (word.length > 3 && /[a-zA-Z]{2,}/.test(word)) {
        words.push(word);
        word = '';
      } else {
        word = '';
      }
    }
    
    const fallback = words.join(' ').replace(/\s+/g, ' ').trim();
    if (fallback.length > result.length) {
      result = fallback;
    }
  }
  
  return result;
}

/**
 * Decode PDF string escapes
 */
function decodePDFString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
