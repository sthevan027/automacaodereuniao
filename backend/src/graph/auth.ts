import { ConfidentialClientApplication } from "@azure/msal-node";
import { getEnv } from "../config/env";

const env = getEnv();

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}`,
    clientSecret: env.AZURE_CLIENT_SECRET
  }
});

let cached: { token: string; expiresAtMs: number } | null = null;

export async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAtMs - now > 60_000) return cached.token;

  const res = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"]
  });
  if (!res?.accessToken || !res.expiresOn) {
    throw new Error("Falha ao obter token do Microsoft Graph");
  }

  cached = { token: res.accessToken, expiresAtMs: res.expiresOn.getTime() };
  return cached.token;
}

