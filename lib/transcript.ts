import { Supadata } from "@supadata/js";
import { TranscriptResponse, TranscriptSegment } from "./types";
import { extractVideoId } from "./youtube";

export class TranscriptError extends Error {
    constructor(
        message: string,
        public code:
            | "INVALID_URL"
            | "NO_TRANSCRIPT"
            | "FETCH_FAILED"
            | "RATE_LIMIT",
        public videoId?: string,
    ) {
        super(message);
        this.name = "TranscriptError";
    }
}

function classifyError(error: unknown, videoId: string): TranscriptError {
    if (error instanceof TranscriptError) return error;

    const msg = error instanceof Error ? error.message : String(error);

    if (
        msg.includes("not found") ||
        msg.includes("unavailable") ||
        msg.includes("no transcript") ||
        msg.includes("disabled")
    ) {
        return new TranscriptError(
            "No captions available for this video. The video owner may have disabled captions or the video is unavailable.",
            "NO_TRANSCRIPT",
            videoId,
        );
    }

    if (msg.includes("rate limit") || msg.includes("429")) {
        return new TranscriptError(
            "Rate limit exceeded. Please try again in a few moments.",
            "RATE_LIMIT",
            videoId,
        );
    }

    return new TranscriptError(
        `Failed to fetch transcript: ${msg}.`,
        "FETCH_FAILED",
        videoId,
    );
}

export async function fetchTranscriptWithFallback(
    url: string,
): Promise<TranscriptResponse> {
    const videoId = extractVideoId(url);

    if (!videoId) {
        throw new TranscriptError(
            "Invalid YouTube URL. Please provide a valid YouTube video URL.",
            "INVALID_URL",
        );
    }

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) {
        throw new TranscriptError(
            "Supadata API key is not configured.",
            "FETCH_FAILED",
            videoId,
        );
    }

    try {
        const supadata = new Supadata({ apiKey });
        const result = await supadata.youtube.transcript({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            lang: "en",
        });

        const raw = result.content;

        if (!raw || (Array.isArray(raw) && raw.length === 0)) {
            throw new TranscriptError(
                "No transcript available for this video. Please try a different video with captions enabled.",
                "NO_TRANSCRIPT",
                videoId,
            );
        }

        let segments: TranscriptSegment[];
        let fullText: string;

        if (typeof raw === "string") {
            segments = [{ text: raw, offset: 0, duration: 0 }];
            fullText = raw;
        } else {
            segments = raw.map((item) => ({
                text: item.text,
                offset: item.offset / 1000,
                duration: item.duration ? item.duration / 1000 : 0,
            }));
            fullText = segments.map((s) => s.text).join(" ");
        }

        return {
            videoId,
            language: result.lang ?? "auto",
            segments,
            fullText,
        };
    } catch (error: unknown) {
        if (error instanceof TranscriptError) throw error;
        console.error("[transcript] supadata error:", error);
        throw classifyError(error, videoId);
    }
}
