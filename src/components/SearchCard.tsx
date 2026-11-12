import type { ReactNode } from 'react';
import { BadgeCheck, MapPin, Ruler, Wallet } from 'lucide-react';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { BuyerSearch, SearchCriterion } from '../lib/api';

export function surfaceLabel(c: SearchCriterion): string {
  if (c.surface_min > 0 && c.surface_max > 0) return `${c.surface_min} à ${c.surface_max} m²`;
  if (c.surface_min > 0) return `dès ${c.surface_min} m²`;
  if (c.surface_max > 0) return `jusqu'à ${c.surface_max} m²`;
  return 'Toute surface';
}

export const budgetLabel = (n: number) => `jusqu'à ${Number(n).toLocaleString('fr-CH')} CHF`;

/** Phrase courte décrivant une recherche, pour les titres et les liens */
export function searchTitle(c: SearchCriterion): string {
  return `${PROPERTY_TYPE_LABELS[c.property_type] ?? 'Bien'} à ${c.zone}`;
}

// Fiche anonyme d'une recherche d'acheteur : aucune donnée d'identité.
export default function SearchCard({
  search,
  score,
  children,
}: {
  search: BuyerSearch;
  /** Score acheteur, affiché seulement aux vendeurs connectés */
  score?: number;
  children?: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-400">
          <BadgeCheck className="h-3.5 w-3.5" /> Acheteur qualifié
        </span>
        {search.has_pre_approval && (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
            Pré-approbation bancaire déclarée
          </span>
        )}
        {score !== undefined && (
          <span className="ml-auto text-sm font-bold text-cyan-400">{score}/100</span>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {search.criteria.map((c, i) => (
          <li key={i} className="rounded-xl bg-slate-900 p-3">
            <p className="font-semibold text-slate-100">{searchTitle(c)}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> {budgetLabel(c.budget_max)}
              </span>
              <span className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5" /> {surfaceLabel(c)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {c.zone}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {children && <div className="mt-auto pt-4">{children}</div>}
    </article>
  );
}
