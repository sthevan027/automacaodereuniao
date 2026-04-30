import { Link } from "react-router-dom";
import type { MeetingListItem } from "../api/types";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(d);
}

function statusChip(meeting: MeetingListItem) {
  const status = meeting.status;
  switch (status) {
    case "pending_review":
      return {
        label: "Aguarda revisão",
        className:
          "border-amber-700/80 bg-amber-950/40 text-amber-100"
      };
    case "approved":
      return {
        label: "Aprovada",
        className: "border-sky-700/80 bg-sky-950/40 text-sky-100"
      };
    case "notified":
      return {
        label: "Distribuída",
        className: "border-emerald-700/80 bg-emerald-950/40 text-emerald-100"
      };
    case "rejected":
      return {
        label: "Rejeitada",
        className: "border-rose-700/80 bg-rose-950/40 text-rose-100"
      };
    case "failed":
      return {
        label: "Falhou",
        className: "border-rose-700/80 bg-rose-950/40 text-rose-100"
      };
    case "captured":
      return {
        label: "Capturando…",
        className: "border-zinc-700 bg-zinc-950 text-zinc-200"
      };
    default:
      return meeting.processed_at
        ? {
            label: "Processada",
            className: "border-zinc-700 bg-zinc-950 text-zinc-200"
          }
        : {
            label: "Pendente",
            className: "border-zinc-700 bg-zinc-950 text-zinc-200"
          };
  }
}

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const chip = statusChip(meeting);

  const preview =
    meeting.ai_summary?.trim() ||
    meeting.teams_summary?.trim() ||
    null;

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition hover:bg-zinc-950/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-zinc-100">
            {meeting.subject ?? "Reunião sem assunto"}
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {formatWhen(meeting.start_time)}{" "}
            {meeting.organizer_email ? `• ${meeting.organizer_email}` : null}
            {meeting.company?.trim() ? (
              <>
                {" "}
                • <span className="text-zinc-300">{meeting.company.trim()}</span>
              </>
            ) : null}
          </div>
        </div>
        <div
          className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${chip.className}`}
        >
          {chip.label}
        </div>
      </div>

      {preview ? (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-200">{preview}</p>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">Sem resumo ainda.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(meeting.topics ?? []).slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
