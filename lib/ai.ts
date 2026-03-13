import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { AIProvider } from "./types";

export class AIProviderError extends Error {
    constructor(
        message: string,
        public provider: AIProvider,
        public code: "MISSING_KEY" | "INVALID_MODEL" | "GENERATION_FAILED",
    ) {
        super(message);
        this.name = "AIProviderError";
    }
}

export function getProviderClient(
    provider: AIProvider,
    model: string,
    apiKey?: string,
) {
    switch (provider) {
        case "openai":
            const openaiKey = apiKey || process.env.OPENAI_API_KEY;
            if (!openaiKey) {
                throw new AIProviderError(
                    "OpenAI API key not provided. Please enter your API key.",
                    "openai",
                    "MISSING_KEY",
                );
            }
            const openaiClient = createOpenAI({
                apiKey: openaiKey,
            });
            return openaiClient(model);

        case "anthropic":
            const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
            if (!anthropicKey) {
                throw new AIProviderError(
                    "Anthropic API key not provided. Please enter your API key.",
                    "anthropic",
                    "MISSING_KEY",
                );
            }
            const anthropicClient = createAnthropic({ apiKey: anthropicKey });
            return anthropicClient(model);

        case "google":
            const googleKey =
                apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!googleKey) {
                throw new AIProviderError(
                    "Google API key not provided. Please enter your API key.",
                    "google",
                    "MISSING_KEY",
                );
            }
            const googleClient = createOpenAI({
                baseURL:
                    "https://generativelanguage.googleapis.com/v1beta/openai/",
                apiKey: googleKey,
            });
            return googleClient(model);

        case "groq":
            const groqKey = apiKey || process.env.GROQ_API_KEY;
            if (!groqKey) {
                throw new AIProviderError(
                    "Groq API key not provided. Please enter your API key.",
                    "groq",
                    "MISSING_KEY",
                );
            }
            const groq = createOpenAI({
                baseURL: "https://api.groq.com/openai/v1",
                apiKey: groqKey,
            });
            return groq(model);

        default:
            throw new AIProviderError(
                `Unsupported provider: ${provider}`,
                provider,
                "INVALID_MODEL",
            );
    }
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
    openai: ["gpt-5.4", "gpt-5.1", "gpt-5.1-codex"],
    anthropic: ["claude-opus-4.6", "claude-sonnet-4.6"],
    google: [
        "gemini-3.1-pro",
        "gemini-3-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ],
    groq: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ],
};

export function getDefaultModel(provider: AIProvider): string {
    return PROVIDER_MODELS[provider][0];
}

export function isValidModel(provider: AIProvider, model: string): boolean {
    return PROVIDER_MODELS[provider].includes(model);
}
