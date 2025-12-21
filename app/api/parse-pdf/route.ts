import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/parse-pdf
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    error: "Method not allowed",
    message: "This endpoint only accepts POST requests with multipart/form-data. Please upload a PDF file.",
    usage: {
      method: "POST",
      endpoint: "/api/parse-pdf",
      contentType: "multipart/form-data",
      body: "FormData with 'file' field containing PDF"
    }
  }, { status: 405 });
}

/**
 * POST /api/parse-pdf
 * Extract text from PDF file
 * Body: FormData with 'file' field containing PDF
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data with error handling
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request must be multipart/form-data",
        },
        { status: 400 }
      );
    }

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
          message: "Only PDF files are supported. Got: " + file.type,
        },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "File too large",
          message: "PDF file must be less than 10MB",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate buffer
    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid file",
          message: "File appears to be empty",
        },
        { status: 400 }
      );
    }

    // Parse PDF using PDFParse
    let parser;
    try {
      parser = new PDFParse(buffer);
      const result = await parser.getText();

      // Extract text
      const text = result.text;

      if (!text || text.trim().length === 0) {
        await parser.destroy();
        return NextResponse.json(
          {
            error: "Empty PDF",
            message: "No text content found in PDF. The PDF may be scanned images or empty.",
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
    } catch (pdfError: any) {
      // Clean up on error
      if (parser) {
        try {
          await parser.destroy();
        } catch {}
      }
      throw new Error(`PDF parsing failed: ${pdfError.message}`);
    }

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
