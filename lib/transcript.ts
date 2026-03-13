import { YoutubeTranscript } from "youtube-transcript-plus";
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

    try {
        const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcriptData || transcriptData.length === 0) {
            throw new TranscriptError(
                "No transcript available for this video. Please try a different video with captions enabled.",
                "NO_TRANSCRIPT",
                videoId,
            );
        }

        const decodeHtmlEntities = (text: string): string => {
            return text
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&#x27;/g, "'")
                .replace(/&apos;/g, "'");
        };

        const segments: TranscriptSegment[] = transcriptData.map((item) => ({
            text: decodeHtmlEntities(item.text),
            offset: item.offset / 1000,
            duration: item.duration ? item.duration / 1000 : 0,
        }));

        const fullText = segments.map((s) => s.text).join(" ");

        return {
            videoId,
            language: "auto",
            segments,
            fullText,
        };
    } catch (error: unknown) {
        if (error instanceof TranscriptError) {
            throw error;
        }

        const errorMessage =
            error instanceof Error ? error.message : String(error);

        if (
            errorMessage.includes("Could not find captions") ||
            errorMessage.includes("Transcript is disabled") ||
            errorMessage.includes("No transcripts") ||
            errorMessage.includes("transcripts are disabled")
        ) {
            throw new TranscriptError(
                "No captions available for this video. The video owner may have disabled captions. Try a different video.",
                "NO_TRANSCRIPT",
                videoId,
            );
        }

        if (
            errorMessage.includes("rate limit") ||
            errorMessage.includes("429") ||
            errorMessage.includes("Too Many Requests")
        ) {
            throw new TranscriptError(
                "Rate limit exceeded. Please try again in a few moments.",
                "RATE_LIMIT",
                videoId,
            );
        }

        if (
            errorMessage.includes("Video unavailable") ||
            errorMessage.includes("private video") ||
            errorMessage.includes("not available") ||
            errorMessage.includes("This video is unavailable")
        ) {
            throw new TranscriptError(
                "This video is unavailable, private, or restricted. Please try a different public video.",
                "NO_TRANSCRIPT",
                videoId,
            );
        }

        if (
            errorMessage.includes("400") ||
            errorMessage.includes("Precondition check failed") ||
            errorMessage.includes("FAILED_PRECONDITION")
        ) {
            throw new TranscriptError(
                "YouTube is blocking transcript access for this video. This may be due to regional restrictions, age restrictions, or YouTube's anti-bot measures. Try a different video or try again later.",
                "FETCH_FAILED",
                videoId,
            );
        }

        throw new TranscriptError(
            `Failed to fetch transcript: ${errorMessage}. This may be a temporary YouTube API issue.`,
            "FETCH_FAILED",
            videoId,
        );
    }
}
