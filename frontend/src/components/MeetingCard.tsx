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

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
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
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-200">
          {meeting.processed_at ? "Processada" : "Pendente"}
        </div>
      </div>

      {meeting.ai_summary ? (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-200">
          {meeting.ai_summary}
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">Sem resumo IA ainda.</p>
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

