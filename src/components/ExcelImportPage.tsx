import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { downloadTemplate } from '../utils/excel';
import type { ImportedRow, TemplateSpec } from '../utils/excel';
import Brand from './Brand';

export interface PreviewColumn {
  label: string;
  /** Valeur affichée pour une ligne valide (payload) ou à corriger (valeurs brutes) */
  render: (row: ImportedRow) => ReactNode;
  right?: boolean;
}

// Page d'import Excel, commune aux biens à vendre et aux recherches d'acheteurs :
// 1. télécharger le modèle, 2. envoyer le fichier, 3. vérifier ligne par ligne et importer.
export default function ExcelImportPage({
  title,
  intro,
  template,
  thing,
  parse,
  preview,
  options,
  onImport,
  successText,
  successLink,
}: {
  title: string;
  intro: ReactNode;
  template: TemplateSpec;
  /** Nom de ce qu'on importe, au singulier et au pluriel */
  thing: [string, string];
  parse: (file: File) => Promise<ImportedRow[]>;
  preview: PreviewColumn[];
  /** Réglages affichés avant le bouton d'import */
  options?: ReactNode;
  /** Enregistre les lignes valides ; renvoie le nombre enregistré */
  onImport: (rows: ImportedRow[]) => Promise<number>;
  successText: (n: number) => ReactNode;
  successLink: { label: string; to: string };
}) {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'template' | 'read' | 'import' | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const valid = rows?.filter((r) => r.payload) ?? [];
  const invalid = rows?.filter((r) => !r.payload) ?? [];
  const n = (k: number) => `${k} ${k > 1 ? thing[1] : thing[0]}`;

  async function onTemplate() {
    setError(null);
    setBusy('template');
    try {
      await downloadTemplate(template);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le modèle n'a pas pu être créé.");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRows(null);
    setImported(null);
    setFileName(file.name);
    setBusy('read');
    try {
      const parsed = await parse(file);
      if (parsed.length === 0) setError(`Aucune ligne remplie dans la feuille « ${template.sheet} ».`);
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le fichier n'a pas pu être lu.");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function runImport() {
    setError(null);
    setBusy('import');
    try {
      const done = await onImport(valid);
      setImported(done);
      setRows(null);
      setFileName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'import.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Mon espace
          </button>
          <Brand size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
          <p className="mt-1 text-slate-400">{intro}</p>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">1 · Télécharger le modèle</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Le modèle contient les colonnes à remplir, des menus déroulants, un exemple et un mode d'emploi. Les
            colonnes marquées d'un astérisque sont obligatoires.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {template.columns.map((c) => (
              <span
                key={c.key}
                className={`rounded-full px-2.5 py-1 ${c.required ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}
              >
                {c.header}
                {c.required ? ' *' : ''}
              </span>
            ))}
          </div>
          <button
            onClick={onTemplate}
            disabled={busy !== null}
            className="mt-4 flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-50"
          >
            {busy === 'template' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Télécharger le modèle Excel
          </button>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">2 · Envoyer le fichier rempli</h2>
          <p className="mt-2 text-sm text-slate-400">
            Chaque ligne est vérifiée avant l'import : rien n'est enregistré tant que vous n'avez pas confirmé.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
            className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {busy === 'read' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Choisir le fichier Excel
          </button>
          {fileName && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
            </p>
          )}
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {imported !== null && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successText(imported)}
            <button onClick={() => navigate(successLink.to)} className="font-semibold underline">
              {successLink.label}
            </button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">3 · Vérifier et importer</h2>
            <p className="mt-2 text-sm text-slate-300">
              <span className="font-semibold text-emerald-400">{valid.length} prête{valid.length > 1 ? 's' : ''}</span>
              {invalid.length > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-amber-300">{invalid.length} à corriger</span> (ces lignes ne
                  seront pas importées)
                </>
              )}
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    {preview.map((c) => (
                      <th key={c.label} className={`px-3 py-2 ${c.right ? 'text-right' : ''}`}>
                        {c.label}
                      </th>
                    ))}
                    <th className="px-3 py-2">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {rows.map((r) => (
                    <tr key={r.line} className={r.payload ? '' : 'bg-amber-950/20'}>
                      <td className="px-3 py-2 text-slate-500">{r.line}</td>
                      {preview.map((c) => (
                        <td
                          key={c.label}
                          className={`px-3 py-2 text-slate-300 ${c.right ? 'whitespace-nowrap text-right' : ''}`}
                        >
                          {c.render(r) || '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {r.payload ? (
                          <span className="text-emerald-400">Prête</span>
                        ) : (
                          <span className="text-amber-300">{r.errors.join(' ; ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {options && <div className="mt-5">{options}</div>}

            <button
              onClick={runImport}
              disabled={busy !== null || valid.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
            >
              {busy === 'import' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Import en cours...
                </>
              ) : (
                `Importer ${n(valid.length)}`
              )}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
