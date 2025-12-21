import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

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

    // Parse PDF using PDFParse
    const parser = new PDFParse(buffer);
    const result = await parser.getText();

    // Extract text
    const text = result.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Empty PDF",
          message: "No text content found in PDF",
        },
        { status: 400 }
      );
    }

    // Clean up
    await parser.destroy();

    return NextResponse.json({
      success: true,
      text: text.trim(),
      pages: result.pages.length,
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
