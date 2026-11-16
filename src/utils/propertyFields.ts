// ============================================================
// Champs propres à chaque type de bien
// ============================================================
// Un appartement se décrit en pièces, un immeuble de rendement en nombre
// d'appartements et en rendement, un immeuble mixte y ajoute ses commerces,
// un terrain se décrit par sa surface. Les formulaires (acheteur, vendeur),
// les imports Excel et les fiches s'appuient tous sur ce fichier.

import { COMMERCIAL_TYPE_LABELS } from '../types';
import type { CommercialType, PropertyType } from '../types';

import { loc, t } from '../i18n';
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
      residential: t("Surface habitable (m²)"),
      investment: t("Surface habitable totale (m²)"),
      mixed: t("Surface totale, logements et commerces (m²)"),
      land: t("Surface du terrain (m²)"),
      commercial: t("Surface du local (m²)"),
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

/** Types de commerce [clé, libellé dans la langue choisie] */
export const commercialTypes = () => Object.entries(COMMERCIAL_TYPE_LABELS) as [CommercialType, string][];

/** Rendement brut en % (état locatif annuel / prix), ou null si inconnu */
export function grossYield(annualRent: number | null | undefined, price: number | null | undefined): number | null {
  const rent = Number(annualRent) || 0;
  const p = Number(price) || 0;
  if (rent <= 0 || p <= 0) return null;
  return (rent / p) * 100;
}

export const pct = (n: number) => `${n.toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;

export type FeatureKind = 'rooms' | 'units' | 'commerce' | 'yield';

/** Détails propres au type d'une recherche, avec leur nature (pour choisir une icône) */
export function searchFeatures(c: {
  rooms_min?: number | null;
  rooms_max?: number | null;
  units_min?: number | null;
  units_max?: number | null;
  commercial_type?: string | null;
  min_yield?: number | null;
}): { kind: FeatureKind; text: string }[] {
  const out: { kind: FeatureKind; text: string | null }[] = [
    { kind: 'rooms', text: rangeLabel(c.rooms_min, c.rooms_max, t("pièce"), t("pièces")) },
    { kind: 'units', text: rangeLabel(c.units_min, c.units_max, t('appartement'), t('appartements')) },
    {
      kind: 'commerce',
      text: c.commercial_type ? t('commerce : {0}', COMMERCIAL_TYPE_LABELS[c.commercial_type as CommercialType] ?? c.commercial_type) : null,
    },
    { kind: 'yield', text: Number(c.min_yield) > 0 ? t("rendement brut dès {0}", pct(Number(c.min_yield))) : null },
  ];
  return out.filter((x): x is { kind: FeatureKind; text: string } => Boolean(x.text));
}

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
    rangeLabel(c.rooms_min, c.rooms_max, t("pièce"), t("pièces")),
    rangeLabel(c.units_min, c.units_max, t('appartement'), t('appartements')),
    c.commercial_type ? t('commerce : {0}', COMMERCIAL_TYPE_LABELS[c.commercial_type as CommercialType] ?? c.commercial_type) : null,
    Number(c.min_yield) > 0 ? t("rendement brut dès {0}", pct(Number(c.min_yield))) : null,
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
    Number(p.rooms) > 0 ? t('{0} p.', Number(p.rooms).toLocaleString(loc())) : null,
    Number(p.units_count) > 0 ? (Number(p.units_count) > 1 ? t('{0} appartements', p.units_count) : t('{0} appartement', p.units_count)) : null,
    Number(p.commercial_units) > 0 ? (Number(p.commercial_units) > 1 ? t('{0} commerces', p.commercial_units) : t('{0} commerce', p.commercial_units)) : null,
    p.commercial_type ? COMMERCIAL_TYPE_LABELS[p.commercial_type as CommercialType] ?? p.commercial_type : null,
    y !== null ? t('rendement {0}', pct(y)) : null,
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
  const f = (n: number) => n.toLocaleString(loc());
  const unit = (n: number) => (n >= 2 ? many : one);
  if (lo > 0 && hi > 0) return lo === hi ? `${f(lo)} ${unit(lo)}` : t('{0} à {1} {2}', f(lo), f(hi), many);
  if (lo > 0) return t("dès {0} {1}", f(lo), unit(lo));
  if (hi > 0) return t("jusqu'à {0} {1}", f(hi), unit(hi));
  return null;
}
