import { generateObject } from "ai";
import { z } from "zod";
import {
    Flashcard,
    FlashcardSchema,
    TranscriptResponse,
    DifficultyTier,
    DIFFICULTY_CONFIGS,
    AIProvider,
    GenerateCardsResponse,
} from "./types";
import { getProviderClient } from "./ai";

const FlashcardsOutputSchema = z.object({
    cards: z.array(FlashcardSchema),
});

async function runGeneration(
    client: ReturnType<typeof getProviderClient>,
    systemPrompt: string,
    userPrompt: string,
    difficulty: DifficultyTier,
    provider: AIProvider,
    model: string,
    videoId = "",
): Promise<GenerateCardsResponse> {
    const result = await generateObject({
        model: client,
        schema: FlashcardsOutputSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
    });

    const cards = result.object.cards;
    const processedCards = postProcessCards(cards, videoId);

    return {
        cards: processedCards,
        metadata: {
            totalGenerated: processedCards.length,
            difficulty,
            provider,
            model,
        },
    };
}

export async function generateFlashcards(
    transcript: TranscriptResponse,
    provider: AIProvider,
    model: string,
    difficulty: DifficultyTier,
    videoUrl: string,
    apiKey?: string,
): Promise<GenerateCardsResponse> {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const client = getProviderClient(provider, model, apiKey);
    const systemPrompt = buildSystemPrompt(difficulty, config);
    const userPrompt = buildUserPrompt(transcript, config);
    return runGeneration(
        client,
        systemPrompt,
        userPrompt,
        difficulty,
        provider,
        model,
        transcript.videoId,
    );
}

function buildSystemPrompt(
    difficulty: DifficultyTier,
    config: (typeof DIFFICULTY_CONFIGS)[DifficultyTier],
): string {
    const complexityInstructions = {
        simple: `
- Focus on core concepts and key facts
- Use straightforward, direct questions
- Answers should be concise (1-2 sentences)
- Prioritize definitions and basic understanding`,
        balanced: `
- Mix conceptual understanding with application
- Include some "why" and "how" questions
- Answers can be more detailed (2-3 sentences)
- Include comparisons and relationships between concepts`,
        comprehensive: `
- Deep conceptual understanding and nuanced distinctions
- Include edge cases and subtle implications
- Answers should be thorough but focused (3-4 sentences)
- Test reasoning, analysis, and synthesis
- Include challenging application scenarios`,
    };

    return `You are an expert at creating high-quality Anki flashcards from educational content.

Your goal: Generate ${config.targetCount.min}-${config.targetCount.max} flashcards at ${difficulty} difficulty level.

DIFFICULTY LEVEL: ${config.complexity.toUpperCase()}
${complexityInstructions[config.complexity]}

CARD TYPES:
1. Basic cards: Simple Q&A format
   - "front": The question
   - "back": The answer
   
2. Cloze cards: Fill-in-the-blank format
   - "text": Sentence with {{c1::deletion}} markers
   - "extra": Optional context/hint

QUALITY RULES (CRITICAL):
1. ONE concept per card - atomic knowledge units
2. Questions must be specific and unambiguous
3. Avoid vague words like "it", "this", "that" - be explicit
4. No multi-part answers - split into separate cards
5. Include context in the question if needed
6. Answers should be complete but concise
7. Use cloze for terminology, definitions, and fill-in-the-blank scenarios
8. Use basic for conceptual questions, explanations, and "why/how" questions

CONTENT PRIORITIES:
- Key definitions and terminology
- Important facts and figures
- Cause and effect relationships
- Comparisons and contrasts
- Procedures and processes
- Main arguments and conclusions

AVOID:
- Trivial or obvious questions
- Questions requiring multiple facts to answer
- Ambiguous phrasing
- Yes/no questions without context
- Questions about minor details (unless comprehensive mode)

Return a JSON object with a "cards" array. Each card must have:
- "type": "basic" or "cloze"
- For basic: "front" and "back" fields
- For cloze: "text" field with {{c1::deletions}}
- Optional: "tags", "sourceTimestamp", "confidence" (0-1)`;
}

