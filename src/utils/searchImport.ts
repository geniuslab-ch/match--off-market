// Import de recherches d'acheteurs depuis Excel (page /buyer/import)
// Chaque ligne devient une recherche du profil acheteur connecté.
import { findType, findZone, parseNumber, readSheet } from './excel';
import type { ImportColumn, ImportedRow, TemplateSpec } from './excel';

export const SEARCH_COLUMNS: ImportColumn[] = [
  { key: 'label', header: 'Référence (privée)', width: 22, help: "Facultatif. Ex. nom du client. Visible de vous seul, jamais des vendeurs.", example: 'Client Dupont' },
  { key: 'desired_zone', header: 'Localité ou canton', width: 24, required: true, list: 'zones', help: 'Commune romande ou canton entier (« Canton de Vaud »), choisir dans la liste.', example: 'Lausanne' },
  { key: 'desired_property_type', header: 'Type de bien', width: 30, required: true, list: 'types', help: 'Choisir dans la liste.', example: 'Appartement' },
  { key: 'budget_max', header: 'Budget max (CHF)', width: 16, required: true, money: true, help: 'Prix maximum en CHF.', example: 950000 },
  { key: 'personal_contribution', header: 'Apport (CHF)', width: 14, money: true, help: "Facultatif. Vide : l'apport général du profil s'applique. 20 % du budget au moins pour les 20 points.", example: 250000 },
  { key: 'desired_surface_min_m2', header: 'Surface min (m²)', width: 12, help: 'Facultatif.', example: 70 },
  { key: 'desired_surface_max_m2', header: 'Surface max (m²)', width: 12, help: 'Facultatif.', example: 100 },
  { key: 'desired_rooms_min', header: 'Pièces min', width: 10, help: 'Facultatif. Ex. 3,5.', example: 3.5 },
  { key: 'desired_rooms_max', header: 'Pièces max', width: 10, help: 'Facultatif. Ex. 4,5.', example: 4.5 },
];

export const SEARCH_TEMPLATE: TemplateSpec = {
  filename: 'offly-modele-recherches-acheteurs.xlsx',
  sheet: 'Recherches',
  columns: SEARCH_COLUMNS,
  maxRows: 100,
  allowCantons: true,
  examples: [
    SEARCH_COLUMNS.map((c) => c.example),
    ['Client Martin', 'Canton du Valais', 'Immeuble de rendement habitation', 1000000, 300000, null, null, null, null],
  ],
  notes: [
    'Une ligne par recherche. Le financement (pré-approbation bancaire, endettement, apport général) se renseigne ensuite dans le profil acheteur.',
    'Les vendeurs ne voient jamais la référence ni l\'apport : seulement la zone, le type, la surface, les pièces et un budget arrondi.',
  ],
};

export async function parseSearchFile(file: File): Promise<ImportedRow[]> {
  return (await readSheet(file, SEARCH_TEMPLATE)).map(({ line, values }) => validateSearch(line, values));
}

function validateSearch(line: number, v: Record<string, string>): ImportedRow {
  const errors: string[] = [];

  const zone = findZone(v.desired_zone ?? '', true);
  if (!v.desired_zone) errors.push('localité ou canton manquant');
  else if (!zone) errors.push(`zone inconnue « ${v.desired_zone} » (commune romande ou canton attendu)`);

  const type = findType(v.desired_property_type ?? '');
  if (!v.desired_property_type) errors.push('type de bien manquant');
  else if (!type) errors.push(`type de bien inconnu « ${v.desired_property_type} »`);

  const budget = parseNumber(v.budget_max);
  if (budget == null) errors.push('budget manquant');
  else if (Number.isNaN(budget) || budget <= 0) errors.push(`budget invalide « ${v.budget_max} »`);

  // Champs facultatifs : nombre positif ou vide
  const optional = (key: string, label: string, max = Infinity) => {
    const n = parseNumber(v[key]);
    if (n == null) return null;
    if (Number.isNaN(n) || n < 0 || n > max) {
      errors.push(`${label} invalide « ${v[key]} »`);
      return null;
    }
    return n > 0 ? n : null;
  };
  const apport = optional('personal_contribution', 'apport');
  const smin = optional('desired_surface_min_m2', 'surface min');
  const smax = optional('desired_surface_max_m2', 'surface max');
  const rmin = optional('desired_rooms_min', 'pièces min', 50);
  const rmax = optional('desired_rooms_max', 'pièces max', 50);
  if (smin && smax && smin > smax) errors.push('surface min supérieure à la surface max');
  if (rmin && rmax && rmin > rmax) errors.push('pièces min supérieures aux pièces max');
  if (apport && budget && !Number.isNaN(budget) && apport > budget) errors.push("l'apport dépasse le budget");

  if (errors.length > 0 || !zone || !type || budget == null) {
    return { line, values: v, payload: null, errors };
  }
  return {
    line,
    values: v,
    errors,
    payload: {
      label: (v.label ?? '').trim() || null,
      desired_zone: zone,
      desired_property_type: type,
      budget_max: Math.round(budget),
      personal_contribution: apport ? Math.round(apport) : null,
      desired_surface_min_m2: smin ?? 0,
      desired_surface_max_m2: smax ?? 0,
      desired_rooms_min: rmin,
      desired_rooms_max: rmax,
    },
  };
}
