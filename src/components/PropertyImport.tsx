import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType } from '../types';
import { parsePropertyFile, PROPERTY_TEMPLATE, propertyKey } from '../utils/propertyImport';
import { markDuplicates } from '../utils/excel';
import ExcelImportPage from './ExcelImportPage';
import { propertyFeatureLabels } from '../utils/propertyFields';

const chf = (n: unknown) => `${Number(n).toLocaleString('fr-CH')} CHF`;

// Import de biens à vendre depuis Excel (page /seller/import)
export default function PropertyImport() {
  const { user } = useAuth();

  return (
    <ExcelImportPage
      title="Importer des biens à vendre depuis Excel"
      intro={`Ajoutez tout votre portefeuille en une fois : une ligne par bien, jusqu'à ${PROPERTY_TEMPLATE.maxRows} biens.`}
      template={PROPERTY_TEMPLATE}
      thing={['bien', 'biens']}
      parse={async (file) => {
        const rows = await parsePropertyFile(file);
        // Doublons : biens déjà publiés par ce compte, ou lignes répétées dans le fichier
        const existing = new Map<string, string>();
        if (supabase && user) {
          const { data } = await supabase.from('properties').select('title, zone, price').eq('seller_id', user.id);
          (data ?? []).forEach((p) => existing.set(propertyKey(p), String(p.title ?? '')));
        }
        return markDuplicates(rows, propertyKey, existing);
      }}
      preview={[
        { label: 'Titre', render: (r) => r.values.title },
        { label: 'Réf.', render: (r) => r.values.client_ref },
        {
          label: 'Type',
          render: (r) => (r.payload ? PROPERTY_TYPE_LABELS[r.payload.property_type as PropertyType] : r.values.property_type),
        },
        { label: 'Localité', render: (r) => (r.payload ? String(r.payload.zone) : r.values.zone) },
        { label: 'Prix', right: true, render: (r) => (r.payload ? chf(r.payload.price) : r.values.price) },
        { label: 'm²', right: true, render: (r) => (r.payload ? String(r.payload.surface_m2) : r.values.surface_m2) },
        {
          label: 'Caractéristiques',
          render: (r) =>
            r.payload
              ? propertyFeatureLabels(r.payload as Parameters<typeof propertyFeatureLabels>[0]).join(' · ')
              : [r.values.rooms, r.values.units_count].filter(Boolean).join(' · '),
        },
      ]}
      onImport={async (rows) => {
        if (!supabase || !user) throw new Error('Vous devez être connecté.');
        let done = 0;
        // Par paquets de 50, pour rester sous les limites de la base
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50).map((r) => ({ ...r.payload, seller_id: user.id }));
          const { error } = await supabase.from('properties').insert(chunk);
          if (error) {
            throw new Error(
              done > 0
                ? `${done} biens importés, puis erreur : ${error.message}. Vérifiez votre espace avant de relancer, pour éviter les doublons.`
                : `Erreur lors de l'import : ${error.message}`,
            );
          }
          done += chunk.length;
        }
        return done;
      }}
      successText={(k) =>
        `${k} bien${k > 1 ? 's' : ''} importé${k > 1 ? 's' : ''}. Ils sont visibles des acheteurs qualifiés dont la recherche correspond.`
      }
      successLink={{ label: 'Voir mes biens', to: '/dashboard' }}
    />
  );
}
