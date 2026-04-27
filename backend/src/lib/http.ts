export type FetchWithRetryOptions = {
  timeoutMs?: number;
  retries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  retryOnStatuses?: number[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0) return n * 1000;
  const d = new Date(v);
  const ms = d.getTime() - Date.now();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  opts?: FetchWithRetryOptions
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const retries = opts?.retries ?? 3;
  const retryBaseDelayMs = opts?.retryBaseDelayMs ?? 400;
  const retryMaxDelayMs = opts?.retryMaxDelayMs ?? 5_000;
  const retryOnStatuses = opts?.retryOnStatuses ?? [429, 500, 502, 503, 504];

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!retryOnStatuses.includes(res.status) || attempt === retries) {
        return res;
      }

      const retryAfter = parseRetryAfterMs(res.headers.get("retry-after"));
      const backoff = Math.min(
        retryMaxDelayMs,
        retryBaseDelayMs * Math.pow(2, attempt)
      );
      await sleep(retryAfter ?? backoff);
      continue;
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      const backoff = Math.min(
        retryMaxDelayMs,
        retryBaseDelayMs * Math.pow(2, attempt)
      );
      await sleep(backoff);
      continue;
    } finally {
      clearTimeout(t);
    }
  }

  throw lastErr ?? new Error("fetchWithRetry falhou");
}

