// ============================================================
// Import de biens depuis un fichier Excel
// ============================================================
// Le modèle (.xlsx) contient la feuille « Biens » à remplir, une feuille
// « Exemple », une feuille « Mode d'emploi » et une feuille « Listes »
// qui alimente les menus déroulants (types de bien, localités).
// La bibliothèque Excel n'est chargée qu'au moment de l'utiliser.

import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType } from '../types';
import { ROMANDIE_COMMUNES } from '../data/romandieCommunes';
import { calculateSellerScore } from './matching';

export const MAX_IMPORT_ROWS = 300;

interface Column {
  key: string;
  header: string;
  width: number;
  required?: boolean;
  help: string;
  example: string | number;
}

export const IMPORT_COLUMNS: Column[] = [
  { key: 'title', header: 'Titre', width: 34, required: true, help: 'Titre court du bien.', example: 'Appartement lumineux avec balcon' },
  { key: 'property_type', header: 'Type de bien', width: 30, required: true, help: 'Choisir dans la liste.', example: 'Appartement en PPE' },
  { key: 'zone', header: 'Localité', width: 24, required: true, help: 'Commune romande, choisir dans la liste.', example: 'Lausanne' },
  { key: 'price', header: 'Prix (CHF)', width: 14, required: true, help: 'Prix de vente en CHF, sans décimales.', example: 890000 },
  { key: 'surface_m2', header: 'Surface (m²)', width: 13, required: true, help: 'Surface habitable en m².', example: 82 },
  { key: 'rooms', header: 'Pièces', width: 9, help: 'Facultatif. Ex. 3,5.', example: 3.5 },
  { key: 'description', header: 'Description', width: 44, help: 'Facultatif. Visible des acheteurs qualifiés.', example: 'Dernier étage, vue lac, rénové en 2021.' },
  { key: 'urgency_level', header: 'Urgence de vente (1-5)', width: 12, help: 'Facultatif, 3 par défaut. 5 = vente très urgente.', example: 3 },
  { key: 'listing_age_days', header: 'En vente depuis (jours)', width: 12, help: 'Facultatif, 0 par défaut.', example: 30 },
  { key: 'is_conditional_sale', header: 'Vente conditionnelle (oui/non)', width: 14, help: 'Facultatif, « non » par défaut. Oui si la vente dépend d\'une condition.', example: 'non' },
  { key: 'conditional_sale_details', header: 'Détails de la condition', width: 30, help: 'Facultatif. Ex. « vente de notre maison actuelle ».', example: '' },
  { key: 'rarity_score', header: 'Rareté (1-5)', width: 10, help: 'Facultatif, 3 par défaut. 5 = bien très rare.', example: 4 },
];

const TYPE_ENTRIES = Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][];
const SHEET_ROWS = MAX_IMPORT_ROWS + 1;

// Texte comparable : minuscules, sans accents ni espaces superflus
export const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const COMMUNE_BY_NORM = new Map(ROMANDIE_COMMUNES.map((c) => [norm(c), c]));
const TYPE_BY_NORM = new Map<string, PropertyType>(
  TYPE_ENTRIES.flatMap(([key, label]) => [
    [norm(label), key],
    [norm(key), key],
  ]),
);
const COLUMN_BY_HEADER = new Map(IMPORT_COLUMNS.map((c) => [norm(c.header), c.key]));

// Charge exceljs en version navigateur, seulement quand on en a besoin
async function loadExcel() {
  const mod = await import('exceljs/dist/exceljs.min.js');
  return ((mod as { default?: unknown }).default ?? mod) as typeof import('exceljs');
}

