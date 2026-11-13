import type { ReactNode } from 'react';
import { BadgeCheck, Building2, DoorOpen, MapPin, Ruler, Store, TrendingUp, Wallet } from 'lucide-react';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { BuyerSearch, SearchCriterion } from '../lib/api';
import { searchFeatures } from '../utils/propertyFields';
import type { FeatureKind } from '../utils/propertyFields';

const FEATURE_ICONS: Record<FeatureKind, typeof DoorOpen> = {
  rooms: DoorOpen,
  units: Building2,
  commerce: Store,
  yield: TrendingUp,
};

export function surfaceLabel(c: SearchCriterion): string {
  if (c.surface_min > 0 && c.surface_max > 0) return `${c.surface_min} à ${c.surface_max} m²`;
  if (c.surface_min > 0) return `dès ${c.surface_min} m²`;
  if (c.surface_max > 0) return `jusqu'à ${c.surface_max} m²`;
  return 'Toute surface';
}

/** Libellé du nombre de pièces, ou null si indifférent */
export function roomsLabel(min?: number | null, max?: number | null): string | null {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  const f = (n: number) => n.toLocaleString('fr-CH');
  if (lo > 0 && hi > 0) return lo === hi ? `${f(lo)} pièces` : `${f(lo)} à ${f(hi)} pièces`;
  if (lo > 0) return `dès ${f(lo)} pièces`;
  if (hi > 0) return `jusqu'à ${f(hi)} pièces`;
  return null;
}

export const budgetLabel = (n: number) => `jusqu'à ${Number(n).toLocaleString('fr-CH')} CHF`;

/** Phrase courte décrivant une recherche, pour les titres et les liens */
export function searchTitle(c: SearchCriterion): string {
  const type = PROPERTY_TYPE_LABELS[c.property_type] ?? 'Bien';
  // « dans le canton de Vaud » plutôt que « à Canton de Vaud »
  if (/^canton /i.test(c.zone)) return `${type} dans le ${c.zone.charAt(0).toLowerCase()}${c.zone.slice(1)}`;
  return `${type} à ${c.zone}`;
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
              {searchFeatures(c).map(({ kind, text }) => {
                const Icon = FEATURE_ICONS[kind];
                return (
                  <span key={kind} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {text}
                  </span>
                );
              })}
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