function buildUserPrompt(
    transcript: TranscriptResponse,
    config: (typeof DIFFICULTY_CONFIGS)[DifficultyTier],
): string {
    return `Generate ${config.targetCount.min}-${config.targetCount.max} high-quality flashcards from this transcript.

VIDEO TRANSCRIPT:
${transcript.fullText}

Remember:
- Mix basic and cloze card types appropriately
- Ensure each card tests ONE atomic concept
- Make questions specific and unambiguous
- Target difficulty: ${config.description}

Generate the flashcards now.`;
}

function postProcessCards(cards: Flashcard[], videoId: string): Flashcard[] {
    const filtered = cards.filter(isValidCard);
    const deduplicated = deduplicateCards(filtered);

    return deduplicated.map((card) => ({
        ...card,
        tags: card.tags?.length ? card.tags : ["youtube", videoId],
    }));
}

function isValidCard(card: Flashcard): boolean {
    if (card.type === "basic") {
        if (!card.front?.trim() || !card.back?.trim()) return false;
        if (card.front.length < 10 || card.back.length < 5) return false;
        if (card.front.split(" ").length < 3) return false;

        const vaguePhrases = ["it", "this", "that", "these", "those"];
        const frontLower = card.front.toLowerCase();
        if (
            vaguePhrases.some((phrase) => frontLower.startsWith(phrase + " "))
        ) {
            return false;
        }
    } else if (card.type === "cloze") {
        if (!card.text?.trim()) return false;
        if (!card.text.includes("{{c1::")) return false;
        if (card.text.length < 15) return false;
    }

    return true;
}

function deduplicateCards(cards: Flashcard[]): Flashcard[] {
    const seen = new Set<string>();
    const unique: Flashcard[] = [];

    for (const card of cards) {
        const key =
            card.type === "basic"
                ? `${card.front.toLowerCase().trim()}`
                : `${card.text.toLowerCase().trim()}`;

        const normalizedKey = key.replace(/[^\w\s]/g, "").replace(/\s+/g, " ");

        if (!seen.has(normalizedKey)) {
            seen.add(normalizedKey);
            unique.push(card);
        }
    }

    return unique;
}

export async function regenerateFlashcards(
    transcript: TranscriptResponse,
    provider: AIProvider,
    model: string,
    currentDifficulty: DifficultyTier,
    action: "make-harder" | "make-easier" | "generate-more" | "generate-less",
    videoUrl: string,
    apiKey?: string,
    currentCardCount?: number,
): Promise<GenerateCardsResponse> {
    let newDifficulty: DifficultyTier;
    let countOverride: { min: number; max: number } | undefined;

    if (action === "make-harder") {
        newDifficulty =
            currentDifficulty === "few-easy" ? "medium-medium" : "many-hard";
        if (currentCardCount) {
            countOverride = { min: currentCardCount, max: currentCardCount };
        }
    } else if (action === "make-easier") {
        newDifficulty =
            currentDifficulty === "many-hard" ? "medium-medium" : "few-easy";
        if (currentCardCount) {
            countOverride = { min: currentCardCount, max: currentCardCount };
        }
    } else if (action === "generate-more") {
        newDifficulty = currentDifficulty;
        const base = DIFFICULTY_CONFIGS[currentDifficulty].targetCount;
        countOverride = {
            min: Math.floor(base.min * 1.5),
            max: Math.floor(base.max * 1.5),
        };
    } else {
        newDifficulty = currentDifficulty;
        const base = DIFFICULTY_CONFIGS[currentDifficulty].targetCount;
        countOverride = {
            min: Math.max(5, Math.floor(base.min * 0.6)),
            max: Math.max(8, Math.floor(base.max * 0.6)),
        };
    }

    if (countOverride) {
        const config = {
            ...DIFFICULTY_CONFIGS[newDifficulty],
            targetCount: countOverride,
        };
        const client = getProviderClient(provider, model, apiKey);
        const systemPrompt = buildSystemPrompt(newDifficulty, config);
        const userPrompt = buildUserPrompt(transcript, config);
        return runGeneration(
            client,
            systemPrompt,
            userPrompt,
            newDifficulty,
            provider,
            model,
            transcript.videoId,
        );
    }

    return generateFlashcards(
        transcript,
        provider,
        model,
        newDifficulty,
        videoUrl,
        apiKey,
    );
}
