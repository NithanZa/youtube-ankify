import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateCSV } from "@/lib/anki";
import { FlashcardSchema } from "@/lib/types";

const RequestSchema = z.object({
    cards: z.array(FlashcardSchema),
    videoUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cards } = RequestSchema.parse(body);

        const csv = generateCSV(cards);

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Disposition": 'attachment; filename="flashcards.txt"',
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid request format",
                    details: error.errors,
                },
                { status: 400 },
            );
        }

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            {
                success: false,
                error: `Failed to generate CSV: ${errorMessage}`,
            },
            { status: 500 },
        );
    }
}
