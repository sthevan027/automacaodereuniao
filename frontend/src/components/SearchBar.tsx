type Props = {
  q: string;
  from: string;
  to: string;
  onChangeQ: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
};

export function SearchBar({ q, from, to, onChangeQ, onChangeFrom, onChangeTo }: Props) {
  return (
    <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:grid-cols-3">
      <label className="block">
        <div className="text-xs font-medium text-zinc-300">Buscar</div>
        <input
          value={q}
          onChange={(e) => onChangeQ(e.target.value)}
          placeholder="Assunto, e-mail, resumo..."
          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
        />
      </label>

      <label className="block">
        <div className="text-xs font-medium text-zinc-300">De</div>
        <input
          value={from}
          onChange={(e) => onChangeFrom(e.target.value)}
          placeholder="2026-04-01"
          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
        />
      </label>

      <label className="block">
        <div className="text-xs font-medium text-zinc-300">Até</div>
        <input
          value={to}
          onChange={(e) => onChangeTo(e.target.value)}
          placeholder="2026-04-30"
          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
        />
      </label>
    </div>
  );
}

