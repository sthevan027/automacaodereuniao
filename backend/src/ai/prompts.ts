export function buildMeetingPrompt(input: {
  subject?: string | null;
  organizerEmail?: string | null;
  participants?: Array<{ name?: string; email?: string }> | null;
  transcript?: string | null;
  teamsSummary?: string | null;
}): string {
  const participants = (input.participants ?? [])
    .map((p) => `${p.name ?? "?"} <${p.email ?? "?"}>`)
    .join("\n");

  return [
    "Você é um analista de reuniões. Extraia informações úteis de forma",
    "objetiva e acionável. Responda APENAS em JSON válido.",
    "",
    "Contexto:",
    `- Assunto: ${input.subject ?? ""}`,
    `- Organizador: ${input.organizerEmail ?? ""}`,
    input.participants?.length ? `- Participantes:\n${participants}` : "",
    input.teamsSummary ? `\nResumo do Teams (se houver):\n${input.teamsSummary}` : "",
    input.transcript ? `\nTranscrição (se houver):\n${input.transcript}` : "",
    "",
    "Retorne JSON com o seguinte formato:",
    "{",
    '  "ai_summary": "string (5-10 linhas)",',
    '  "topics": ["string", "..."],',
    '  "action_items": [',
    "    {",
    '      "description": "string",',
    '      "owner": "string | null",',
    '      "deadline": "string | null (ISO 8601 se possível)"',
    "    }",
    "  ]",
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}

