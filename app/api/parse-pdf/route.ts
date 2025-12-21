import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse/lib/pdf-parse.js";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * POST /api/parse-pdf
 * Extract text from PDF file
 * Body: FormData with 'file' field containing PDF
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "File is required",
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          error: "Invalid file type",
          message: "Only PDF files are supported",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const data = await pdf(buffer);

    // Extract text
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Empty PDF",
          message: "No text content found in PDF",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: text.trim(),
      pages: data.numpages,
      info: data.info,
    });

  } catch (error: any) {
    console.error("PDF parsing error:", error);
    
    return NextResponse.json(
      {
        error: "Parse failed",
        message: error.message || "An error occurred while parsing the PDF",
      },
      { status: 500 }
    );
  }
}
