import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateFlashcards, regenerateFlashcards } from "@/lib/flashcards";
import {
    GenerateCardsRequestSchema,
    RegenerateActionSchema,
    type DifficultyTier,
} from "@/lib/types";
import { AIProviderError } from "@/lib/ai";

const RegenerateRequestSchema = GenerateCardsRequestSchema.extend({
    action: RegenerateActionSchema,
    currentDifficulty: z.string(),
    apiKey: z.string().optional(),
    currentCardCount: z.number().optional(),
});

const GenerateRequestSchema = GenerateCardsRequestSchema.extend({
    apiKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const isRegenerate = "action" in body;

        if (isRegenerate) {
            const {
                transcript,
                provider,
                model,
                action,
                currentDifficulty,
                videoUrl,
                apiKey,
                currentCardCount,
            } = RegenerateRequestSchema.parse(body);

            const result = await regenerateFlashcards(
                transcript,
                provider,
                model,
                currentDifficulty as DifficultyTier,
                action,
                videoUrl,
                apiKey,
                currentCardCount,
            );

            return NextResponse.json({
                success: true,
                data: result,
            });
        } else {
            const {
                transcript,
                provider,
                model,
                difficulty,
                videoUrl,
                apiKey,
            } = GenerateRequestSchema.parse(body);

            const result = await generateFlashcards(
                transcript,
                provider,
                model,
                difficulty,
                videoUrl,
                apiKey,
            );

            return NextResponse.json({
                success: true,
                data: result,
            });
        }
    } catch (error) {
        if (error instanceof AIProviderError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    code: error.code,
                    provider: error.provider,
                },
                { status: 400 },
            );
        }

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
                error: `Failed to generate cards: ${errorMessage}`,
            },
            { status: 500 },
        );
    }
}
