import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTranscriptWithFallback, TranscriptError } from '@/lib/transcript';
import { TranscriptResponseSchema } from '@/lib/types';

const RequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = RequestSchema.parse(body);

    const transcript = await fetchTranscriptWithFallback(url);
    const validated = TranscriptResponseSchema.parse(transcript);

    return NextResponse.json({
      success: true,
      data: validated,
    });
  } catch (error) {
    if (error instanceof TranscriptError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch transcript: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
