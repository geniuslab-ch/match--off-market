import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType } from '../types';
import { downloadTemplate, IMPORT_COLUMNS, MAX_IMPORT_ROWS, parseImportFile } from '../utils/propertyImport';
import type { ImportedRow } from '../utils/propertyImport';
import Brand from './Brand';

const chf = (n: unknown) => `${Number(n).toLocaleString('fr-CH')} CHF`;

// Import de plusieurs biens depuis un fichier Excel (page /seller/import)
export default function PropertyImport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<'template' | 'read' | 'import' | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const valid = rows?.filter((r) => r.payload) ?? [];
  const invalid = rows?.filter((r) => !r.payload) ?? [];

  async function onTemplate() {
    setError(null);
    setBusy('template');
    try {
      await downloadTemplate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le modèle n\'a pas pu être créé.');
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
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Format non pris en charge : enregistrez le fichier au format Excel (.xlsx).');
      return;
    }
    setBusy('read');
    try {
      const parsed = await parseImportFile(file);
      if (parsed.length === 0) setError('Aucun bien trouvé dans la feuille « Biens ».');
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le fichier n\'a pas pu être lu.');
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onImport() {
    if (!supabase || !user || valid.length === 0) return;
    setError(null);
    setBusy('import');
    let done = 0;
    try {
      // Par paquets de 50, pour rester sous les limites de la base
      for (let i = 0; i < valid.length; i += 50) {
        const chunk = valid.slice(i, i + 50).map((r) => ({ ...r.payload, seller_id: user.id }));
        const { error: err } = await supabase.from('properties').insert(chunk);
        if (err) throw new Error(err.message);
        done += chunk.length;
      }
      setImported(done);
      setRows(null);
      setFileName(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erreur inconnue';
      setError(
        done > 0
          ? `${done} bien${done > 1 ? 's' : ''} importé${done > 1 ? 's' : ''}, puis erreur : ${msg}. Vérifiez votre espace avant de relancer, pour éviter les doublons.`
          : `Erreur lors de l'import : ${msg}`,
      );
      if (done > 0) setImported(done);
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
          <h1 className="text-2xl font-bold text-slate-100">Importer des biens depuis Excel</h1>
          <p className="mt-1 text-slate-400">
            Ajoutez tout votre portefeuille en une fois : un fichier, une ligne par bien, jusqu'à {MAX_IMPORT_ROWS}{' '}
            biens.
          </p>
        </div>

        {/* Étape 1 : modèle */}
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">1 · Télécharger le modèle</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Le modèle contient les colonnes à remplir, des menus déroulants pour le type de bien et la localité, un
            exemple et un mode d'emploi.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {IMPORT_COLUMNS.map((c) => (
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

        {/* Étape 2 : fichier */}
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">2 · Envoyer le fichier rempli</h2>
          <p className="mt-2 text-sm text-slate-400">
            Chaque ligne est vérifiée avant l'import : vous voyez le résultat et rien n'est enregistré tant que vous
            n'avez pas confirmé.
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
            {imported} bien{imported > 1 ? 's' : ''} importé{imported > 1 ? 's' : ''}. Ils sont visibles des
            acheteurs qualifiés dont la recherche correspond.
            <button onClick={() => navigate('/dashboard')} className="font-semibold underline">
              Voir mes biens
            </button>
          </div>
        )}

        {/* Étape 3 : vérification */}
        {rows && rows.length > 0 && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">3 · Vérifier et importer</h2>
            <p className="mt-2 text-sm text-slate-300">
              <span className="font-semibold text-emerald-400">{valid.length} prêt{valid.length > 1 ? 's' : ''}</span>
              {invalid.length > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-amber-300">
                    {invalid.length} à corriger
                  </span>{' '}
                  (ces lignes ne seront pas importées)
                </>
              )}
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Titre</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Localité</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">m²</th>
                    <th className="px-3 py-2 text-right">Pièces</th>
                    <th className="px-3 py-2">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {rows.map((r) => {
                    const p = r.payload;
                    return (
                      <tr key={r.line} className={p ? '' : 'bg-amber-950/20'}>
                        <td className="px-3 py-2 text-slate-500">{r.line}</td>
                        <td className="px-3 py-2 text-slate-100">{r.values.title || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {p ? PROPERTY_TYPE_LABELS[p.property_type as PropertyType] : r.values.property_type || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{p ? String(p.zone) : r.values.zone || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-slate-300">{p ? chf(p.price) : r.values.price || '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{p ? String(p.surface_m2) : r.values.surface_m2 || '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-300">
                          {p ? (p.rooms ? Number(p.rooms).toLocaleString('fr-CH') : '—') : r.values.rooms || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {p ? (
                            <span className="text-emerald-400">Prêt</span>
                          ) : (
                            <span className="text-amber-300">{r.errors.join(' ; ')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={onImport}
              disabled={busy !== null || valid.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
            >
              {busy === 'import' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Import en cours...
                </>
              ) : (
                `Importer ${valid.length} bien${valid.length > 1 ? 's' : ''}`
              )}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
