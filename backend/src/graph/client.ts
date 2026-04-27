import { getGraphAccessToken } from "./auth";

export async function graphGet<T>(url: string): Promise<T> {
  const token = await getGraphAccessToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph GET falhou (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export async function graphGetText(url: string): Promise<string> {
  const token = await getGraphAccessToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph GET (text) falhou (${res.status}): ${text}`);
  }
  return await res.text();
}

