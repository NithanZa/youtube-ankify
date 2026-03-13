# YouTube to Anki - AI-Powered Flashcard Generator

Transform YouTube videos into high-quality Anki flashcards using AI. This application fetches video transcripts, generates intelligent flashcards with customizable difficulty levels, and exports them in multiple formats.

## Features

- 🎥 **YouTube Transcript Extraction** - Automatically fetch transcripts from YouTube videos
- 🤖 **AI-Powered Card Generation** - Generate flashcards using OpenAI, Anthropic, Google, or Groq models
- 📊 **Multiple Card Types** - Supports both Basic (Q&A) and Cloze (fill-in-the-blank) cards
- 🎯 **Difficulty Tiers** - Choose from Few/Easy, Medium/Medium, or Many/Hard generation modes
- ✏️ **Edit & Review** - Preview and edit generated cards before export
- 🔄 **Regeneration Options** - Make cards harder or generate more cards with one click
- 📤 **Multiple Export Formats**:
  - CSV for manual import
  - Direct push to Anki via AnkiConnect
- 🎨 **Vintage Aesthetic** - Beautiful, classic UI with serif typography and warm color palette

## Prerequisites

- Node.js 18+ and pnpm
- At least one AI provider API key (OpenAI, Anthropic, Google, or Groq)
- Anki desktop (optional, for AnkiConnect integration)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-ankify
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# Choose at least one provider
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic Workflow

1. **Enter YouTube URL** - Paste any YouTube video URL with captions
2. **Select AI Provider** - Choose your preferred AI provider and model
3. **Choose Difficulty** - Select from three difficulty/quantity tiers:
   - **Few/Easy**: 10-15 simple recall cards
   - **Medium/Medium**: 20-30 balanced cards with application questions
   - **Many/Hard**: 40-60 comprehensive cards with deeper reasoning
4. **Fetch Transcript** - Click to retrieve the video transcript
5. **Generate Cards** - AI generates flashcards based on your settings
6. **Review & Edit** - Preview, edit, or delete individual cards
7. **Export** - Choose your preferred export method:
   - Download CSV file
   - Send directly to Anki (requires AnkiConnect)

### Regeneration Options

While reviewing cards, you can:
- **Make Harder** - Regenerate with increased difficulty level
- **Generate More** - Regenerate with 50% more cards at the same difficulty

### AnkiConnect Setup

To use the direct Anki integration:

1. Install [Anki](https://apps.ankiweb.net/)
2. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on
3. Restart Anki
4. Keep Anki running while using the "Send to Anki" feature

## Project Structure

```
youtube-ankify/
├── app/
│   ├── api/                    # API routes
│   │   ├── transcript/         # Transcript fetching
│   │   ├── generate-cards/     # AI card generation
│   │   ├── export-csv/         # CSV export
│   │   └── anki-connect/       # AnkiConnect integration
│   ├── globals.css             # Global styles (vintage aesthetic)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/
│   └── YouTubeAnkifyApp.tsx    # Main application component
├── lib/
│   ├── ai.ts                   # AI provider configuration
│   ├── anki.ts                 # Anki export utilities
│   ├── flashcards.ts           # Card generation logic
│   ├── transcript.ts           # Transcript fetching
│   ├── types.ts                # TypeScript types & Zod schemas
│   └── youtube.ts              # YouTube URL parsing
└── types/
    └── anki-apkg-export.d.ts   # Type definitions
```

## AI Providers

### OpenAI
- Models: GPT-5.4, GPT-5.1, GPT-5.1 Codex
- Best for: Balanced quality and speed

### Anthropic
- Models: Claude Opus 4.6, Claude Sonnet 4.6
- Best for: Nuanced understanding and detailed cards

### Google
- Models: Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro
- Best for: Fast generation with good quality

### Groq
- Models: Llama 3.3 70B Versatile, Llama 3.1 8B Instant, GPT-OSS 120B, GPT-OSS 20B
- Best for: Very fast generation with open-source models

## Card Quality Features

The AI generation includes several quality guardrails:
- One concept per card (atomic knowledge)
- Specific, unambiguous questions
- No vague pronouns without context
- Deduplication of similar cards
- Mix of Basic and Cloze card types
- Source timestamp tracking (optional)

## Troubleshooting

### "No transcript available"
- Ensure the video has captions enabled
- Try a different video with auto-generated or manual captions

### "API key not found"
- Check that your `.env.local` file exists and contains valid API keys
- Restart the development server after adding keys

### AnkiConnect not connecting
- Ensure Anki desktop is running
- Verify AnkiConnect add-on is installed
- Check that Anki is not blocking the connection (firewall settings)

### Cards not generating
- Verify your API key is valid and has credits
- Check the browser console for detailed error messages
- Try a different AI provider/model

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with vintage aesthetic
- **Vercel AI SDK** - Multi-provider AI integration
- **Zod** - Schema validation
- **youtube-transcript-plus** - Reliable YouTube transcript extraction
- **Phosphor Icons** - Icon library

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
