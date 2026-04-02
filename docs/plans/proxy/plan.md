# FEATURE: Proxy-based YouTube Transcript Fetching

## Goals
- Work around YouTube blocking data-center IPs by routing transcript requests through free proxies.
- Use `proxifly` to obtain proxies and `youtube-transcript-plus` custom fetch functions to apply them.

## Acceptance Criteria
- [x] AC1: Given the app is deployed in a data-center environment, when a transcript is requested, then `proxifly` fetches 3 HTTP proxies and the request is attempted through each in order until one succeeds.
- [x] AC2: Given the first proxy fails, when the error is caught, then the next proxy is tried automatically (up to 3 attempts).
- [x] AC3: Given all 3 proxies fail, when the last attempt errors, then a `TranscriptError` with code `FETCH_FAILED` is thrown as before.
- [x] AC4: Given a successful proxy response, when the transcript is returned, then the rest of the existing pipeline (decode, map segments, etc.) is unchanged.

## Deliverables

### 1. Install dependencies
- Add `proxifly` to `package.json` (`pnpm add proxifly`).
- Existing `youtube-transcript-plus` is already at `^2.0.0` — no change needed.

### 2. New helper: `lib/proxy.ts`
Responsible for fetching 3 proxies from Proxifly:

```ts
import Proxifly from 'proxifly';

const proxifly = new Proxifly();

export async function getFreeProxies(): Promise<string[]> {
  const proxies = await proxifly.getProxy({
    protocol: 'http',
    https: true,
    format: 'json',
    quantity: 3,
  });
  // proxifly returns array when quantity > 1
  return (Array.isArray(proxies) ? proxies : [proxies]).map(
    (p) => `http://${p.ip}:${p.port}`
  );
}
```

### 3. Update `lib/transcript.ts`
Replace the single `YoutubeTranscript.fetchTranscript(videoId)` call with a proxy-retry loop:

```
for each proxy of [proxy1, proxy2, proxy3]:
  try:
    result = await fetchTranscript(videoId, {
      videoFetch: proxyFetch(proxyUrl),
      playerFetch: proxyFetch(proxyUrl),
      transcriptFetch: proxyFetch(proxyUrl),
    })
    return mapSegments(result)
  catch err:
    if last proxy → rethrow as TranscriptError
    else → continue to next proxy
```

The `proxyFetch` factory builds a custom fetch function (matching the `videoFetch` / `playerFetch` / `transcriptFetch` signatures) that routes through the given proxy URL using a `node-fetch` + `https-proxy-agent` (or native `undici` dispatcher).

**Import**: use `fetchTranscript` named export from `youtube-transcript-plus` (the README shows both class and named-export APIs; the named export is cleaner here).

### 4. Error handling
- Preserve all existing error-message checks (`NO_TRANSCRIPT`, `RATE_LIMIT`, etc.) inside the per-proxy catch.
- Only rethrow a non-retryable `TranscriptError` (e.g. `INVALID_URL`, `NO_TRANSCRIPT`) immediately without trying further proxies.
- Retry only on network / `FETCH_FAILED` type errors.

### 5. Types / env
- No new env vars required (Proxifly works without an API key; optionally expose `PROXIFLY_API_KEY` for higher limits).
- No changes to the API route (`app/api/transcript/route.ts`) or UI.

## Implementation Order
1. `pnpm add proxifly`
2. Create `lib/proxy.ts`
3. Update `lib/transcript.ts` — replace single fetch call with proxy loop
4. Manual smoke-test: verify transcript fetches successfully through a proxy
