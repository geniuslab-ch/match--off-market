import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { BuyerProfile, PropertyType, SearchCriteria } from '../types';
import { calculateBuyerScore } from '../utils/matching';
import { parseSearchFile, SEARCH_TEMPLATE } from '../utils/searchImport';
import ExcelImportPage from './ExcelImportPage';
import { roomsLabel } from './SearchCard';

const chf = (n: unknown) => `${Number(n).toLocaleString('fr-CH')} CHF`;

// Import de recherches d'acheteurs depuis Excel (page /buyer/import).
// Les lignes deviennent des recherches du profil acheteur connecté.
export default function SearchImport() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'add' | 'replace'>('add');

  return (
    <ExcelImportPage
      title="Importer des recherches d'acheteurs depuis Excel"
      intro={
        <>
          Une ligne par recherche, jusqu'à {SEARCH_TEMPLATE.maxRows}. Elles s'ajoutent à votre profil acheteur ; le
          financement (pré-approbation, endettement) se renseigne ensuite dans le profil.
        </>
      }
      template={SEARCH_TEMPLATE}
      thing={['recherche', 'recherches']}
      parse={parseSearchFile}
      preview={[
        { label: 'Référence', render: (r) => r.values.label },
        { label: 'Zone', render: (r) => (r.payload ? String(r.payload.desired_zone) : r.values.desired_zone) },
        {
          label: 'Type',
          render: (r) =>
            r.payload
              ? PROPERTY_TYPE_LABELS[r.payload.desired_property_type as PropertyType]
              : r.values.desired_property_type,
        },
        { label: 'Budget', right: true, render: (r) => (r.payload ? chf(r.payload.budget_max) : r.values.budget_max) },
        {
          label: 'Apport',
          right: true,
          render: (r) =>
            r.payload ? (r.payload.personal_contribution ? chf(r.payload.personal_contribution) : 'général') : r.values.personal_contribution,
        },
        {
          label: 'Surface, pièces',
          render: (r) => {
            if (!r.payload) return [r.values.desired_surface_min_m2, r.values.desired_surface_max_m2].filter(Boolean).join(' à ');
            const p = r.payload as unknown as SearchCriteria;
            const lo = p.desired_surface_min_m2;
            const hi = p.desired_surface_max_m2;
            const s = lo && hi ? `${lo} à ${hi} m²` : lo ? `dès ${lo} m²` : hi ? `jusqu'à ${hi} m²` : '';
            return [s, roomsLabel(p.desired_rooms_min, p.desired_rooms_max)].filter(Boolean).join(' · ');
          },
        },
      ]}
      options={
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-2 text-slate-300">Recherches déjà enregistrées dans votre profil :</legend>
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
        if (!supabase || !user) throw new Error('Vous devez être connecté.');
        const { data: existing, error: readErr } = await supabase
          .from('buyer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (readErr) throw new Error(`Lecture du profil impossible : ${readErr.message}`);

        const current = (existing as BuyerProfile | null) ?? null;
        const imported = rows.map((r) => r.payload as unknown as SearchCriteria);
        const kept = mode === 'add' && current?.search_criteria?.length ? current.search_criteria : [];
        const criteria = [...kept, ...imported];
        const primary = criteria[0];

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
        if (error) throw new Error(`Erreur lors de l'import : ${error.message}`);
        return imported.length;
      }}
      successText={(k) =>
        `${k} recherche${k > 1 ? 's' : ''} importée${k > 1 ? 's' : ''}. Vérifiez le financement de votre profil pour qu'elles soient actives.`
      }
      successLink={{ label: 'Compléter le financement', to: '/buyer/new' }}
    />
  );
}
