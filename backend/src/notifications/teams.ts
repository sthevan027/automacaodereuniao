import { getEnv } from "../config/env";

const env = getEnv();

export async function postTeamsWebhook(input: {
  title: string;
  summary?: string | null;
  actionItems?: Array<{ description: string; owner?: string | null; deadline?: string | null }>;
}): Promise<void> {
  if (!env.TEAMS_WEBHOOK_URL) return;

  const lines: string[] = [];
  if (input.summary) lines.push(input.summary);

  if (input.actionItems?.length) {
    lines.push("");
    lines.push("Action items:");
    for (const a of input.actionItems) {
      const owner = a.owner ? ` — ${a.owner}` : "";
      const dl = a.deadline ? ` (prazo: ${a.deadline})` : "";
      lines.push(`- ${a.description}${owner}${dl}`);
    }
  }

  const payload = {
    text: `**${input.title}**\n\n${lines.join("\n")}`.trim()
  };

  const res = await fetch(env.TEAMS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Webhook do Teams falhou (${res.status}): ${text}`);
  }
}

