import { t } from '../i18n';

/**
 * Table de libellés traduite à la lecture : la clé (enregistrée dans la base) ne change pas,
 * le libellé suit la langue choisie.
 */
function translated<K extends string>(map: Record<K, string>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of Object.keys(map) as K[]) {
    Object.defineProperty(out, k, { get: () => t(map[k]), enumerable: true });
  }
  Object.defineProperty(out, '__fr', { value: map, enumerable: false });
  return out;
}

/** Libellés français d'origine d'une table traduite (clés des traductions) */
export const frLabels = <K extends string>(map: Record<K, string>): Record<K, string> =>
  ((map as unknown as { __fr?: Record<K, string> }).__fr ?? map);

// === Types pour le réseau immobilier off-market ===

export type UserRole = 'buyer' | 'seller' | 'admin';
export type PropertyType =
  | 'apartment'
  | 'apartment_ppe'
  | 'house'
  | 'detached_house'
  | 'villa'
  | 'land'
  | 'commercial'
  | 'investment_building'
  | 'investment_mixed';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  pseudo: string;
  phone?: string;
  role: UserRole;
  /** Régie ou courtier (déclaré par la personne) */
  is_professional?: boolean;
  created_at: string;
  updated_at: string;
}

// Critère de recherche individuel (un acheteur peut en avoir plusieurs)
export interface SearchCriteria {
  id?: string;
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: number;
  desired_surface_min_m2: number;
  desired_surface_max_m2: number;
  /** Apport prévu pour cette recherche (facultatif). Vide : on prend l'apport général du profil. */
  personal_contribution?: number | null;
  /** Nombre de pièces souhaité (facultatif, ex. 3.5) */
  desired_rooms_min?: number | null;
  desired_rooms_max?: number | null;
  /** Référence privée (ex. nom du client) : jamais montrée aux vendeurs */
  label?: string | null;
  /** Immeubles : nombre d'appartements souhaité */
  desired_units_min?: number | null;
  desired_units_max?: number | null;
  /** Immeuble mixte, commercial : type de commerce souhaité (vide : indifférent) */
  desired_commercial_type?: CommercialType | null;
  /** Rendement brut minimum en % (immeubles, commercial) */
  min_gross_yield?: number | null;
  /** Date d'achat (professionnels) : la recherche quitte le matching et passe dans l'historique */
  purchased_at?: string | null;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  // Critères de recherche multiples
  /** Recherche visible, anonymisée, par les vendeurs */
  share_search?: boolean;
  search_criteria: SearchCriteria[];
  // Anciens champs conservés pour rétro-compatibilité lecture
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: number;
  desired_surface_m2: number;
  // Critères financiers
  personal_contribution: number;
  has_pre_approval: boolean;
  pre_approval_doc_path?: string;
  debt_ratio: number;
  score: number;
  created_at: string;
  updated_at: string;
}

export type SituationType = 'hyper_centre' | 'peripherie_urbaine' | 'banlieue_proche' | 'village' | 'zone_rurbaine';
export type HouseType = 'individuelle' | 'jumelee' | 'contigue' | 'maitre' | 'autre';
export type CommercialType = 'bureau' | 'commerce' | 'atelier' | 'depot' | 'restaurant' | 'autre';

export const SITUATION_LABELS: Record<SituationType, string> = translated({
  hyper_centre: 'Bien Hyper-Centré',
  peripherie_urbaine: 'Périphérie Urbaine',
  banlieue_proche: 'Banlieue Proche',
  village: 'Le Village',
  zone_rurbaine: 'Zone Rurbaine',
});

export const HOUSE_TYPE_LABELS: Record<HouseType, string> = translated({
  individuelle: 'Individuelle',
  jumelee: 'Jumelée',
  contigue: 'Contiguë',
  maitre: 'Maison de Maître',
  autre: 'Autre',
});

export const COMMERCIAL_TYPE_LABELS: Record<CommercialType, string> = translated({
  bureau: 'Bureau',
  commerce: 'Commerce',
  atelier: 'Atelier',
  depot: 'Dépôt',
  restaurant: 'Restaurant',
  autre: 'Autre',
});

