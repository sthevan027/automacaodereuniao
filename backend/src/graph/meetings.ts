import { getEnv } from "../config/env";
import { graphGet, graphGetText } from "./client";
import type { GraphListResponse, GraphOnlineMeeting, GraphTranscript } from "./types";

const env = getEnv();

function toDateMaybe(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listRecentOnlineMeetings(params?: {
  userId?: string;
  lookbackHours?: number;
}): Promise<GraphOnlineMeeting[]> {
  const userId = params?.userId ?? env.GRAPH_USER_ID;
  if (!userId) {
    throw new Error(
      "GRAPH_USER_ID é obrigatório para listar reuniões em app-only"
    );
  }

  const lookbackHours = params?.lookbackHours ?? env.GRAPH_LOOKBACK_HOURS;
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const base = "https://graph.microsoft.com/v1.0";
  const select = [
    "id",
    "subject",
    "startDateTime",
    "endDateTime",
    "organizer",
    "participants"
  ].join(",");

  // Observação: filtros variam por tenant/endpoint; mantemos uma abordagem robusta.
  const url = `${base}/users/${encodeURIComponent(
    userId
  )}/onlineMeetings?$top=50&$select=${encodeURIComponent(select)}`;

  const data = await graphGet<GraphListResponse<GraphOnlineMeeting>>(url);
  const meetings = data.value ?? [];

  return meetings.filter((m) => {
    const start = toDateMaybe(m.startDateTime);
    return start ? start >= since : true;
  });
}

export async function getLatestTranscriptText(params: {
  userId?: string;
  onlineMeetingId: string;
}): Promise<string | null> {
  const userId = params.userId ?? env.GRAPH_USER_ID;
  if (!userId) return null;

  // Transcripts costumam estar no beta. Mantemos fallback suave.
  const base = "https://graph.microsoft.com/beta";
  const listUrl = `${base}/users/${encodeURIComponent(
    userId
  )}/onlineMeetings/${encodeURIComponent(params.onlineMeetingId)}/transcripts?$top=5`;

  let list: GraphListResponse<GraphTranscript>;
  try {
    list = await graphGet<GraphListResponse<GraphTranscript>>(listUrl);
  } catch {
    return null;
  }

  const transcriptId = list.value?.[0]?.id;
  if (!transcriptId) return null;

  const contentUrl = `${base}/users/${encodeURIComponent(
    userId
  )}/onlineMeetings/${encodeURIComponent(
    params.onlineMeetingId
  )}/transcripts/${encodeURIComponent(transcriptId)}/content`;

  try {
    const text = await graphGetText(contentUrl);
    return text?.trim() ? text : null;
  } catch {
    return null;
  }
}

