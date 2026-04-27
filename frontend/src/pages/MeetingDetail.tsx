import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMeeting } from "../api/client";
import type { MeetingDetail } from "../api/types";
import { ActionItems } from "../components/ActionItems";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(d);
}

export function MeetingDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meetingId = useMemo(() => (id ? String(id) : ""), [id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!meetingId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getMeeting(meetingId, { includeTranscript: true });
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Falha ao carregar reunião";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm text-zinc-300 hover:text-zinc-100"
          >
            ← Voltar
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
            Carregando…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-6 text-sm text-rose-200">
            {error}
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
            Reunião não encontrada.
          </div>
        ) : (
          <div className="space-y-6">
            <header className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="text-xs text-zinc-400">Reunião</div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                {data.subject ?? "Sem assunto"}
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span>
                  <span className="text-zinc-500">Início:</span>{" "}
                  {formatDateTime(data.start_time)}
                </span>
                <span>
                  <span className="text-zinc-500">Fim:</span>{" "}
                  {formatDateTime(data.end_time)}
                </span>
                {data.organizer_email ? (
                  <span>
                    <span className="text-zinc-500">Organizador:</span>{" "}
                    {data.organizer_email}
                  </span>
                ) : null}
              </div>
            </header>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">
                Resumo (IA)
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {data.ai_summary ?? "—"}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">
                Action items
              </h2>
              <div className="mt-3">
                <ActionItems items={data.action_items} />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Tópicos</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.topics ?? []).length ? (
                  (data.topics ?? []).map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-zinc-300">—</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">
                Participantes
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(data.participants ?? []).length ? (
                  (data.participants ?? []).map((p, idx: number) => (
                    <div
                      key={`${p.email ?? p.name ?? "p"}-${idx}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
                    >
                      <div className="font-medium text-zinc-100">
                        {p.name ?? "—"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {p.email ?? "—"}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-zinc-300">—</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">
                Transcrição
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {data.transcript ?? "—"}
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

