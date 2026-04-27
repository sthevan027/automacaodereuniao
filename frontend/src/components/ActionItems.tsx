import type { ActionItem } from "../api/types";

export function ActionItems(props: { items?: unknown }) {
  const items = Array.isArray(props.items) ? (props.items as ActionItem[]) : [];
  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Nenhum action item encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
        Action items
      </div>
      <ul className="divide-y divide-slate-200">
        {items.map((it, idx) => (
          <li key={`${it.description}-${idx}`} className="px-4 py-3">
            <div className="text-sm font-medium text-slate-900">
              {it.description}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
              {it.owner ? <span>Responsável: {it.owner}</span> : null}
              {it.deadline ? <span>Prazo: {it.deadline}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

