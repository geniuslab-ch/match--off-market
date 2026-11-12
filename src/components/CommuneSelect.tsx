import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { CANTONS, ROMANDIE_COMMUNES } from '../data/romandieCommunes';

// Champ de recherche d'une localité de Suisse romande.
// Si la localité n'est pas dans la liste, on peut la saisir telle quelle.
export default function CommuneSelect({
  value,
  onChange,
  allowCantons = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Propose aussi « tout le canton » (recherche d'acheteur), pas pour situer un bien */
  allowCantons?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return ROMANDIE_COMMUNES;
    const s = search.toLowerCase();
    return ROMANDIE_COMMUNES.filter((c) => c.toLowerCase().includes(s));
  }, [search]);

  const cantons = useMemo(() => {
    if (!allowCantons) return [];
    const s = search.toLowerCase();
    return CANTONS.filter((c) => !s || c.label.toLowerCase().includes(s)).map((c) => c.label);
  }, [allowCantons, search]);

  const typed = search.trim();
  const canUseTyped =
    typed.length >= 2 && !ROMANDIE_COMMUNES.some((c) => c.toLowerCase() === typed.toLowerCase());

  function choose(commune: string) {
    onChange(commune);
    setSearch('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <div
        className="flex w-full cursor-pointer items-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus-within:border-cyan-500"
        onClick={() => setOpen(!open)}
      >
        <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="text"
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch('');
          }}
          placeholder="Rechercher une localité..."
          aria-label="Localité"
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
          {cantons.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tout un canton
              </p>
              {cantons.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-800 ${
                    label === value ? 'bg-cyan-950 text-cyan-400' : 'text-slate-200'
                  }`}
                  onClick={() => choose(label)}
                >
                  {label}
                </button>
              ))}
              <p className="border-t border-slate-700 px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Une localité
              </p>
            </>
          )}
          {filtered.map((commune) => (
            <button
              key={commune}
              type="button"
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-800 ${
                commune === value ? 'bg-cyan-950 text-cyan-400' : 'text-slate-300'
              }`}
              onClick={() => choose(commune)}
            >
              {commune}
            </button>
          ))}
          {canUseTyped && (
            <button
              type="button"
              className="w-full border-t border-slate-700 px-4 py-2 text-left text-sm text-cyan-400 hover:bg-slate-800"
              onClick={() => choose(typed)}
            >
              Utiliser « {typed} »
            </button>
          )}
          {filtered.length === 0 && cantons.length === 0 && !canUseTyped && (
            <div className="px-4 py-3 text-sm text-slate-500">Aucune localité trouvée</div>
          )}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setSearch('');
          }}
        />
      )}
    </div>
  );
}
