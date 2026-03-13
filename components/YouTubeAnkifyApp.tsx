"use client";

import { useState, useEffect } from "react";
import {
    PlayIcon,
    SparkleIcon,
    DownloadIcon,
    ArrowsClockwiseIcon,
    CheckCircleIcon,
    WarningIcon,
} from "@phosphor-icons/react";
import {
    TranscriptResponse,
    Flashcard,
    AIProvider,
    DifficultyTier,
    DIFFICULTY_CONFIGS,
} from "@/lib/types";
import { PROVIDER_MODELS } from "@/lib/ai";

type Step = "input" | "transcript" | "cards" | "export";

export default function YouTubeAnkifyApp() {
    const [step, setStep] = useState<Step>("input");
    const [url, setUrl] = useState("");
    const [provider, setProvider] = useState<AIProvider>("groq");
    const [model, setModel] = useState("llama-3.3-70b-versatile");
    const [difficulty, setDifficulty] =
        useState<DifficultyTier>("medium-medium");
    const [transcript, setTranscript] = useState<TranscriptResponse | null>(
        null,
    );
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deckName, setDeckName] = useState("YouTube Flashcards");
    const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
    const [selectedDeck, setSelectedDeck] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [includeBasic, setIncludeBasic] = useState(true);
    const [includeCloze, setIncludeCloze] = useState(false);
    const [ankiAvailable, setAnkiAvailable] = useState<boolean | null>(null);
    const [ankiSuccess, setAnkiSuccess] = useState<string | null>(null);

    useEffect(() => {
        const check = () =>
            fetch("/api/anki-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "version" }),
            })
                .then((r) => r.json())
                .then((d) =>
                    setAnkiAvailable(d.success && d.data?.connected === true),
                )
                .catch(() => setAnkiAvailable(false));

        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleFetchTranscript = async () => {
        if (!url.trim()) {
            setError("Please enter a YouTube URL");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to fetch transcript");
            }

            setTranscript(data.data);
            setStep("transcript");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to fetch transcript",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCards = async () => {
        if (!transcript) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript,
                    provider,
                    model,
                    difficulty,
                    videoUrl: url,
                    apiKey: apiKey || undefined,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to generate cards");
            }

            const allCards = data.data.cards as Flashcard[];
            const filtered = allCards.filter(
                (c) =>
                    (c.type === "basic" && includeBasic) ||
                    (c.type === "cloze" && includeCloze),
            );
            setCards(filtered);
            setStep("cards");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to generate cards",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async (
        action:
            | "make-harder"
            | "make-easier"
            | "generate-more"
            | "generate-less",
    ) => {
        if (!transcript) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript,
                    provider,
                    model,
                    difficulty,
                    action,
                    currentDifficulty: difficulty,
                    currentCardCount: cards.length,
                    videoUrl: url,
                    apiKey: apiKey || undefined,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to regenerate cards");
            }

            const allCards = data.data.cards as Flashcard[];
            const filtered = allCards.filter(
                (c) =>
                    (c.type === "basic" && includeBasic) ||
                    (c.type === "cloze" && includeCloze),
            );
            setCards(filtered);
            if (action === "make-harder") {
                setDifficulty(
                    difficulty === "few-easy" ? "medium-medium" : "many-hard",
                );
            } else if (action === "make-easier") {
                setDifficulty(
                    difficulty === "many-hard" ? "medium-medium" : "few-easy",
                );
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to regenerate cards",
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    };

    const handleExportCSV = async () => {
        setLoading(true);
        setError(null);

        try {
            const basicCards = cards.filter((c) => c.type === "basic");
            const clozeCards = cards.filter((c) => c.type === "cloze");

            if (basicCards.length > 0) {
                const res = await fetch("/api/export-csv", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cards: basicCards }),
                });
                if (!res.ok) throw new Error("Failed to export basic cards");
                downloadBlob(await res.blob(), "basic.txt");
            }

            if (clozeCards.length > 0) {
                const res = await fetch("/api/export-csv", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cards: clozeCards }),
                });
                if (!res.ok) throw new Error("Failed to export cloze cards");
                downloadBlob(await res.blob(), "cloze.txt");
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to export CSV",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleTestAnkiConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/anki-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "version" }),
            });

            const data = await response.json();

            if (!data.success || !data.data.connected) {
                throw new Error(
                    "AnkiConnect not available. Make sure Anki is running with AnkiConnect addon installed.",
                );
            }

            const decksResponse = await fetch("/api/anki-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "deckNames" }),
            });

            const decksData = await decksResponse.json();

            if (decksData.success) {
                setAnkiDecks(decksData.data.decks);
                setStep("export");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to connect to AnkiConnect",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSendToAnki = async () => {
        if (!selectedDeck && !deckName) {
            setError("Please select or create a deck");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const targetDeck = selectedDeck || deckName;

            if (!selectedDeck && deckName) {
                await fetch("/api/anki-connect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "createDeck", deckName }),
                });
            }

            const response = await fetch("/api/anki-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "addNotes",
                    deckName: targetDeck,
                    cards,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to send cards to Anki");
            }

            const results: { success: boolean; error?: string }[] =
                data.data.results;
            const successCount = results.filter((r) => r.success).length;
            const failures = results.filter((r) => !r.success);

            if (successCount === 0 && failures.length > 0) {
                const firstError = failures[0]?.error || "Unknown error";
                throw new Error(
                    `All cards failed to add. First error: ${firstError}. Check that Anki note types "Basic" and "Cloze" exist exactly as named.`,
                );
            }

            setError(null);
            setAnkiSuccess(
                `Successfully added ${successCount} out of ${cards.length} cards to Anki!`,
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to send cards to Anki",
            );
        } finally {
            setLoading(false);
        }
    };

    const deleteCard = (index: number) => {
        setCards(cards.filter((_, i) => i !== index));
    };

    const updateCard = (index: number, field: string, value: string) => {
        const newCards = [...cards];
        const card = newCards[index];
        if (card.type === "basic" && (field === "front" || field === "back")) {
            newCards[index] = { ...card, [field]: value };
        } else if (
            card.type === "cloze" &&
            (field === "text" || field === "extra")
        ) {
            newCards[index] = { ...card, [field]: value };
        }
        setCards(newCards);
    };

    return (
        <div className="min-h-screen bg-[#F5F1E8] py-12 px-4">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="font-(family-name:--font-playfair) text-5xl font-bold text-[#1E3A5F] mb-3">
                        YouTube to Anki
                    </h1>
                    <p className="text-lg text-[#5A6F8C] italic">
                        Transform videos into high-quality flashcards
                    </p>
                </header>

                {error && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <WarningIcon
                            size={24}
                            className="text-red-600 shrink-0 mt-0.5"
                        />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {ankiSuccess && (
                    <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircleIcon
                            size={24}
                            weight="fill"
                            className="text-green-600 shrink-0 mt-0.5"
                        />
                        <p className="text-green-800">{ankiSuccess}</p>
                    </div>
                )}

                {step === "input" && (
                    <div className="bg-[#EAE6DD] rounded-lg shadow-lg p-8 border-2 border-[#D4CFC4]">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                    YouTube URL
                                </label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                        AI Provider
                                    </label>
                                    <select
                                        value={provider}
                                        onChange={(e) => {
                                            const newProvider = e.target
                                                .value as AIProvider;
                                            setProvider(newProvider);
                                            setModel(
                                                PROVIDER_MODELS[newProvider][0],
                                            );
                                        }}
                                        className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white"
                                    >
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">
                                            Anthropic
                                        </option>
                                        <option value="google">Google</option>
                                        <option value="groq">
                                            Groq (free)
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                        Model
                                    </label>
                                    <select
                                        value={model}
                                        onChange={(e) =>
                                            setModel(e.target.value)
                                        }
                                        className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white"
                                    >
                                        {PROVIDER_MODELS[provider].map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                        API Key (optional if set in .env)
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) =>
                                            setApiKey(e.target.value)
                                        }
                                        placeholder={`Enter your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key`}
                                        className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white"
                                    />
                                    <p className="text-xs text-[#5A6F8C] mt-1 italic">
                                        Never stored — sent directly to the
                                        provider
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                        Card Types
                                    </label>
                                    <div className="flex flex-col gap-2 px-4 py-3 border-2 border-[#D4CFC4] rounded-lg bg-white">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={includeBasic}
                                                onChange={(e) =>
                                                    setIncludeBasic(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="accent-[#1E5A8E] w-4 h-4"
                                            />
                                            <span className="text-sm text-[#1E3A5F]">
                                                Basic (Q&amp;A)
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={includeCloze}
                                                onChange={(e) =>
                                                    setIncludeCloze(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="accent-[#1E5A8E] w-4 h-4"
                                            />
                                            <span className="text-sm text-[#1E3A5F]">
                                                Cloze (fill-in)
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1E3A5F] mb-3">
                                    Difficulty & Quantity
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(
                                        [
                                            "few-easy",
                                            "medium-medium",
                                            "many-hard",
                                        ] as DifficultyTier[]
                                    ).map((tier) => {
                                        const config = DIFFICULTY_CONFIGS[tier];
                                        return (
                                            <button
                                                key={tier}
                                                onClick={() =>
                                                    setDifficulty(tier)
                                                }
                                                className={`p-4 rounded-lg border-2 transition-all ${
                                                    difficulty === tier
                                                        ? "border-[#1E5A8E] bg-[#1E5A8E] text-white"
                                                        : "border-[#D4CFC4] bg-white text-[#1E3A5F] hover:border-[#1E5A8E]"
                                                }`}
                                            >
                                                <div className="font-semibold mb-1">
                                                    {tier === "few-easy" &&
                                                        "Few / Easy"}
                                                    {tier === "medium-medium" &&
                                                        "Medium / Medium"}
                                                    {tier === "many-hard" &&
                                                        "Many / Hard"}
                                                </div>
                                                <div className="text-sm opacity-90">
                                                    {config.targetCount.min}-
                                                    {config.targetCount.max}{" "}
                                                    cards
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleFetchTranscript}
                                disabled={loading}
                                className="w-full bg-[#1E5A8E] text-white py-4 rounded-lg font-semibold hover:bg-[#164670] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <PlayIcon size={20} weight="fill" />
                                {loading
                                    ? "Fetching Transcript..."
                                    : "Fetch Transcript"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "transcript" && transcript && (
                    <div className="space-y-6">
                        <div className="bg-[#EAE6DD] rounded-lg shadow-lg p-8 border-2 border-[#D4CFC4]">
                            <h2 className="font-(family-name:--font-playfair) text-2xl font-bold text-[#1E3A5F] mb-4">
                                Transcript Retrieved
                            </h2>
                            <div className="bg-white rounded-lg p-4 border border-[#D4CFC4] max-h-64 overflow-y-auto mb-6">
                                <p className="text-[#1E3A5F] whitespace-pre-wrap">
                                    {transcript.fullText.substring(0, 500)}...
                                </p>
                            </div>
                            <button
                                onClick={handleGenerateCards}
                                disabled={loading}
                                className="w-full bg-[#1E5A8E] text-white py-4 rounded-lg font-semibold hover:bg-[#164670] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <SparkleIcon size={20} weight="fill" />
                                {loading
                                    ? "Generating Cards..."
                                    : "Generate Flashcards"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "cards" && cards.length > 0 && (
                    <div className="space-y-6">
                        <div className="bg-[#EAE6DD] rounded-lg shadow-lg p-8 border-2 border-[#D4CFC4]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-(family-name:--font-playfair) text-2xl font-bold text-[#1E3A5F]">
                                    Generated Cards ({cards.length})
                                </h2>
                            </div>

                            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                                {cards.map((card, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-lg p-4 border-2 border-[#D4CFC4]"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="text-xs font-semibold text-[#1E5A8E] uppercase">
                                                {card.type}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    deleteCard(index)
                                                }
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        {card.type === "basic" ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-[#5A6F8C] mb-1 block">
                                                        Front
                                                    </label>
                                                    <textarea
                                                        value={card.front}
                                                        onChange={(e) =>
                                                            updateCard(
                                                                index,
                                                                "front",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 border border-[#D4CFC4] rounded focus:border-[#1E5A8E] focus:outline-none text-sm"
                                                        rows={2}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-[#5A6F8C] mb-1 block">
                                                        Back
                                                    </label>
                                                    <textarea
                                                        value={card.back}
                                                        onChange={(e) =>
                                                            updateCard(
                                                                index,
                                                                "back",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 border border-[#D4CFC4] rounded focus:border-[#1E5A8E] focus:outline-none text-sm"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-[#5A6F8C] mb-1 block">
                                                        Text (with cloze
                                                        deletions)
                                                    </label>
                                                    <textarea
                                                        value={card.text}
                                                        onChange={(e) =>
                                                            updateCard(
                                                                index,
                                                                "text",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 border border-[#D4CFC4] rounded focus:border-[#1E5A8E] focus:outline-none text-sm font-mono"
                                                        rows={2}
                                                    />
                                                </div>
                                                {card.extra && (
                                                    <div>
                                                        <label className="text-xs font-medium text-[#5A6F8C] mb-1 block">
                                                            Extra
                                                        </label>
                                                        <textarea
                                                            value={card.extra}
                                                            onChange={(e) =>
                                                                updateCard(
                                                                    index,
                                                                    "extra",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 border border-[#D4CFC4] rounded focus:border-[#1E5A8E] focus:outline-none text-sm"
                                                            rows={1}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                        Deck Name
                                    </label>
                                    <input
                                        type="text"
                                        value={deckName}
                                        onChange={(e) =>
                                            setDeckName(e.target.value)
                                        }
                                        className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button
                                        onClick={handleExportCSV}
                                        disabled={loading}
                                        className="bg-white border-2 border-[#1E5A8E] text-[#1E5A8E] py-3 rounded-lg font-semibold hover:bg-[#1E5A8E] hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <DownloadIcon size={20} />
                                        Export file
                                        <p className="text-xs text-[#6B7280]">
                                            (Import in Anki)
                                        </p>
                                    </button>
                                    {ankiAvailable === false ? (
                                        <a
                                            href="/anki-connect"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#D4CFC4] text-[#6B7280] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 relative group"
                                        >
                                            <ArrowsClockwiseIcon size={20} />
                                            Send to Anki
                                            <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1E3A5F] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                Anki not detected — click to set
                                                up
                                            </span>
                                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                                        </a>
                                    ) : (
                                        <button
                                            onClick={handleTestAnkiConnect}
                                            disabled={
                                                loading ||
                                                ankiAvailable === null
                                            }
                                            className="bg-[#1E5A8E] text-white py-3 rounded-lg font-semibold hover:bg-[#163d66] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 relative"
                                        >
                                            <ArrowsClockwiseIcon size={20} />
                                            Send to Anki
                                            {ankiAvailable === true && (
                                                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === "export" && ankiDecks.length > 0 && (
                    <div className="bg-[#EAE6DD] rounded-lg shadow-lg p-8 border-2 border-[#D4CFC4]">
                        <h2 className="font-(family-name:--font-playfair) text-2xl font-bold text-[#1E3A5F] mb-6">
                            Send to AnkiConnect
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                                    Select Existing Deck or Create New
                                </label>
                                <select
                                    value={selectedDeck}
                                    onChange={(e) =>
                                        setSelectedDeck(e.target.value)
                                    }
                                    className="w-full px-4 py-3 border-2 border-[#D4CFC4] rounded-lg focus:border-[#1E5A8E] focus:outline-none bg-white mb-3"
                                >
                                    <option value="">
                                        Create new deck: {deckName}
                                    </option>
                                    {ankiDecks.map((deck) => (
                                        <option key={deck} value={deck}>
                                            {deck}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep("cards")}
                                    className="flex-1 bg-white border-2 border-[#D4CFC4] text-[#1E3A5F] py-3 rounded-lg font-semibold hover:border-[#1E5A8E] transition-colors"
                                >
                                    Back to Cards
                                </button>
                                <button
                                    onClick={handleSendToAnki}
                                    disabled={loading}
                                    className="flex-1 bg-[#1E5A8E] text-white py-3 rounded-lg font-semibold hover:bg-[#164670] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <CheckCircleIcon size={20} weight="fill" />
                                    {loading ? "Sending..." : "Confirm & Send"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
