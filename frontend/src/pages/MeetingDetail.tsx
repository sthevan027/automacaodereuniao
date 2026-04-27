import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMeeting, reviewMeeting } from "../api/client";
import type { ActionItem, MeetingDetail } from "../api/types";
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

function statusLabel(status?: string | null) {
  switch (status) {
    case "pending_review":
      return "Aguarda revisão";
    case "approved":
      return "Aprovada";
    case "notified":
      return "Distribuída";
    case "rejected":
      return "Rejeitada";
    case "failed":
      return "Falhou";
    case "captured":
      return "Capturando";
    default:
      return status ?? "—";
  }
}

function normalizeActions(items: ActionItem[] | null | undefined): ActionItem[] {
  const raw = items ?? [];
  if (!raw.length) return [{ description: "", owner: "", deadline: "" }];
  return raw.map((a) => ({
    description: a.description ?? "",
    owner: a.owner ?? "",
    deadline: a.deadline ?? ""
  }));
}

export function MeetingDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [summary, setSummary] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [actions, setActions] = useState<ActionItem[]>([{ description: "" }]);
  const [reviewedBy, setReviewedBy] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "save" | null>(null);

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

  useEffect(() => {
    if (!data) return;
    setCompany(data.company ?? "");
    setSummary(
      data.ai_summary?.trim()
        ? data.ai_summary
        : (data.teams_summary ?? "")
    );
    setTopicsText((data.topics ?? []).join("\n"));
    setActions(normalizeActions(data.action_items));
    setReviewedBy("");
  }, [data]);

  const pendingReview = data?.status === "pending_review";

  const payloadCommon = () => {
    const topics = topicsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const action_items = actions
      .filter((a) => (a.description ?? "").trim())
      .map((a) => ({
        description: (a.description ?? "").trim(),
        owner: (a.owner ?? "").trim() || null,
        deadline: (a.deadline ?? "").trim() || null
      }));
    return {
      company: company.trim() || null,
      ai_summary: summary.trim() || null,
      topics,
      action_items,
      reviewed_by: reviewedBy.trim() || undefined
    };
  };

  async function onSaveDraft() {
    if (!meetingId || !data) return;
    setBusy("save");
    setError(null);
    try {
      const updated = await reviewMeeting(meetingId, {
        action: "update",
        ...payloadCommon()
      });
      setData(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(null);
    }
  }

  async function onApprove() {
    if (!meetingId || !data) return;
    setBusy("approve");
    setError(null);
    try {
      const updated = await reviewMeeting(meetingId, {
        action: "approve",
        ...payloadCommon()
      });
      setData(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao aprovar/enviar");
    } finally {
      setBusy(null);
    }
  }

  async function onReject() {
    if (!meetingId || !data) return;
    setBusy("reject");
    setError(null);
    try {
      const updated = await reviewMeeting(meetingId, {
        action: "reject",
        reviewed_by: reviewedBy.trim() || undefined,
        ...(company.trim() !== "" ? { company: company.trim() } : {})
      });
      setData(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao rejeitar");
    } finally {
      setBusy(null);
    }
  }

  function updateAction(i: number, field: keyof ActionItem, value: string) {
    setActions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addActionRow() {
    setActions((prev) => [...prev, { description: "", owner: "", deadline: "" }]);
  }

  function removeActionRow(i: number) {
    setActions((prev) => prev.filter((_, j) => j !== i));
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="text-sm text-zinc-300 hover:text-zinc-100">
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-400">Reunião</div>
                  <h1 className="mt-2 text-xl font-semibold tracking-tight">
                    {data.subject ?? "Sem assunto"}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                    <span>
                      <span className="text-zinc-500">Status:</span>{" "}
                      {statusLabel(data.status)}
                    </span>
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
                </div>
              </div>
            </header>

            {pendingReview ? (
              <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-100">
                Esta ata aguarda revisão manual. Ajuste empresa e resumo antes de distribuir.
              </div>
            ) : null}

            {data.teams_summary?.trim() ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Notas Copilot / Teams
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {data.teams_summary}
                </p>
              </section>
            ) : null}

            {pendingReview ? (
              <section className="rounded-2xl border border-indigo-900/40 bg-indigo-950/20 p-6">
                <h2 className="text-sm font-semibold text-zinc-100">Revisão da ata</h2>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="text-zinc-400">Empresa / cliente</span>
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                      placeholder="Nome da empresa"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-zinc-400">Resumo para distribuição</span>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={8}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                      placeholder="Texto que será enviado por e-mail / webhook"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-zinc-400">Tópicos (um por linha)</span>
                    <textarea
                      value={topicsText}
                      onChange={(e) => setTopicsText(e.target.value)}
                      rows={4}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm text-zinc-400">Action items</span>
                    {actions.map((a, i) => (
                      <div
                        key={`${i}-${a.description ?? ""}`}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                      >
                        <label className="min-w-0 flex-1 text-xs">
                          Descrição
                          <input
                            value={a.description ?? ""}
                            onChange={(e) => updateAction(i, "description", e.target.value)}
                            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          />
                        </label>
                        <label className="w-full text-xs sm:w-40">
                          Responsável
                          <input
                            value={a.owner ?? ""}
                            onChange={(e) => updateAction(i, "owner", e.target.value)}
                            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          />
                        </label>
                        <label className="w-full text-xs sm:w-36">
                          Prazo
                          <input
                            value={a.deadline ?? ""}
                            onChange={(e) => updateAction(i, "deadline", e.target.value)}
                            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeActionRow(i)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addActionRow}
                      className="self-start rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                    >
                      Adicionar action item
                    </button>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="text-zinc-400">Nome do revisor (opcional)</span>
                    <input
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void onSaveDraft()}
                      className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                    >
                      {busy === "save" ? "Salvando…" : "Salvar rascunho"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void onApprove()}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy === "approve" ? "Enviando…" : "Aprovar e enviar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void onReject()}
                      className="rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950 disabled:opacity-50"
                    >
                      {busy === "reject" ? "Processando…" : "Rejeitar"}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Resumo distribuído
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                    {data.ai_summary ?? data.teams_summary ?? "—"}
                  </p>
                  {data.company?.trim() ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Empresa:{" "}
                      <span className="text-zinc-200">{data.company.trim()}</span>
                    </p>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <h2 className="text-sm font-semibold text-zinc-100">Action items</h2>
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
              </>
            )}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Participantes</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(data.participants ?? []).length ? (
                  (data.participants ?? []).map((p, idx: number) => (
                    <div
                      key={`${p.email ?? p.name ?? "p"}-${idx}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
                    >
                      <div className="font-medium text-zinc-100">{p.name ?? "—"}</div>
                      <div className="text-xs text-zinc-400">{p.email ?? "—"}</div>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-zinc-300">—</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Transcrição</h2>
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