export interface Property {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  property_type: PropertyType;
  zone: string;
  /** Code du canton (VD, GE, FR, VS, NE, JU), si la localité est connue */
  canton?: string | null;
  price: number;
  surface_m2: number;
  rooms?: number;
  /** Immeubles : nombre d'appartements */
  units_count?: number | null;
  /** Immeuble mixte : nombre de surfaces commerciales */
  commercial_units?: number | null;
  /** État locatif annuel en CHF (loyers nets), pour le rendement brut */
  annual_rent?: number | null;
  /** Référence privée du professionnel : n° de client ou nom du mandant (jamais montrée aux acheteurs) */
  client_ref?: string | null;
  /** Date de vente (professionnels) : le bien quitte le réseau et passe dans l'historique */
  sold_at?: string | null;
  image_url?: string;
  floor?: string;
  house_type?: string;
  commercial_type?: string;
  situation?: string;
  exterior?: string[];
  parking_types?: string[];
  parking_quantity?: number;
  bonuses?: string[];
  urgency_level: number;
  listing_age_days: number;
  is_conditional_sale: boolean;
  conditional_sale_details?: string;
  rarity_score: number;
  score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  buyer_profile_id: string;
  property_id: string;
  match_score: number;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  // Jointures optionnelles
  property?: Property;
}

export const FLOOR_OPTIONS = [
  { value: 'rez_inf', label: 'Rez inférieur' },
  { value: 'rdc', label: 'Rez-de-chaussée' },
  { value: 'rez_sup', label: 'Rez supérieur' },
  ...Array.from({ length: 18 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? '1er étage' : `${i + 1}e étage` })),
];
/** Libellé d'étage dans la langue choisie */
export const floorLabel = (label: string) => {
  const n = label.match(/^(\d+)(er|e) étage$/);
  return n ? t('{0}e étage', n[1]) : t(label);
};

export const EXTERIOR_OPTIONS = [
  'Balcon',
  'Loggia',
  'Terrasse',
  'Toit-terrasse (Rooftop)',
  'Cour intérieure',
  'Jardin privatif',
  'Jardin commun',
  'Parc / Grand terrain',
  'Patio',
  'Place',
];

export const PARKING_TYPE_OPTIONS = [
  { value: 'ext', label: 'Place de parc extérieure' },
  { value: 'carport', label: 'Carport (Couvert à voitures)' },
  { value: 'collectif', label: 'Place en garage collectif / Box souterrain' },
  { value: 'box', label: 'Garage individuel (Box)' },
  { value: 'double_cote', label: 'Double garage (Côte à côte)' },
  { value: 'double_tandem', label: 'Double garage (En enfilade / Tandem)' },
  { value: 'atelier', label: 'Atelier / Grand Garage' },
];

export const BONUS_OPTIONS = [
  'Sans vis-à-vis',
  'Plein Sud (Luminosité maximale)',
  'Vue dégagée (Montagne, lac, parc)',
  'Clôturé (Sécurité pour animaux/enfants)',
  'Piscinable (Terrain plat avec accès machines)',
];

// === Labels pour l'affichage ===

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = translated({
  apartment: 'Appartement',
  apartment_ppe: 'Appartement en PPE',
  house: 'Maison',
  detached_house: 'Maison individuelle',
  villa: 'Villa',
  land: 'Terrain',
  commercial: 'Commercial',
  // Clé conservée telle quelle : elle est déjà enregistrée dans la base
  investment_building: 'Immeuble de rendement habitation',
  investment_mixed: 'Immeuble de rendement mixte',
});

// Conservé pour rétro-compatibilité, mais préférer VAUD_COMMUNES
export const ZONE_OPTIONS = [
  'Lausanne',
  'Morges',
  'Nyon',
  'Vevey',
  'Montreux',
  'Renens',
  'Pully',
  'Lutry',
  'Yverdon',
  'Aigle',
] as const;
