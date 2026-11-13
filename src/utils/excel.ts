// ============================================================
// Outils communs aux imports Excel (biens à vendre, recherches d'acheteurs)
// ============================================================
// La bibliothèque Excel (exceljs) n'est chargée qu'au moment de l'utiliser.

import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType } from '../types';
import { CANTONS, ROMANDIE_COMMUNES } from '../data/romandieCommunes';

export interface ImportColumn {
  key: string;
  header: string;
  width: number;
  required?: boolean;
  help: string;
  example: string | number | null;
  /** Menu déroulant dans le modèle */
  list?: 'types' | 'zones' | 'yesno';
  /** Nombre entier de 1 à 5 */
  scale?: boolean;
  /** Montant en CHF (format 1'000) */
  money?: boolean;
}

export interface TemplateSpec {
  filename: string;
  /** Nom de la feuille à remplir (« Biens », « Recherches ») */
  sheet: string;
  columns: ImportColumn[];
  /** Lignes de la feuille « Exemple », dans l'ordre des colonnes */
  examples: (string | number | null)[][];
  /** Phrases ajoutées au mode d'emploi */
  notes: string[];
  maxRows: number;
  /** Les zones peuvent être un canton entier (recherches d'acheteurs) */
  allowCantons?: boolean;
}

/** Ligne lue dans le fichier, puis validée */
export interface ImportedRow {
  /** Numéro de ligne dans Excel */
  line: number;
  values: Record<string, string>;
  /** Données prêtes à enregistrer, si la ligne est valide */
  payload: Record<string, unknown> | null;
  errors: string[];
}

// Texte comparable : minuscules, sans accents ni espaces superflus
export const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const TYPE_ENTRIES = Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][];
const TYPE_BY_NORM = new Map<string, PropertyType>(
  TYPE_ENTRIES.flatMap(([key, label]) => [
    [norm(label), key],
    [norm(key), key],
  ]),
);
const COMMUNE_BY_NORM = new Map(ROMANDIE_COMMUNES.map((c) => [norm(c), c]));
// « Canton de Vaud », mais aussi « Vaud » ou « VD »
const CANTON_BY_NORM = new Map<string, string>(
  CANTONS.flatMap((c) => [
    [norm(c.label), c.label],
    [norm(c.code), c.label],
    [norm(c.label.replace(/^Canton (de |du )/, '')), c.label],
  ]),
);

export const findType = (raw: string): PropertyType | null => TYPE_BY_NORM.get(norm(raw)) ?? null;
export const findCommune = (raw: string): string | null => COMMUNE_BY_NORM.get(norm(raw)) ?? null;
/** Commune, ou canton entier si autorisé ; le nom exact utilisé par le matching */
export const findZone = (raw: string, allowCantons: boolean): string | null =>
  findCommune(raw) ?? (allowCantons ? CANTON_BY_NORM.get(norm(raw)) ?? null : null);

