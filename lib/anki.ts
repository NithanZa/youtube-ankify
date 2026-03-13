import { Flashcard } from "./types";

function escapeTSV(value: string): string {
    return value.replace(/\t/g, " ").replace(/\n/g, "<br>").replace(/\r/g, "");
}

export function generateCSV(cards: Flashcard[]): string {
    const basicCards = cards.filter((c) => c.type === "basic");
    const clozeCards = cards.filter((c) => c.type === "cloze");
    const sections: string[] = [];

    if (basicCards.length > 0) {
        const rows: string[] = [];
        rows.push("#separator:tab");
        rows.push("#html:true");
        rows.push("#notetype:Basic");
        rows.push("#columns:Front\tBack\tTags");
        for (const card of basicCards) {
            const front = escapeTSV(card.front);
            const back = escapeTSV(card.back);
            const tags = (card.tags || []).join(" ");
            rows.push(`${front}\t${back}\t${tags}`);
        }
        sections.push(rows.join("\n"));
    }

    if (clozeCards.length > 0) {
        const rows: string[] = [];
        rows.push("#separator:tab");
        rows.push("#html:true");
        rows.push("#notetype:Cloze");
        rows.push("#columns:Text\tExtra\tTags");
        for (const card of clozeCards) {
            const text = escapeTSV(card.text);
            const extra = escapeTSV(card.extra || "");
            const tags = (card.tags || []).join(" ");
            rows.push(`${text}\t${extra}\t${tags}`);
        }
        sections.push(rows.join("\n"));
    }

    return sections.join("\n\n");
}

export interface AnkiConnectPayload {
    action: string;
    version: number;
    params?: Record<string, unknown>;
}

export function createAnkiConnectPayload(
    action: string,
    params?: Record<string, unknown>,
): AnkiConnectPayload {
    return {
        action,
        version: 6,
        params,
    };
}

export async function callAnkiConnect(
    payload: AnkiConnectPayload,
): Promise<unknown> {
    const response = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`AnkiConnect request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`AnkiConnect error: ${data.error}`);
    }

    return data.result;
}

export async function testAnkiConnect(): Promise<boolean> {
    try {
        const payload = createAnkiConnectPayload("version");
        const version = await callAnkiConnect(payload);
        return typeof version === "number" && version >= 6;
    } catch {
        return false;
    }
}

export async function getDeckNames(): Promise<string[]> {
    const payload = createAnkiConnectPayload("deckNames");
    const result = await callAnkiConnect(payload);
    return result as string[];
}

export async function createDeck(deckName: string): Promise<number> {
    const payload = createAnkiConnectPayload("createDeck", {
        deck: deckName,
    });
    const result = await callAnkiConnect(payload);
    return result as number;
}

export async function addNotesToAnki(
    cards: Flashcard[],
    deckName: string,
): Promise<Array<{ success: boolean; noteId?: number; error?: string }>> {
    const noteOptions = {
        allowDuplicate: true,
        duplicateScope: "deck",
        duplicateScopeOptions: {
            deckName,
            checkChildren: false,
            checkAllModels: false,
        },
    };

    const notes = cards.map((card) => {
        if (card.type === "basic") {
            return {
                deckName,
                modelName: "Basic",
                fields: {
                    Front: card.front,
                    Back: card.back,
                },
                tags: card.tags || [],
                options: noteOptions,
            };
        } else {
            return {
                deckName,
                modelName: "Cloze",
                fields: {
                    Text: card.text,
                    Extra: card.extra || "",
                },
                tags: card.tags || [],
                options: noteOptions,
            };
        }
    });

    const payload = createAnkiConnectPayload("addNotes", {
        notes,
    });

    try {
        const result = (await callAnkiConnect(payload)) as (number | null)[];

        return result.map((noteId) => {
            if (noteId === null) {
                return {
                    success: false,
                    error: "Failed to add note (possibly duplicate)",
                };
            }
            return {
                success: true,
                noteId,
            };
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return cards.map(() => ({
            success: false,
            error: errorMessage,
        }));
    }
}
