import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { BuyerProfile, PropertyType, SearchCriteria } from '../types';
import { calculateBuyerScore } from '../utils/matching';
import { parseSearchFile, SEARCH_TEMPLATE, searchKey } from '../utils/searchImport';
import { markDuplicates } from '../utils/excel';
import ExcelImportPage from './ExcelImportPage';
import { searchFeatureLabels } from '../utils/propertyFields';

import { loc, t, zoneLabel } from '../i18n';
const chf = (n: unknown) => `${Number(n).toLocaleString(loc())} CHF`;

// Import de recherches d'acheteurs depuis Excel (page /buyer/import).
// Les lignes deviennent des recherches du profil acheteur connecté.
export default function SearchImport() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'add' | 'replace'>('add');

  return (
    <ExcelImportPage
      title={t("Importer des recherches d'acheteurs depuis Excel")}
      intro={
        <>
          {t("Une ligne par recherche, jusqu'à {0}. Elles s'ajoutent à votre profil acheteur ; le financement (pré-approbation, endettement) se renseigne ensuite dans le profil.", SEARCH_TEMPLATE.maxRows)}
        </>
      }
      template={SEARCH_TEMPLATE}
      thing={[t('recherche'), t('recherches')]}
      parse={async (file) => {
        const rows = await parseSearchFile(file);
        // Doublons : recherches actives déjà dans le profil, ou lignes répétées dans le fichier
        const existing = new Map<string, string>();
        if (supabase && user) {
          const { data } = await supabase.from('buyer_profiles').select('search_criteria').eq('user_id', user.id).maybeSingle();
          ((data?.search_criteria as SearchCriteria[] | null) ?? [])
            .filter((c) => !c.purchased_at)
            .forEach((c) => existing.set(searchKey(c), c.label || c.desired_zone));
        }
        return markDuplicates(rows, searchKey, existing);
      }}
      preview={[
        { label: t("Référence"), render: (r) => r.values.label },
        { label: t("Zone"), render: (r) => (r.payload ? zoneLabel(String(r.payload.desired_zone)) : r.values.desired_zone) },
        {
          label: t("Type"),
          render: (r) =>
            r.payload
              ? PROPERTY_TYPE_LABELS[r.payload.desired_property_type as PropertyType]
              : r.values.desired_property_type,
        },
        { label: t("Budget"), right: true, render: (r) => (r.payload ? chf(r.payload.budget_max) : r.values.budget_max) },
        {
          label: t("Apport"),
          right: true,
          render: (r) =>
            r.payload ? (r.payload.personal_contribution ? chf(r.payload.personal_contribution) : t("général")) : r.values.personal_contribution,
        },
        {
          label: t("Caractéristiques"),
          render: (r) => {
            if (!r.payload) return [r.values.desired_surface_min_m2, r.values.desired_surface_max_m2].filter(Boolean).join(t(" à "));
            const p = r.payload as unknown as SearchCriteria;
            const lo = p.desired_surface_min_m2;
            const hi = p.desired_surface_max_m2;
            const s = lo && hi ? `${lo} à ${hi} m²` : lo ? t("dès {0} m²", lo) : hi ? t("jusqu'à {0} m²", hi) : '';
            return [
              s,
              ...searchFeatureLabels({
                rooms_min: p.desired_rooms_min,
                rooms_max: p.desired_rooms_max,
                units_min: p.desired_units_min,
                units_max: p.desired_units_max,
                commercial_type: p.desired_commercial_type,
                min_yield: p.min_gross_yield,
              }),
            ]
              .filter(Boolean)
              .join(' · ');
          },
        },
      ]}
      options={
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-2 text-slate-300">{t("Recherches déjà enregistrées dans votre profil :")}</legend>
          {(
            [
              ['add', 'Les garder et ajouter celles du fichier'],
              ['replace', 'Les remplacer par celles du fichier'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-slate-300">
              <input
                type="radio"
                name="mode"
                checked={mode === value}
                onChange={() => setMode(value)}
                className="h-4 w-4 border-slate-500 bg-slate-800 text-cyan-500"
              />
              {label}
            </label>
          ))}
        </fieldset>
      }
      onImport={async (rows) => {
        if (!supabase || !user) throw new Error(t("Vous devez être connecté."));
        const { data: existing, error: readErr } = await supabase
          .from('buyer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (readErr) throw new Error(t("Lecture du profil impossible : {0}", readErr.message));

        const current = (existing as BuyerProfile | null) ?? null;
        const imported = rows.map((r) => r.payload as unknown as SearchCriteria);
        // L'historique (recherches achetées) est toujours conservé, même en mode « remplacer »
        const previous = current?.search_criteria ?? [];
        const kept = mode === 'add' ? previous : previous.filter((c) => c.purchased_at);
        const criteria = [...kept, ...imported];
        const primary = criteria.find((c) => !c.purchased_at) ?? criteria[0];

        const profile = {
          personal_contribution: current?.personal_contribution ?? 0,
          has_pre_approval: current?.has_pre_approval ?? false,
          debt_ratio: current?.debt_ratio ?? null,
          search_criteria: criteria,
        };
        const payload = {
          ...profile,
          user_id: user.id,
          desired_zone: primary.desired_zone,
          desired_property_type: primary.desired_property_type,
          budget_max: primary.budget_max,
          desired_surface_m2: primary.desired_surface_min_m2 || 0,
          score: calculateBuyerScore({ ...profile, debt_ratio: profile.debt_ratio ?? 100 } as BuyerProfile),
        };
        const { error } = await supabase.from('buyer_profiles').upsert(payload, { onConflict: 'user_id' });
        if (error) throw new Error(t("Erreur lors de l'import : {0}", error.message));
        return imported.length;
      }}
      successText={(k) =>
        k > 1
          ? t("{0} recherches importées. Vérifiez le financement de votre profil pour qu'elles soient actives.", k)
          : t("{0} recherche importée. Vérifiez le financement de votre profil pour qu'elle soit active.", k)
      }
      successLink={{ label: t("Compléter le financement"), to: '/buyer/new' }}
    />
  );
}
