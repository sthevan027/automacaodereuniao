import type { ApiListResponse, MeetingDetail, MeetingListItem } from "./types";

function getBasicAuthHeader() {
  const user = import.meta.env.VITE_BASIC_AUTH_USER as string | undefined;
  const pass = import.meta.env.VITE_BASIC_AUTH_PASS as string | undefined;
  if (!user || !pass) return undefined;
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

async function apiFetch(path: string, init?: RequestInit) {
  const auth = getBasicAuthHeader();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

export async function listMeetings(params?: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiListResponse<MeetingListItem>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));

  const qs = sp.toString();
  const res = await apiFetch(`/api/meetings${qs ? `?${qs}` : ""}`);
  return (await res.json()) as ApiListResponse<MeetingListItem>;
}

export async function getMeeting(
  id: string,
  opts?: { includeTranscript?: boolean }
): Promise<MeetingDetail> {
  const sp = new URLSearchParams();
  if (opts?.includeTranscript) sp.set("includeTranscript", "1");
  const qs = sp.toString();
  const res = await apiFetch(
    `/api/meetings/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`
  );
  return (await res.json()) as MeetingDetail;
}

export async function syncNow(): Promise<
  | { startedAt: string; processedCount: number; skippedCount: number }
  | { startedAt: string; error: string }
> {
  const res = await apiFetch("/api/sync", { method: "POST" });
  return (await res.json()) as
    | { startedAt: string; processedCount: number; skippedCount: number }
    | { startedAt: string; error: string };
}