// Nombre suisse : accepte 990'000, 990 000, 3,5 ou 3.5. null si vide, NaN si illisible.
export function parseNumber(raw: string | undefined): number | null {
  const s = String(raw ?? '').replace(/[\s'’]/g, '').replace(/chf/i, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseYesNo(raw: string | undefined): boolean | null {
  const v = norm(raw);
  if (v === '') return null;
  if (['oui', 'o', 'yes', 'y', 'x', '1', 'vrai', 'true'].includes(v)) return true;
  if (['non', 'n', 'no', '0', 'faux', 'false'].includes(v)) return false;
  return null;
}

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

const headerText = (c: ImportColumn) => (c.required ? `${c.header} *` : c.header);

/** Crée et télécharge un modèle : feuille à remplir, exemple, mode d'emploi, listes */
export async function downloadTemplate(spec: TemplateSpec): Promise<void> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Offly';
  const { columns } = spec;

  const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } } as const;
  const styleHeader = (ws: import('exceljs').Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 34;
    columns.forEach((c, i) => {
      row.getCell(i + 1).fill = fill;
      ws.getColumn(i + 1).width = c.width;
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const ws = wb.addWorksheet(spec.sheet);
  ws.addRow(columns.map(headerText));
  styleHeader(ws);

  const ex = wb.addWorksheet('Exemple');
  ex.addRow(columns.map(headerText));
  spec.examples.forEach((r) => ex.addRow(r));
  styleHeader(ex);

  const help = wb.addWorksheet("Mode d'emploi");
  help.columns = [{ width: 32 }, { width: 12 }, { width: 76 }];
  help.addRow(['Colonne', 'Obligatoire', 'Comment la remplir']).font = { bold: true };
  columns.forEach((c) => help.addRow([c.header, c.required ? 'oui' : 'non', c.help]));
  help.addRow([]);
  help.addRow([`Remplissez la feuille « ${spec.sheet} » sans modifier la ligne de titres. La feuille « Exemple » n'est pas importée.`]);
  help.addRow([`${spec.maxRows} lignes au maximum par fichier.`]);
  spec.notes.forEach((n) => help.addRow([n]));

  // Listes des menus déroulants
  const zones = [
    ...(spec.allowCantons ? CANTONS.map((c) => c.label) : []),
    ...[...ROMANDIE_COMMUNES].sort((a, b) => a.localeCompare(b, 'fr')),
  ];
  const lists = wb.addWorksheet('Listes');
  lists.columns = [
    { header: 'Types de bien', width: 34 },
    { header: spec.allowCantons ? 'Localités et cantons' : 'Localités', width: 30 },
  ];
  for (let i = 0; i < Math.max(TYPE_ENTRIES.length, zones.length); i++) {
    lists.addRow([TYPE_ENTRIES[i]?.[1] ?? null, zones[i] ?? null]);
  }
  lists.getRow(1).font = { bold: true };

  // Une règle par colonne, sur toute la plage (des règles qui se chevauchent abîment le fichier)
  const last = spec.maxRows + 1;
  const dv = (ws as unknown as { dataValidations: { add: (r: string, v: object) => void } }).dataValidations;
  columns.forEach((c, i) => {
    const letter = String.fromCharCode(65 + i);
    const range = `${letter}2:${letter}${last}`;
    if (c.list === 'types') {
      dv.add(range, {
        type: 'list', allowBlank: true, formulae: [`Listes!$A$2:$A$${TYPE_ENTRIES.length + 1}`],
        showErrorMessage: true, errorTitle: c.header, error: 'Choisissez un type dans la liste.',
      });
    } else if (c.list === 'zones') {
      dv.add(range, {
        type: 'list', allowBlank: true, formulae: [`Listes!$B$2:$B$${zones.length + 1}`],
        showErrorMessage: true, errorTitle: c.header,
        error: spec.allowCantons ? 'Choisissez une commune ou un canton dans la liste.' : 'Choisissez une commune romande dans la liste.',
      });
    } else if (c.list === 'yesno') {
      dv.add(range, { type: 'list', allowBlank: true, formulae: ['"oui,non"'] });
    } else if (c.scale) {
      dv.add(range, {
        type: 'whole', operator: 'between', allowBlank: true, formulae: [1, 5],
        showErrorMessage: true, error: 'Nombre entier de 1 à 5.',
      });
    }
    if (c.money) ws.getColumn(i + 1).numFmt = "#'##0";
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(buf as ArrayBuffer, spec.filename);
}

// Valeur d'une cellule exceljs en texte (gère formules, texte riche, liens, dates)
function cellText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return cellText(o.result);
    if ('richText' in o && Array.isArray(o.richText)) return o.richText.map((t: { text: string }) => t.text).join('');
    if ('text' in o) return String(o.text);
  }
  return String(v).trim();
}

/** Lit la feuille à remplir : une entrée par ligne non vide, colonnes repérées par leur titre */
export async function readSheet(file: File, spec: TemplateSpec): Promise<{ line: number; values: Record<string, string> }[]> {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error('Format non pris en charge : enregistrez le fichier au format Excel (.xlsx).');
  }
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet(spec.sheet) ?? wb.worksheets[0];
  if (!ws) throw new Error('Le fichier ne contient aucune feuille.');

  const byHeader = new Map(spec.columns.map((c) => [norm(c.header), c.key]));
  const keyByCol = new Map<number, string>();
  ws.getRow(1).eachCell((cell, colNumber) => {
    const key = byHeader.get(norm(cellText(cell.value)).replace(/\s*\*$/, ''));
    if (key) keyByCol.set(colNumber, key);
  });
  const found = new Set(keyByCol.values());
  const missing = spec.columns.filter((c) => c.required && !found.has(c.key));
  if (missing.length > 0) {
    throw new Error(
      `Colonnes introuvables : ${missing.map((c) => c.header).join(', ')}. Utilisez le modèle sans modifier la ligne de titres.`,
    );
  }

  const rows: { line: number; values: Record<string, string> }[] = [];
  ws.eachRow({ includeEmpty: false }, (row, line) => {
    if (line === 1) return;
    const values: Record<string, string> = {};
    keyByCol.forEach((key, colNumber) => {
      values[key] = cellText(row.getCell(colNumber).value);
    });
    if (Object.values(values).some((v) => v !== '')) rows.push({ line, values });
  });
  if (rows.length > spec.maxRows) {
    throw new Error(`Le fichier contient ${rows.length} lignes : ${spec.maxRows} au maximum par import.`);
  }
  return rows;
}
