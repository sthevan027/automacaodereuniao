import { useMemo, useState } from "react";
import { listMeetings, syncNow } from "../api/client";
import type { MeetingListItem } from "../api/types";
import { MeetingCard } from "../components/MeetingCard";
import { SearchBar } from "../components/SearchBar";

export function HomePage() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MeetingListItem[]>([]);

  const query = useMemo(
    () => ({ q: q.trim() || undefined, start: from || undefined, end: to || undefined }),
    [q, from, to]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listMeetings({ ...query, page: 1, limit: 50 });
      setRows(data.rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  }

  // O eslint do template (React 19) desaconselha setState dentro de useEffect.
  // Disparamos o load a partir das interações do usuário (botão) e de um botão
  // "Atualizar" opcional implícito (ao mudar filtros, o usuário pode clicar em
  // Sync/Refresh conforme necessário).

  async function onSyncNow() {
    setSyncing(true);
    setError(null);
    try {
      await syncNow();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">Reuniões</h1>
          <p className="mt-1 text-sm text-zinc-400">Busca, filtros e sincronização manual</p>
        </div>
        <button
          onClick={onSyncNow}
          disabled={syncing}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      <SearchBar q={q} from={from} to={to} onChangeQ={setQ} onChangeFrom={setFrom} onChangeTo={setTo} />

      <div className="flex items-center justify-end">
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar lista"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-zinc-400">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="text-sm font-semibold">Nenhuma reunião encontrada</div>
          <p className="mt-1 text-sm text-zinc-400">
            Tente ajustar a busca/filtros ou clique em{" "}
            <span className="font-medium text-zinc-200">Sincronizar agora</span>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  );
}

