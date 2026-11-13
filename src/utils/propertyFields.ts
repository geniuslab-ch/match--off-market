// ============================================================
// Champs propres à chaque type de bien
// ============================================================
// Un appartement se décrit en pièces, un immeuble de rendement en nombre
// d'appartements et en rendement, un immeuble mixte y ajoute ses commerces,
// un terrain se décrit par sa surface. Les formulaires (acheteur, vendeur),
// les imports Excel et les fiches s'appuient tous sur ce fichier.

import { COMMERCIAL_TYPE_LABELS } from '../types';
import type { CommercialType, PropertyType } from '../types';

export type FieldSet = 'residential' | 'investment' | 'mixed' | 'land' | 'commercial';

export function fieldSetOf(type: PropertyType | string): FieldSet {
  switch (type) {
    case 'investment_building':
      return 'investment';
    case 'investment_mixed':
      return 'mixed';
    case 'land':
      return 'land';
    case 'commercial':
      return 'commercial';
    default:
      return 'residential';
  }
}

export interface FieldRules {
  /** Libellé de la surface */
  surfaceLabel: string;
  /** Nombre de pièces (logements) */
  rooms: boolean;
  /** Nombre d'appartements (immeubles) */
  units: boolean;
  /** Type de commerce ou de local */
  commercialType: boolean;
  /** Nombre de surfaces commerciales (immeuble mixte) */
  commercialUnits: boolean;
  /** Rendement brut (état locatif) */
  yield: boolean;
  /** Étage (appartements) et type de maison */
  floor: boolean;
  houseType: boolean;
}

export function fieldRules(type: PropertyType | string): FieldRules {
  const set = fieldSetOf(type);
  return {
    surfaceLabel: {
      residential: 'Surface habitable (m²)',
      investment: 'Surface habitable totale (m²)',
      mixed: 'Surface totale, logements et commerces (m²)',
      land: 'Surface du terrain (m²)',
      commercial: 'Surface du local (m²)',
    }[set],
    rooms: set === 'residential',
    units: set === 'investment' || set === 'mixed',
    commercialType: set === 'mixed' || set === 'commercial',
    commercialUnits: set === 'mixed',
    yield: set === 'investment' || set === 'mixed' || set === 'commercial',
    floor: type === 'apartment' || type === 'apartment_ppe',
    houseType: type === 'house' || type === 'detached_house' || type === 'villa',
  };
}

export const COMMERCIAL_TYPES = Object.entries(COMMERCIAL_TYPE_LABELS) as [CommercialType, string][];

/** Rendement brut en % (état locatif annuel / prix), ou null si inconnu */
export function grossYield(annualRent: number | null | undefined, price: number | null | undefined): number | null {
  const rent = Number(annualRent) || 0;
  const p = Number(price) || 0;
  if (rent <= 0 || p <= 0) return null;
  return (rent / p) * 100;
}

export const pct = (n: number) => `${n.toLocaleString('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;

/** Détails propres au type, pour une recherche (pièces, appartements, commerce, rendement) */
export function searchFeatureLabels(c: {
  rooms_min?: number | null;
  rooms_max?: number | null;
  units_min?: number | null;
  units_max?: number | null;
  commercial_type?: string | null;
  min_yield?: number | null;
}): string[] {
  const out: (string | null)[] = [
    rangeLabel(c.rooms_min, c.rooms_max, 'pièce', 'pièces'),
    rangeLabel(c.units_min, c.units_max, 'appartement', 'appartements'),
    c.commercial_type ? `commerce : ${COMMERCIAL_TYPE_LABELS[c.commercial_type as CommercialType] ?? c.commercial_type}` : null,
    Number(c.min_yield) > 0 ? `rendement brut dès ${pct(Number(c.min_yield))}` : null,
  ];
  return out.filter((x): x is string => Boolean(x));
}

/** Détails propres au type, pour un bien */
export function propertyFeatureLabels(p: {
  rooms?: number | null;
  units_count?: number | null;
  commercial_units?: number | null;
  commercial_type?: string | null;
  annual_rent?: number | null;
  price?: number | null;
}): string[] {
  const y = grossYield(p.annual_rent, p.price);
  const out: (string | null)[] = [
    Number(p.rooms) > 0 ? `${Number(p.rooms).toLocaleString('fr-CH')} p.` : null,
    Number(p.units_count) > 0 ? `${p.units_count} appartement${Number(p.units_count) > 1 ? 's' : ''}` : null,
    Number(p.commercial_units) > 0 ? `${p.commercial_units} commerce${Number(p.commercial_units) > 1 ? 's' : ''}` : null,
    p.commercial_type ? COMMERCIAL_TYPE_LABELS[p.commercial_type as CommercialType] ?? p.commercial_type : null,
    y !== null ? `rendement ${pct(y)}` : null,
  ];
  return out.filter((x): x is string => Boolean(x));
}

/** Libellé d'une fourchette de nombres (pièces, appartements) ou null si indifférent */
export function rangeLabel(
  min: number | null | undefined,
  max: number | null | undefined,
  one: string,
  many: string,
): string | null {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  const f = (n: number) => n.toLocaleString('fr-CH');
  const unit = (n: number) => (n >= 2 ? many : one);
  if (lo > 0 && hi > 0) return lo === hi ? `${f(lo)} ${unit(lo)}` : `${f(lo)} à ${f(hi)} ${many}`;
  if (lo > 0) return `dès ${f(lo)} ${unit(lo)}`;
  if (hi > 0) return `jusqu'à ${f(hi)} ${unit(hi)}`;
  return null;
}
