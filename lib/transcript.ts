import {
    fetchTranscript,
    FetchParams,
    TranscriptConfig,
} from "youtube-transcript-plus";
import { TranscriptResponse, TranscriptSegment } from "./types";
import { extractVideoId } from "./youtube";
import { getFreeProxies } from "./proxy";

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

function classifyError(error: unknown, videoId: string): TranscriptError {
    if (error instanceof TranscriptError) return error;

    const msg = error instanceof Error ? error.message : String(error);

    if (
        msg.includes("Could not find captions") ||
        msg.includes("Transcript is disabled") ||
        msg.includes("No transcripts") ||
        msg.includes("transcripts are disabled")
    ) {
        return new TranscriptError(
            "No captions available for this video. The video owner may have disabled captions. Try a different video.",
            "NO_TRANSCRIPT",
            videoId,
        );
    }

    if (
        msg.includes("rate limit") ||
        msg.includes("429") ||
        msg.includes("Too Many Requests")
    ) {
        return new TranscriptError(
            "Rate limit exceeded. Please try again in a few moments.",
            "RATE_LIMIT",
            videoId,
        );
    }

    if (
        msg.includes("Video unavailable") ||
        msg.includes("private video") ||
        msg.includes("not available") ||
        msg.includes("This video is unavailable")
    ) {
        return new TranscriptError(
            "This video is unavailable, private, or restricted. Please try a different public video.",
            "NO_TRANSCRIPT",
            videoId,
        );
    }

    if (
        msg.includes("400") ||
        msg.includes("Precondition check failed") ||
        msg.includes("FAILED_PRECONDITION")
    ) {
        return new TranscriptError(
            "YouTube is blocking transcript access for this video. This may be due to regional restrictions, age restrictions, or YouTube's anti-bot measures. Try a different video or try again later.",
            "FETCH_FAILED",
            videoId,
        );
    }

    return new TranscriptError(
        `Failed to fetch transcript: ${msg}. This may be a temporary YouTube API issue.`,
        "FETCH_FAILED",
        videoId,
    );
}

function isRetryable(err: TranscriptError): boolean {
    return err.code === "FETCH_FAILED" || err.code === "RATE_LIMIT";
}

function buildProxyConfig(proxyUrl: string): TranscriptConfig {
    const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const { ProxyAgent, fetch: undiciFetch } = await import("undici");
        const dispatcher = new ProxyAgent(proxyUrl);
        return undiciFetch(input as Parameters<typeof undiciFetch>[0], {
            ...(init as object),
            dispatcher,
        }) as unknown as Response;
    };

    return {
        videoFetch: (p: FetchParams) =>
            proxyFetch(p.url, {
                headers: {
                    ...(p.lang ? { "Accept-Language": p.lang } : {}),
                    ...(p.userAgent ? { "User-Agent": p.userAgent } : {}),
                },
            }),
        playerFetch: (p: FetchParams) =>
            proxyFetch(p.url, {
                method: p.method,
                headers: {
                    ...(p.lang ? { "Accept-Language": p.lang } : {}),
                    ...(p.userAgent ? { "User-Agent": p.userAgent } : {}),
                    ...p.headers,
                },
                body: p.body as BodyInit,
            }),
        transcriptFetch: (p: FetchParams) =>
            proxyFetch(p.url, {
                headers: {
                    ...(p.lang ? { "Accept-Language": p.lang } : {}),
                    ...(p.userAgent ? { "User-Agent": p.userAgent } : {}),
                },
            }),
    };
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

    let proxies: string[] = [];
    try {
        proxies = await getFreeProxies();
    } catch {
        // If proxy fetch fails, fall through with empty list (direct attempt)
    }

    const attempts = proxies.length > 0 ? proxies : [null];
    let lastError: TranscriptError | null = null;

    for (let i = 0; i < attempts.length; i++) {
        const proxyUrl = attempts[i];

        try {
            const transcriptData = await (proxyUrl !== null
                ? fetchTranscript(videoId, {
                      lang: "en",
                      ...buildProxyConfig(proxyUrl),
                  })
                : fetchTranscript(videoId, { lang: "en" }));

            if (!transcriptData || transcriptData.length === 0) {
                throw new TranscriptError(
                    "No transcript available for this video. Please try a different video with captions enabled.",
                    "NO_TRANSCRIPT",
                    videoId,
                );
            }

            const segments: TranscriptSegment[] = transcriptData.map(
                (item) => ({
                    text: decodeHtmlEntities(item.text),
                    offset: item.offset / 1000,
                    duration: item.duration ? item.duration / 1000 : 0,
                }),
            );

            const fullText = segments.map((s) => s.text).join(" ");

            return {
                videoId,
                language: "auto",
                segments,
                fullText,
            };
        } catch (error: unknown) {
            const classified = classifyError(error, videoId);

            if (!isRetryable(classified)) {
                throw classified;
            }

            lastError = classified;
        }
    }

    throw (
        lastError ??
        new TranscriptError(
            "Failed to fetch transcript after all proxy attempts.",
            "FETCH_FAILED",
            videoId,
        )
    );
}
