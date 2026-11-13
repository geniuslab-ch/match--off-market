// ============================================================
// Appels aux fonctions de la base (créées par supabase_pilote.sql)
// Fichier : src/lib/api.ts
// ============================================================
// Le matching est calculé dans la base : le navigateur ne reçoit que
// les données auxquelles la personne a droit.

import { supabase } from './supabase';
import type { Property, PropertyType } from '../types';

export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type Initiator = 'buyer' | 'seller';

export type BillingRule = 'per_contact' | 'subscription' | 'owner_success';

/** Conditions tarifaires du vendeur connecté, calculées par la base (montants hors TVA) */
export interface BillingTerms {
  pilot: boolean;
  rule: BillingRule;
  fee_chf: number;
  active_properties: number;
  per_contact_chf: number;
  subscription_chf: number;
  subscription_above: number;
  owner_success_chf: number;
}

export interface Contact {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface MatchDetails {
  zone: boolean;
  price: boolean;
  type: boolean;
  surface: boolean;
}

export interface ServerMatch {
  property: Omit<Property, 'seller_id'>;
  match_score: number;
  seller_score: number;
  /** Bien présenté par un propriétaire ou par un professionnel (régie, courtier) */
  seller_type: 'owner' | 'professional';
  details: MatchDetails;
  request_id: string | null;
  request_status: RequestStatus | null;
  initiated_by: Initiator | null;
  contact: Contact | null;
}

export interface MatchesResponse {
  has_profile: boolean;
  buyer_score: number;
  qualified: boolean;
  matches: ServerMatch[];
}

export interface SellerProperty {
  property: Property;
  seller_score: number;
  matching_buyers: number;
  pending_requests: number;
}

export interface ContactRequest {
  id: string;
  property_id: string;
  property_title: string;
  status: RequestStatus;
  initiated_by: Initiator;
  /** Montant dû par le vendeur pour cette mise en relation, hors TVA */
  fee_chf?: number;
  billing_rule?: BillingRule | 'pilot' | null;
  match_score: number;
  created_at: string;
  buyer_pseudo: string | null;
  buyer_score: number;
  has_pre_approval: boolean;
  contact: Contact | null;
}

/** Un critère d'une recherche d'acheteur, anonymisé (budget arrondi) */
export interface SearchCriterion {
  zone: string;
  property_type: PropertyType;
  budget_max: number;
  surface_min: number;
  surface_max: number;
  /** Pièces souhaitées (0 : indifférent) */
  rooms_min?: number;
  rooms_max?: number;
}

/** Recherche d'un acheteur qualifié, sans aucune donnée d'identité */
export interface BuyerSearch {
  id: string;
  has_pre_approval: boolean;
  criteria: SearchCriterion[];
}

/** La même recherche vue par un vendeur connecté, avec ses biens qui correspondent */
export interface SellerSearch extends BuyerSearch {
  buyer_score: number;
  my_properties: {
    id: string;
    title: string;
    match_score: number;
    /** false = le bien correspond, mais dans une autre localité que celle recherchée */
    zone_match?: boolean;
    request_status: RequestStatus | null;
  }[];
}

const NOT_INSTALLED =
  "La base de données n'est pas encore à jour : exécutez le fichier supabase_pilote.sql dans Supabase (SQL Editor).";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    // PGRST202 = fonction introuvable : le script SQL n'a pas été exécuté
    if (error.code === 'PGRST202' || error.code === '42883') throw new Error(NOT_INSTALLED);
    throw new Error(error.message);
  }
  return data as T;
}

// --- Acheteur ---
export const getMyMatches = () => call<MatchesResponse>('get_my_matches');

export const requestContact = (propertyId: string) =>
  call<RequestStatus>('request_contact', { p_property_id: propertyId });

// --- Vendeur / régie ---
export const getMyProperties = () => call<SellerProperty[]>('get_my_properties');

export const getMyContactRequests = () => call<ContactRequest[]>('get_my_contact_requests');

export const getBuyerSearches = () => call<SellerSearch[]>('get_buyer_searches');

export const proposeProperty = (propertyId: string, searchId: string) =>
  call<RequestStatus>('propose_property', { p_property_id: propertyId, p_search_id: searchId });

export async function setPropertyActive(propertyId: string, isActive: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { error } = await supabase.from('properties').update({ is_active: isActive }).eq('id', propertyId);
  if (error) throw new Error(error.message);
}

// --- Les deux : répondre à une demande ou à une proposition ---
export const respondContactRequest = (requestId: string, accept: boolean) =>
  call<RequestStatus>('respond_contact_request', { p_request_id: requestId, p_accept: accept });

// --- Tarifs ---
export const getMyBillingTerms = () => call<BillingTerms>('get_my_billing_terms');

// --- Administration : suivi des ventes ---
export type CallOutcome = 'sold' | 'not_sold' | 'callback';

interface Person {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

/** Une mise en relation acceptée, à suivre par téléphone */
export interface Followup {
  id: string;
  /** urgent = bien retiré depuis (vente probable), due = rappel atteint, later = à venir, closed = résultat connu */
  priority: 'urgent' | 'due' | 'later' | 'closed';
  probable_sale: boolean;
  accepted_at: string;
  sale_status: 'unknown' | 'sold' | 'not_sold';
  next_call_at: string | null;
  last_call_at: string | null;
  call_note: string | null;
  fee_chf: number;
  billing_rule: BillingRule | 'pilot' | null;
  property: { title: string; zone: string; price: number; is_active: boolean; deactivated_at: string | null };
  seller: Person & { is_professional: boolean };
  buyer: Person;
}

export const adminGetFollowups = () => call<Followup[]>('admin_get_followups');

/** Une annonce vue par l'administrateur */
export interface AdminProperty {
  property: Property;
  seller: Person & { is_professional: boolean };
  pending_requests: number;
  accepted_requests: number;
}

export const adminGetProperties = () => call<AdminProperty[]>('admin_get_properties');

export const adminSetPropertyActive = (propertyId: string, active: boolean) =>
  call<boolean>('admin_set_property_active', { p_property_id: propertyId, p_active: active });

export const adminDeleteProperty = (propertyId: string) =>
  call<boolean>('admin_delete_property', { p_property_id: propertyId });

export const adminRecordCall = (requestId: string, outcome: CallOutcome, note: string) =>
  call<string>('admin_record_call', { p_request_id: requestId, p_outcome: outcome, p_note: note });

// --- Mon compte ---
export const setMyProfessional = (value: boolean) =>
  call<boolean>('set_my_professional', { p_value: value });

// --- Public, sans compte ---
export const getPublicSearches = () => call<BuyerSearch[]>('get_public_searches');

export const getPublicSearch = (searchId: string) =>
  call<BuyerSearch | null>('get_public_search', { p_search_id: searchId });
