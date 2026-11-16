import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType } from '../types';
import { parsePropertyFile, PROPERTY_TEMPLATE, propertyKey } from '../utils/propertyImport';
import { markDuplicates } from '../utils/excel';
import ExcelImportPage from './ExcelImportPage';
import { propertyFeatureLabels } from '../utils/propertyFields';

import { loc, t } from '../i18n';
const chf = (n: unknown) => `${Number(n).toLocaleString(loc())} CHF`;

// Import de biens à vendre depuis Excel (page /seller/import)
export default function PropertyImport() {
  const { user } = useAuth();

  return (
    <ExcelImportPage
      title={t("Importer des biens à vendre depuis Excel")}
      intro={t("Ajoutez tout votre portefeuille en une fois : une ligne par bien, jusqu'à {0} biens.", PROPERTY_TEMPLATE.maxRows)}
      template={PROPERTY_TEMPLATE}
      thing={[t('bien'), t('biens')]}
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
        { label: t("Titre"), render: (r) => r.values.title },
        { label: t("Réf."), render: (r) => r.values.client_ref },
        {
          label: t("Type"),
          render: (r) => (r.payload ? PROPERTY_TYPE_LABELS[r.payload.property_type as PropertyType] : r.values.property_type),
        },
        { label: t("Localité"), render: (r) => (r.payload ? String(r.payload.zone) : r.values.zone) },
        { label: t("Prix"), right: true, render: (r) => (r.payload ? chf(r.payload.price) : r.values.price) },
        { label: 'm²', right: true, render: (r) => (r.payload ? String(r.payload.surface_m2) : r.values.surface_m2) },
        {
          label: t("Caractéristiques"),
          render: (r) =>
            r.payload
              ? propertyFeatureLabels(r.payload as Parameters<typeof propertyFeatureLabels>[0]).join(' · ')
              : [r.values.rooms, r.values.units_count].filter(Boolean).join(' · '),
        },
      ]}
      onImport={async (rows) => {
        if (!supabase || !user) throw new Error(t("Vous devez être connecté."));
        let done = 0;
        // Par paquets de 50, pour rester sous les limites de la base
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50).map((r) => ({ ...r.payload, seller_id: user.id }));
          const { error } = await supabase.from('properties').insert(chunk);
          if (error) {
            throw new Error(
              done > 0
                ? t("{0} biens importés, puis erreur : {1}. Vérifiez votre espace avant de relancer, pour éviter les doublons.", done, error.message)
                : t("Erreur lors de l'import : {0}", error.message),
            );
          }
          done += chunk.length;
        }
        return done;
      }}
      successText={(k) =>
        k > 1
          ? t("{0} biens importés. Ils sont visibles des acheteurs qualifiés dont la recherche correspond.", k)
          : t("{0} bien importé. Il est visible des acheteurs qualifiés dont la recherche correspond.", k)
      }
      successLink={{ label: t("Voir mes biens"), to: '/dashboard' }}
    />
  );
}
