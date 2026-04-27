import OpenAI from "openai";
import { z } from "zod";
import { getEnv } from "../config/env";
import { buildMeetingPrompt } from "./prompts";

const env = getEnv();

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const aiOutputSchema = z.object({
  ai_summary: z.string().min(1),
  topics: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        description: z.string().min(1),
        owner: z.string().nullable().optional(),
        deadline: z.string().nullable().optional()
      })
    )
    .default([])
});

export type AiOutput = z.infer<typeof aiOutputSchema>;

function safeJsonParse(text: string): unknown {
  // tenta extrair o primeiro JSON do texto, caso o modelo escape
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = text.slice(start, end + 1);
    return JSON.parse(slice);
  }
  return JSON.parse(text);
}

export async function processMeetingWithAi(input: {
  subject?: string | null;
  organizerEmail?: string | null;
  participants?: Array<{ name?: string; email?: string }> | null;
  transcript?: string | null;
  teamsSummary?: string | null;
}): Promise<AiOutput> {
  const prompt = buildMeetingPrompt(input);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: "Responda somente com JSON válido." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  return aiOutputSchema.parse(parsed);
}

