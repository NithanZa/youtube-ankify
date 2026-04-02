import { z } from "zod";

export const DifficultyTierSchema = z.enum([
    "few-easy",
    "few-medium",
    "few-hard",
    "medium-easy",
    "medium-medium",
    "medium-hard",
    "many-easy",
    "many-medium",
    "many-hard",
]);
export type DifficultyTier = z.infer<typeof DifficultyTierSchema>;

export type QuantityLevel = "few" | "medium" | "many";
export type DifficultyLevel = "easy" | "medium" | "hard";

export const AIProviderSchema = z.enum([
    "openai",
    "anthropic",
    "google",
    "groq",
]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const TranscriptSegmentSchema = z.object({
    text: z.string(),
    offset: z.number(),
    duration: z.number(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const TranscriptResponseSchema = z.object({
    videoId: z.string(),
    title: z.string().optional(),
    language: z.string(),
    segments: z.array(TranscriptSegmentSchema),
    fullText: z.string(),
});
export type TranscriptResponse = z.infer<typeof TranscriptResponseSchema>;

export const BasicCardSchema = z.object({
    type: z.literal("basic"),
    front: z.string(),
    back: z.string(),
    tags: z.array(z.string()).default([]),
    sourceTimestamp: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
});
export type BasicCard = z.infer<typeof BasicCardSchema>;

export const ClozeCardSchema = z.object({
    type: z.literal("cloze"),
    text: z.string(),
    extra: z.string().optional(),
    tags: z.array(z.string()).default([]),
    sourceTimestamp: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
});
export type ClozeCard = z.infer<typeof ClozeCardSchema>;

export const FlashcardSchema = z.discriminatedUnion("type", [
    BasicCardSchema,
    ClozeCardSchema,
]);
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const GenerateCardsRequestSchema = z.object({
    transcript: TranscriptResponseSchema,
    provider: AIProviderSchema,
    model: z.string(),
    difficulty: DifficultyTierSchema,
    videoUrl: z.string(),
});
export type GenerateCardsRequest = z.infer<typeof GenerateCardsRequestSchema>;

export const GenerateCardsResponseSchema = z.object({
    cards: z.array(FlashcardSchema),
    metadata: z.object({
        totalGenerated: z.number(),
        difficulty: DifficultyTierSchema,
        provider: AIProviderSchema,
        model: z.string(),
    }),
});
export type GenerateCardsResponse = z.infer<typeof GenerateCardsResponseSchema>;

export const RegenerateActionSchema = z.enum([
    "make-harder",
    "make-easier",
    "generate-more",
    "generate-less",
]);
export type RegenerateAction = z.infer<typeof RegenerateActionSchema>;

export const ExportFormatSchema = z.enum(["csv", "apkg"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportRequestSchema = z.object({
    cards: z.array(FlashcardSchema),
    format: ExportFormatSchema,
    deckName: z.string(),
    videoUrl: z.string().optional(),
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export const AnkiConnectActionSchema = z.enum([
    "version",
    "deckNames",
    "createDeck",
    "addNotes",
]);
export type AnkiConnectAction = z.infer<typeof AnkiConnectActionSchema>;

export const AnkiConnectRequestSchema = z.object({
    action: AnkiConnectActionSchema,
    deckName: z.string().optional(),
    cards: z.array(FlashcardSchema).optional(),
});
export type AnkiConnectRequest = z.infer<typeof AnkiConnectRequestSchema>;

export const AnkiConnectResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    cardResults: z
        .array(
            z.object({
                success: z.boolean(),
                noteId: z.number().optional(),
                error: z.string().optional(),
            }),
        )
        .optional(),
});
export type AnkiConnectResponse = z.infer<typeof AnkiConnectResponseSchema>;

export interface DifficultyConfig {
    targetCount: { min: number; max: number };
    complexity: "simple" | "balanced" | "comprehensive";
    description: string;
}

const QUANTITY_COUNTS: Record<QuantityLevel, { min: number; max: number }> = {
    few: { min: 10, max: 15 },
    medium: { min: 20, max: 30 },
    many: { min: 40, max: 60 },
};

const DIFFICULTY_COMPLEXITY: Record<
    DifficultyLevel,
    DifficultyConfig["complexity"]
> = {
    easy: "simple",
    medium: "balanced",
    hard: "comprehensive",
};

export const DIFFICULTY_CONFIGS: Record<DifficultyTier, DifficultyConfig> =
    Object.fromEntries(
        (["few", "medium", "many"] as QuantityLevel[]).flatMap((qty) =>
            (["easy", "medium", "hard"] as DifficultyLevel[]).map(
                (diff): [DifficultyTier, DifficultyConfig] => [
                    `${qty}-${diff}` as DifficultyTier,
                    {
                        targetCount: QUANTITY_COUNTS[qty],
                        complexity: DIFFICULTY_COMPLEXITY[diff],
                        description: "",
                    },
                ],
            ),
        ),
    ) as Record<DifficultyTier, DifficultyConfig>;
