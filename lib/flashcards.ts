import { generateObject } from "ai";
import { z } from "zod";
import {
    Flashcard,
    FlashcardSchema,
    TranscriptResponse,
    DifficultyTier,
    DifficultyLevel,
    QuantityLevel,
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
    const [quantityLevel, difficultyLevel] = difficulty.split("-") as [
        QuantityLevel,
        DifficultyLevel,
    ];
    const client = getProviderClient(provider, model, apiKey);
    const systemPrompt = buildSystemPrompt(quantityLevel, difficultyLevel);
    const userPrompt = buildUserPrompt(
        transcript,
        quantityLevel,
        difficultyLevel,
    );
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
    quantityLevel: QuantityLevel,
    difficultyLevel: DifficultyLevel,
): string {
    const quantityInstructions: Record<QuantityLevel, string> = {
        few: `- Cover only the most essential concepts — prioritise breadth over depth
- Skip supporting details, examples, and edge cases
- Aim for the smallest set of cards that still captures the core message`,
        medium: `- Cover key concepts and important supporting details
- Include a balanced mix of definitions, relationships, and application
- Skip minor tangents but don't omit meaningful context`,
        many: `- Cover the full scope of the content comprehensively
- Include supporting details, examples, edge cases, and nuance
- Err on the side of more cards rather than fewer`,
    };

    const difficultyInstructions: Record<DifficultyLevel, string> = {
        easy: `- Use straightforward, direct questions
- Answers should be concise (1-2 sentences)
- Prioritise definitions, basic facts, and simple recall
- Avoid "why/how" questions that require reasoning`,
        medium: `- Mix factual recall with conceptual understanding
- Include some "why" and "how" questions
- Answers can be 2-3 sentences
- Include comparisons and relationships between concepts`,
        hard: `- Focus on deep understanding, nuanced distinctions, and reasoning
- Include edge cases, subtle implications, and challenging application scenarios
- Answers should be thorough but focused (3-4 sentences)
- Test analysis, synthesis, and evaluation — not just recall`,
    };

    return `You are an expert at creating high-quality Anki flashcards from educational content.

QUANTITY (${quantityLevel.toUpperCase()} — how many cards to produce):
${quantityInstructions[quantityLevel]}

DIFFICULTY (${difficultyLevel.toUpperCase()} — how hard each card should be):
${difficultyInstructions[difficultyLevel]}

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
    quantityLevel: QuantityLevel,
    difficultyLevel: DifficultyLevel,
): string {
    return `Generate flashcards from this transcript.

Quantity: ${quantityLevel}
Difficulty: ${difficultyLevel}

VIDEO TRANSCRIPT:
${transcript.fullText}

Remember:
- Mix basic and cloze card types appropriately
- Ensure each card tests ONE atomic concept
- Make questions specific and unambiguous

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
    currentCards: Flashcard[],
    apiKey?: string,
): Promise<GenerateCardsResponse> {
    const diffLevels: DifficultyLevel[] = ["easy", "medium", "hard"];
    const qtyLevels: QuantityLevel[] = ["few", "medium", "many"];

    let [quantityLevel, difficultyLevel] = currentDifficulty.split("-") as [
        QuantityLevel,
        DifficultyLevel,
    ];

    if (action === "make-harder") {
        const idx = diffLevels.indexOf(difficultyLevel);
        if (idx < diffLevels.length - 1) difficultyLevel = diffLevels[idx + 1];
    } else if (action === "make-easier") {
        const idx = diffLevels.indexOf(difficultyLevel);
        if (idx > 0) difficultyLevel = diffLevels[idx - 1];
    } else if (action === "generate-more") {
        const idx = qtyLevels.indexOf(quantityLevel);
        if (idx < qtyLevels.length - 1) quantityLevel = qtyLevels[idx + 1];
    } else {
        const idx = qtyLevels.indexOf(quantityLevel);
        if (idx > 0) quantityLevel = qtyLevels[idx - 1];
    }

    const newDifficulty =
        `${quantityLevel}-${difficultyLevel}` as DifficultyTier;

    const client = getProviderClient(provider, model, apiKey);
    const systemPrompt = buildSystemPrompt(quantityLevel, difficultyLevel);
    const userPrompt = buildRegenerateUserPrompt(
        transcript,
        quantityLevel,
        difficultyLevel,
        action,
        currentCards,
    );
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

function buildRegenerateUserPrompt(
    transcript: TranscriptResponse,
    quantityLevel: QuantityLevel,
    difficultyLevel: DifficultyLevel,
    action: "make-harder" | "make-easier" | "generate-more" | "generate-less",
    currentCards: Flashcard[],
): string {
    const actionInstructions: Record<typeof action, string> = {
        "make-harder": `Rewrite ALL of the existing cards to be harder (difficulty: ${difficultyLevel}). Each card should require deeper reasoning, more nuance, or test subtler implications. Keep the same topics but increase cognitive demand. Return exactly ${currentCards.length} cards.`,
        "make-easier": `Rewrite ALL of the existing cards to be easier (difficulty: ${difficultyLevel}). Simplify questions and answers — focus on direct recall and clear definitions. Keep the same topics but reduce cognitive demand. Return exactly ${currentCards.length} cards.`,
        "generate-more": `Regenerate flashcards [more than the current quantity (${quantityLevel})]. New cards should cover topics and concepts NOT already covered by the existing cards. Do NOT duplicate existing cards.`,
        "generate-less": `Select and return a SHORTER subset of the best cards from the existing set (current quantity: ${quantityLevel}). Keep only the most important cards. Return exactly ${currentCards.length} cards or fewer.`,
    };

    const serializedCards = currentCards
        .map((c, i) => {
            if (c.type === "basic")
                return `[${i + 1}] Basic — Q: ${c.front} / A: ${c.back}`;
            return `[${i + 1}] Cloze — ${c.text}`;
        })
        .join("\n");

    return `${actionInstructions[action]}

EXISTING CARDS (${currentCards.length} total):
${serializedCards}

VIDEO TRANSCRIPT:
${transcript.fullText}

Quantity: ${quantityLevel}
Difficulty: ${difficultyLevel}

Remember:
- Mix basic and cloze card types appropriately
- Ensure each card tests ONE atomic concept
- Make questions specific and unambiguous

Generate the flashcards now.`;
}
