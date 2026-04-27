import { z } from "zod";

const envSchema = z.object({
  AZURE_CLIENT_ID: z.string().min(1),
  AZURE_CLIENT_SECRET: z.string().min(1),
  AZURE_TENANT_ID: z.string().min(1),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  DATABASE_URL: z.string().url(),

  BASIC_AUTH_USER: z.string().min(1),
  BASIC_AUTH_PASS: z.string().min(1),
  FRONTEND_ORIGIN: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_TO: z.string().optional(),

  TEAMS_WEBHOOK_URL: z.string().url().optional(),

  PORT: z.coerce.number().int().positive().default(3000),
  SYNC_CRON: z.string().default("0 * * * *"),

  GRAPH_USER_ID: z.string().optional(),
  GRAPH_LOOKBACK_HOURS: z.coerce.number().int().positive().default(24)
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i: z.ZodIssue) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Env inválido:\n${issues}`);
  }
  return parsed.data;
}

