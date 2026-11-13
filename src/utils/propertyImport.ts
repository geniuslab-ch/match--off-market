// Import de biens à vendre depuis Excel (page /seller/import)
import { calculateSellerScore } from './matching';
import { findCommerce, findCommune, findType, parseNumber, parseYesNo, readSheet } from './excel';
import { fieldRules } from './propertyFields';
import type { ImportColumn, ImportedRow, TemplateSpec } from './excel';

export const PROPERTY_COLUMNS: ImportColumn[] = [
  { key: 'title', header: 'Titre', width: 34, required: true, help: 'Titre court du bien.', example: 'Appartement lumineux avec balcon' },
  { key: 'property_type', header: 'Type de bien', width: 30, required: true, list: 'types', help: 'Choisir dans la liste.', example: 'Appartement en PPE' },
  { key: 'zone', header: 'Localité', width: 24, required: true, list: 'zones', help: 'Commune romande, choisir dans la liste.', example: 'Lausanne' },
  { key: 'price', header: 'Prix (CHF)', width: 14, required: true, money: true, help: 'Prix de vente en CHF, sans décimales.', example: 890000 },
  { key: 'surface_m2', header: 'Surface (m²)', width: 13, required: true, help: 'Surface habitable en m².', example: 82 },
  { key: 'rooms', header: 'Pièces', width: 9, help: 'Logements (appartement, maison, villa). Facultatif. Ex. 3,5.', example: 3.5 },
  { key: 'units_count', header: "Nombre d'appartements", width: 14, help: 'Immeubles de rendement. Facultatif.', example: null },
  { key: 'commercial_units', header: 'Surfaces commerciales', width: 13, help: 'Immeuble de rendement mixte. Facultatif.', example: null },
  { key: 'commercial_type', header: 'Type de commerce', width: 16, list: 'commerce', help: 'Immeuble mixte ou local commercial. Choisir dans la liste. Facultatif.', example: null },
  { key: 'annual_rent', header: 'État locatif annuel (CHF)', width: 16, money: true, help: 'Loyers annuels hors charges (immeubles, commercial). Sert au rendement brut. Facultatif.', example: null },
  { key: 'description', header: 'Description', width: 44, help: 'Facultatif. Visible des acheteurs qualifiés.', example: 'Dernier étage, vue lac, rénové en 2021.' },
  { key: 'urgency_level', header: 'Urgence de vente (1-5)', width: 12, scale: true, help: 'Facultatif, 3 par défaut. 5 = vente très urgente.', example: 3 },
  { key: 'listing_age_days', header: 'En vente depuis (jours)', width: 12, help: 'Facultatif, 0 par défaut.', example: 30 },
  { key: 'is_conditional_sale', header: 'Vente conditionnelle (oui/non)', width: 14, list: 'yesno', help: "Facultatif, « non » par défaut. Oui si la vente dépend d'une condition.", example: 'non' },
  { key: 'conditional_sale_details', header: 'Détails de la condition', width: 30, help: 'Facultatif. Ex. « achat de notre prochain logement ».', example: null },
  { key: 'rarity_score', header: 'Rareté (1-5)', width: 10, scale: true, help: 'Facultatif, 3 par défaut. 5 = bien très rare.', example: 4 },
];

export const PROPERTY_TEMPLATE: TemplateSpec = {
  filename: 'offly-modele-biens-a-vendre.xlsx',
  sheet: 'Biens',
  columns: PROPERTY_COLUMNS,
  maxRows: 300,
  examples: [
    PROPERTY_COLUMNS.map((c) => c.example),
    ['Villa familiale avec jardin', 'Villa', 'Pully', 1950000, 190, 6.5, null, null, null, null, 'Calme, proche des écoles.', 4, 90, 'oui', "Achat d'un autre bien en cours", 5],
    ['Immeuble mixte au centre', 'Immeuble de rendement mixte', 'Sion', 2400000, 520, null, 6, 1, 'Commerce', 118000, 'Entièrement loué.', 3, 0, 'non', null, 4],
  ],
  notes: [
    'Une ligne par bien. Les biens importés sont actifs tout de suite et visibles des acheteurs qualifiés dont la recherche correspond.',
    "Les colonnes qui ne concernent pas le type de bien sont ignorées (ex. pièces pour un immeuble, nombre d'appartements pour une villa).",
  ],
};

