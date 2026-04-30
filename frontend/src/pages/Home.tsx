import { useMemo, useState } from "react";
import { listMeetings, syncNow } from "../api/client";
import type { MeetingListItem } from "../api/types";
import { MeetingCard } from "../components/MeetingCard";
import { SearchBar } from "../components/SearchBar";

export function HomePage() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MeetingListItem[]>([]);

  const query = useMemo(
    () => ({
      q: q.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      company: company.trim() || undefined,
      status: status.trim() || undefined
    }),
    [q, from, to, company, status]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listMeetings({ ...query, page: 1, pageSize: 50 });
      setRows(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  }

  async function onSyncNow() {
    setSyncing(true);
    setError(null);
    try {
      const r = await syncNow();
      if ("error" in r) throw new Error(r.error);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending_review").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">Reuniões</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Busca, empresa, status e revisão antes da distribuição
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
        >
          {loading ? "Carregando…" : "Carregar lista"}
        </button>
        <button
          type="button"
          onClick={() => void onSyncNow()}
          disabled={syncing}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      <SearchBar q={q} from={from} to={to} onChangeQ={setQ} onChangeFrom={setFrom} onChangeTo={setTo} />

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Empresa / cliente
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-56 max-w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Filtrar por nome"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-56 max-w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todos</option>
            <option value="pending_review">Aguarda revisão</option>
            <option value="approved">Aprovada</option>
            <option value="notified">Distribuída</option>
            <option value="rejected">Rejeitada</option>
            <option value="failed">Falhou</option>
            <option value="captured">Capturando</option>
          </select>
        </label>
      </div>

      {pendingCount > 0 ? (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {pendingCount} reunião(ões) aguardando revisão nesta lista.
        </div>
      ) : null}

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
            Clique em <span className="font-medium text-zinc-200">Carregar lista</span> ou ajuste
            filtros / <span className="font-medium text-zinc-200">Sincronizar agora</span>.
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
