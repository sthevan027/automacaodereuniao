import type { ApiListResponse, MeetingDetail, MeetingListItem } from "./types";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
  start?: string;
  end?: string;
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<MeetingListItem>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.start) sp.set("start", params.start);
  if (params?.end) sp.set("end", params.end);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));

  const qs = sp.toString();
  const res = await apiFetch(`/api/meetings${qs ? `?${qs}` : ""}`);
  return (await res.json()) as ApiListResponse<MeetingListItem>;
}

export async function getMeeting(id: string): Promise<MeetingDetail> {
  const res = await apiFetch(`/api/meetings/${encodeURIComponent(id)}`);
  return (await res.json()) as MeetingDetail;
}

export async function syncNow(): Promise<{
  ok: boolean;
  processed?: number;
  skipped?: number;
  error?: string;
}> {
  const res = await apiFetch("/api/sync", { method: "POST" });
  return (await res.json()) as {
    ok: boolean;
    processed?: number;
    skipped?: number;
    error?: string;
  };
}