export async function parsePropertyFile(file: File): Promise<ImportedRow[]> {
  return (await readSheet(file, PROPERTY_TEMPLATE)).map(({ line, values }) => validateProperty(line, values));
}

function validateProperty(line: number, v: Record<string, string>): ImportedRow {
  const errors: string[] = [];

  const title = (v.title ?? '').trim();
  if (!title) errors.push('titre manquant');

  const type = findType(v.property_type ?? '');
  if (!v.property_type) errors.push('type de bien manquant');
  else if (!type) errors.push(`type de bien inconnu « ${v.property_type} »`);

  const zone = findCommune(v.zone ?? '');
  if (!v.zone) errors.push('localité manquante');
  else if (!zone) errors.push(`localité inconnue « ${v.zone} » (commune romande attendue)`);

  const price = parseNumber(v.price);
  if (price == null) errors.push('prix manquant');
  else if (Number.isNaN(price) || price <= 0) errors.push(`prix invalide « ${v.price} »`);

  const surface = parseNumber(v.surface_m2);
  if (surface == null) errors.push('surface manquante');
  else if (Number.isNaN(surface) || surface <= 0) errors.push(`surface invalide « ${v.surface_m2} »`);

  // Champs propres au type : ignorés s'ils ne le concernent pas
  const rules = fieldRules(type ?? 'apartment');
  const count = (key: string, label: string, applies: boolean, max: number) => {
    const n = parseNumber(v[key]);
    if (!applies || n == null) return null;
    if (Number.isNaN(n) || n <= 0 || n > max) {
      errors.push(`${label} invalide « ${v[key]} »`);
      return null;
    }
    return n;
  };
  const rooms = count('rooms', 'pièces', rules.rooms, 50);
  const units = count('units_count', "nombre d'appartements", rules.units, 1000);
  const commercialUnits = count('commercial_units', 'surfaces commerciales', rules.commercialUnits, 1000);
  const rent = count('annual_rent', 'état locatif', rules.yield, 1e9);
  let commerce: string | null = null;
  if (rules.commercialType && (v.commercial_type ?? '') !== '') {
    commerce = findCommerce(v.commercial_type);
    if (!commerce) errors.push(`type de commerce inconnu « ${v.commercial_type} »`);
  }

  const scale = (key: string, label: string) => {
    const n = parseNumber(v[key]);
    if (n == null) return 3;
    if (Number.isNaN(n) || n < 1 || n > 5) {
      errors.push(`${label} doit être entre 1 et 5`);
      return 3;
    }
    return Math.round(n);
  };
  const urgency = scale('urgency_level', 'urgence');
  const rarity = scale('rarity_score', 'rareté');

  const age = parseNumber(v.listing_age_days);
  if (age != null && (Number.isNaN(age) || age < 0)) errors.push(`« en vente depuis » invalide « ${v.listing_age_days} »`);

  const conditional = parseYesNo(v.is_conditional_sale);
  if ((v.is_conditional_sale ?? '') !== '' && conditional == null) errors.push('vente conditionnelle : oui ou non');

  if (errors.length > 0 || !type || !zone || price == null || surface == null) {
    return { line, values: v, payload: null, errors };
  }

  const payload: Record<string, unknown> = {
    title,
    description: (v.description ?? '').trim() || null,
    property_type: type,
    zone,
    price: Math.round(price),
    surface_m2: surface,
    rooms: rooms != null ? rooms : null,
    units_count: units != null ? Math.round(units) : null,
    commercial_units: commercialUnits != null ? Math.round(commercialUnits) : null,
    commercial_type: commerce,
    annual_rent: rent != null ? Math.round(rent) : null,
    urgency_level: urgency,
    listing_age_days: age != null ? Math.round(age) : 0,
    is_conditional_sale: Boolean(conditional),
    conditional_sale_details: conditional ? (v.conditional_sale_details ?? '').trim() || null : null,
    rarity_score: rarity,
    is_active: true,
  };
  payload.score = calculateSellerScore(payload as never);
  return { line, values: v, payload, errors };
}