function downloadBlob(data: ArrayBuffer, filename: string) {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Crée et télécharge le modèle Excel à remplir */
export async function downloadTemplate(): Promise<void> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Offly';

  const cyan = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } } as const;
  const styleHeader = (ws: import('exceljs').Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 34;
    IMPORT_COLUMNS.forEach((c, i) => {
      row.getCell(i + 1).fill = cyan;
      ws.getColumn(i + 1).width = c.width;
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  // Feuille à remplir
  const ws = wb.addWorksheet('Biens');
  ws.addRow(IMPORT_COLUMNS.map((c) => (c.required ? `${c.header} *` : c.header)));
  styleHeader(ws);

  // Exemple rempli (non importé)
  const ex = wb.addWorksheet('Exemple');
  ex.addRow(IMPORT_COLUMNS.map((c) => (c.required ? `${c.header} *` : c.header)));
  ex.addRow(IMPORT_COLUMNS.map((c) => c.example));
  ex.addRow([
    'Villa familiale avec jardin', 'Villa', 'Pully', 1950000, 190, 6.5,
    'Calme, proche des écoles.', 4, 90, 'oui', 'Achat d\'un autre bien en cours', 5,
  ]);
  styleHeader(ex);

  // Mode d'emploi
  const help = wb.addWorksheet("Mode d'emploi");
  help.columns = [{ width: 32 }, { width: 12 }, { width: 70 }];
  help.addRow(['Colonne', 'Obligatoire', 'Comment la remplir']).font = { bold: true };
  IMPORT_COLUMNS.forEach((c) => help.addRow([c.header, c.required ? 'oui' : 'non', c.help]));
  help.addRow([]);
  help.addRow(['Remplissez la feuille « Biens » : une ligne par bien, sans modifier les titres de colonnes.']);
  help.addRow([`Jusqu'à ${MAX_IMPORT_ROWS} biens par fichier. La feuille « Exemple » n'est pas importée.`]);
  help.addRow(['Les biens importés sont actifs tout de suite et visibles des acheteurs qualifiés dont la recherche correspond.']);

  // Listes des menus déroulants
  const lists = wb.addWorksheet('Listes');
  lists.columns = [{ header: 'Types de bien', width: 34 }, { header: 'Localités', width: 30 }];
  const communes = [...ROMANDIE_COMMUNES].sort((a, b) => a.localeCompare(b, 'fr'));
  const n = Math.max(TYPE_ENTRIES.length, communes.length);
  for (let i = 0; i < n; i++) lists.addRow([TYPE_ENTRIES[i]?.[1] ?? null, communes[i] ?? null]);
  lists.getRow(1).font = { bold: true };

  const typeRange = `Listes!$A$2:$A$${TYPE_ENTRIES.length + 1}`;
  const communeRange = `Listes!$B$2:$B$${communes.length + 1}`;
  // Une règle par colonne, sur toute la plage (pas de règles qui se chevauchent)
  const letter = (key: string) => String.fromCharCode(65 + IMPORT_COLUMNS.findIndex((c) => c.key === key));
  const range = (key: string) => `${letter(key)}2:${letter(key)}${SHEET_ROWS}`;
  const dv = (ws as unknown as { dataValidations: { add: (r: string, v: object) => void } }).dataValidations;
  dv.add(range('property_type'), {
    type: 'list', allowBlank: true, formulae: [typeRange],
    showErrorMessage: true, errorTitle: 'Type de bien', error: 'Choisissez un type dans la liste.',
  });
  dv.add(range('zone'), {
    type: 'list', allowBlank: true, formulae: [communeRange],
    showErrorMessage: true, errorTitle: 'Localité', error: 'Choisissez une commune romande dans la liste.',
  });
  dv.add(range('is_conditional_sale'), { type: 'list', allowBlank: true, formulae: ['"oui,non"'] });
  for (const key of ['urgency_level', 'rarity_score']) {
    dv.add(range(key), {
      type: 'whole', operator: 'between', allowBlank: true, formulae: [1, 5],
      showErrorMessage: true, error: 'Nombre entier de 1 à 5.',
    });
  }
  ws.getColumn(IMPORT_COLUMNS.findIndex((c) => c.key === 'price') + 1).numFmt = "#'##0";

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(buf as ArrayBuffer, 'offly-modele-import-biens.xlsx');
}

export interface ImportedRow {
  /** Numéro de ligne dans Excel */
  line: number;
  values: Record<string, string>;
  /** Données prêtes à enregistrer (sans seller_id), si la ligne est valide */
  payload: Record<string, unknown> | null;
  errors: string[];
}

// Valeur d'une cellule exceljs en texte (gère formules, texte riche, liens, dates)
function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return cellText(o.result);
    if ('richText' in o && Array.isArray(o.richText)) return o.richText.map((t: { text: string }) => t.text).join('');
    if ('text' in o) return String(o.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

// Nombre suisse : accepte 990'000, 990 000, 3,5 ou 3.5
function parseNumber(raw: string): number | null {
  const s = raw.replace(/[\s'’]/g, '').replace(/chf/i, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function parseYesNo(raw: string): boolean | null {
  const v = norm(raw);
  if (v === '') return null;
  if (['oui', 'o', 'yes', 'y', 'x', '1', 'vrai', 'true'].includes(v)) return true;
  if (['non', 'n', 'no', '0', 'faux', 'false'].includes(v)) return false;
  return null;
}

/** Lit le fichier et valide chaque ligne */
export async function parseImportFile(file: File): Promise<ImportedRow[]> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet('Biens') ?? wb.worksheets[0];
  if (!ws) throw new Error('Le fichier ne contient aucune feuille.');

  // Repère les colonnes par leur titre (l'ordre n'a pas d'importance)
  const keyByCol = new Map<number, string>();
  ws.getRow(1).eachCell((cell, colNumber) => {
    const key = COLUMN_BY_HEADER.get(norm(cellText(cell.value)).replace(/\s*\*$/, ''));
    if (key) keyByCol.set(colNumber, key);
  });
  const missing = IMPORT_COLUMNS.filter((c) => c.required && ![...keyByCol.values()].includes(c.key));
  if (missing.length > 0) {
    throw new Error(
      `Colonnes introuvables : ${missing.map((c) => c.header).join(', ')}. Utilisez le modèle Excel sans modifier la ligne de titres.`,
    );
  }

  const rows: ImportedRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, line) => {
    if (line === 1) return;
    const values: Record<string, string> = {};
    keyByCol.forEach((key, colNumber) => {
      values[key] = cellText(row.getCell(colNumber).value);
    });
    if (Object.values(values).every((v) => v === '')) return;
    rows.push(validateRow(line, values));
  });
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Le fichier contient ${rows.length} biens : ${MAX_IMPORT_ROWS} au maximum par import.`);
  }
  return rows;
}

function validateRow(line: number, v: Record<string, string>): ImportedRow {
  const errors: string[] = [];

  const title = (v.title ?? '').trim();
  if (!title) errors.push('titre manquant');

  const type = TYPE_BY_NORM.get(norm(v.property_type));
  if (!v.property_type) errors.push('type de bien manquant');
  else if (!type) errors.push(`type de bien inconnu « ${v.property_type} »`);

  const zone = COMMUNE_BY_NORM.get(norm(v.zone));
  if (!v.zone) errors.push('localité manquante');
  else if (!zone) errors.push(`localité inconnue « ${v.zone} » (commune romande attendue)`);

  const price = parseNumber(v.price ?? '');
  if (price == null) errors.push('prix manquant');
  else if (Number.isNaN(price) || price <= 0) errors.push(`prix invalide « ${v.price} »`);

  const surface = parseNumber(v.surface_m2 ?? '');
  if (surface == null) errors.push('surface manquante');
  else if (Number.isNaN(surface) || surface <= 0) errors.push(`surface invalide « ${v.surface_m2} »`);

  const rooms = parseNumber(v.rooms ?? '');
  if (rooms != null && (Number.isNaN(rooms) || rooms <= 0 || rooms > 50)) errors.push(`pièces invalides « ${v.rooms} »`);

  const scale = (key: string, label: string) => {
    const n = parseNumber(v[key] ?? '');
    if (n == null) return 3;
    if (Number.isNaN(n) || n < 1 || n > 5) {
      errors.push(`${label} doit être entre 1 et 5`);
      return 3;
    }
    return Math.round(n);
  };
  const urgency = scale('urgency_level', 'urgence');
  const rarity = scale('rarity_score', 'rareté');

  const age = parseNumber(v.listing_age_days ?? '');
  if (age != null && (Number.isNaN(age) || age < 0)) errors.push(`« en vente depuis » invalide « ${v.listing_age_days} »`);

  const conditional = parseYesNo(v.is_conditional_sale ?? '');
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
    rooms: rooms ?? null,
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
