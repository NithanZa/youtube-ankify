import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  testAnkiConnect,
  getDeckNames,
  createDeck,
  addNotesToAnki,
} from '@/lib/anki';
import { FlashcardSchema } from '@/lib/types';

const RequestSchema = z.object({
  action: z.enum(['version', 'deckNames', 'createDeck', 'addNotes']),
  deckName: z.string().optional(),
  cards: z.array(FlashcardSchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, deckName, cards } = RequestSchema.parse(body);

    switch (action) {
      case 'version': {
        const isConnected = await testAnkiConnect();
        return NextResponse.json({
          success: true,
          data: { connected: isConnected },
        });
      }

      case 'deckNames': {
        const decks = await getDeckNames();
        return NextResponse.json({
          success: true,
          data: { decks },
        });
      }

      case 'createDeck': {
        if (!deckName) {
          return NextResponse.json(
            {
              success: false,
              error: 'Deck name is required for createDeck action',
            },
            { status: 400 }
          );
        }
        const deckId = await createDeck(deckName);
        return NextResponse.json({
          success: true,
          data: { deckId },
        });
      }

      case 'addNotes': {
        if (!deckName || !cards) {
          return NextResponse.json(
            {
              success: false,
              error: 'Deck name and cards are required for addNotes action',
            },
            { status: 400 }
          );
        }
        const results = await addNotesToAnki(cards, deckName);
        return NextResponse.json({
          success: true,
          data: { results },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        );
    }
  } catch (error) {
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
        error: `AnkiConnect operation failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
