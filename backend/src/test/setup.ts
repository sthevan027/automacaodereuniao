process.env.AZURE_CLIENT_ID ??= "test-client-id";
process.env.AZURE_CLIENT_SECRET ??= "test-client-secret";
process.env.AZURE_TENANT_ID ??= "test-tenant";

process.env.OPENAI_API_KEY ??= "test-openai-key";
process.env.OPENAI_MODEL ??= "gpt-4o-mini";

process.env.DATABASE_URL ??= "https://example.com";

process.env.BASIC_AUTH_USER ??= "admin";
process.env.BASIC_AUTH_PASS ??= "changeme";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

process.env.SYNC_CRON ??= "0 * * * *";
process.env.GRAPH_LOOKBACK_HOURS ??= "24";

