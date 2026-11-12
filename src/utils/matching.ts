import { cantonOfCommune, cantonOfZone } from '../data/romandieCommunes';
import type { BuyerProfile, Property, SearchCriteria } from '../types';

// ============================================================
// ALGORITHME DE MATCHING - Réseau Immobilier Off-Market
// Suisse romande
// ============================================================

// === SEUILS ===
const BUYER_SCORE_THRESHOLD = 80;
const MATCH_SCORE_THRESHOLD = 70;
// Note: Le Score Vendeur n'est PLUS un filtre d'exclusion.
// Il sert uniquement au tri (ranking) et à l'affichage (badge "Vendeur Motivé").

// ============================================================
// 1. SCORING ACHETEUR (sur 100)
// ============================================================
// Budget suffisant      → 40 points
// Apport >= 20%         → 20 points
// Pré-approbation       → 30 points
// Endettement <= 33%    → 10 points
// Seuil : 80
// ============================================================

export function calculateBuyerScore(buyer: BuyerProfile): number {
  let score = 0;

  // Budget suffisant (40 pts) — on considère qu'un budget > 0 est "suffisant"
  // Le vrai check se fait au matching (prix <= budget)
  if (buyer.budget_max > 0) {
    score += 40;
  }

  // Apport personnel >= 20% du budget (20 pts)
  if (buyer.budget_max > 0 && buyer.personal_contribution / buyer.budget_max >= 0.2) {
    score += 20;
  }

  // Pré-approbation bancaire (30 pts)
  if (buyer.has_pre_approval) {
    score += 30;
  }

  // Taux d'endettement <= 33% (10 pts)
  if (buyer.debt_ratio <= 33) {
    score += 10;
  }

  return score;
}

export function isBuyerQualified(buyer: BuyerProfile): boolean {
  return calculateBuyerScore(buyer) >= BUYER_SCORE_THRESHOLD;
}

// ============================================================
// 2. SCORING VENDEUR (sur 100)
// ============================================================
// Urgence (1-5)              → jusqu'à 40 points
// Ancienneté (jours)         → jusqu'à 20 points
// Vente non-conditionnelle   → 20 points
// Rareté (1-5)               → jusqu'à 20 points
// Pas de seuil — utilisé pour le tri et l'affichage uniquement
// ============================================================

export function calculateSellerScore(property: Property): number {
  let score = 0;

  // Urgence : 1-5 mappé sur 0-40
  score += (property.urgency_level / 5) * 40;

  // Ancienneté : plus le bien est ancien, plus le vendeur est motivé
  // 0 jours = 0 pts, >= 90 jours = 20 pts max
  const ageFactor = Math.min(property.listing_age_days / 90, 1);
  score += ageFactor * 20;

  // Vente non-conditionnelle = 20 pts
  if (!property.is_conditional_sale) {
    score += 20;
  }

  // Rareté : 1-5 mappé sur 0-20
  score += (property.rarity_score / 5) * 20;

  return Math.round(score);
}

/** @deprecated Le score vendeur n'est plus un filtre d'exclusion. Conservé pour rétro-compatibilité. */
export function isSellerQualified(_property: Property): boolean {
  return true; // Tous les biens sont éligibles au matching
}

// ============================================================
// 3. ALGORITHME DE MATCHING
// ============================================================
// Zone OK                          → +20
// Prix <= Budget                   → +30
// Type de bien OK                  → +20
// Surface dans fourchette          → +10
// + (Score Acheteur * 0.1)         → jusqu'à +10
// + (Score Vendeur * 0.1)          → jusqu'à +10
// Match si Score Global >= 70
// ============================================================

export interface MatchResult {
  property: Property;
  matchScore: number;
  buyerScore: number;
  sellerScore: number;
  isMatch: boolean;
  matchedCriteriaIndex?: number;
  details: {
    zoneMatch: boolean;
    priceMatch: boolean;
    typeMatch: boolean;
    surfaceMatch: boolean;
  };
}

// Vérifie si la surface du bien est dans la fourchette souhaitée
function checkSurfaceMatch(
  propertySurface: number,
  minSurface: number,
  maxSurface: number
): boolean {
  const hasMin = minSurface > 0;
  const hasMax = maxSurface > 0;

  if (hasMin && hasMax) {
    return propertySurface >= minSurface && propertySurface <= maxSurface;
  }
  if (hasMin) {
    return propertySurface >= minSurface;
  }
  if (hasMax) {
    return propertySurface <= maxSurface;
  }
  // Aucune contrainte de surface = toujours OK
  return true;
}

// Match avec un critère de recherche spécifique
function calculateMatchWithCriteria(
  buyer: BuyerProfile,
  property: Property,
  criteria: SearchCriteria,
  buyerScore: number,
  sellerScore: number
): { matchScore: number; details: { zoneMatch: boolean; priceMatch: boolean; typeMatch: boolean; surfaceMatch: boolean } } {
  let matchScore = 0;

  // Zone OK (+20)
  // Zone : même localité, ou localité située dans le canton recherché
  const wantedCanton = cantonOfZone(criteria.desired_zone);
  const zoneMatch =
    criteria.desired_zone.toLowerCase() === property.zone.toLowerCase() ||
    (wantedCanton !== null && cantonOfCommune(property.zone) === wantedCanton);
  if (zoneMatch) matchScore += 20;

  // Prix <= Budget (+30)
  const priceMatch = property.price <= criteria.budget_max;
  if (priceMatch) matchScore += 30;

  // Type de bien OK (+20)
  const typeMatch = criteria.desired_property_type === property.property_type;
  if (typeMatch) matchScore += 20;

  // Surface dans fourchette (+10)
  const surfaceMatch = checkSurfaceMatch(
    property.surface_m2,
    criteria.desired_surface_min_m2,
    criteria.desired_surface_max_m2
  );
  if (surfaceMatch) matchScore += 10;

  // Bonus scores
  matchScore += buyerScore * 0.1;
  matchScore += sellerScore * 0.1;

  matchScore = Math.round(matchScore);

  return {
    matchScore,
    details: { zoneMatch, priceMatch, typeMatch, surfaceMatch },
  };
}

export function calculateMatchScore(
  buyer: BuyerProfile,
  property: Property
): MatchResult {
  const buyerScore = calculateBuyerScore(buyer);
  const sellerScore = calculateSellerScore(property);

  // Si le profil a des critères multiples, on teste chacun et on garde le meilleur
  const criteria = buyer.search_criteria && buyer.search_criteria.length > 0
    ? buyer.search_criteria
    : [{
        desired_zone: buyer.desired_zone,
        desired_property_type: buyer.desired_property_type,
        budget_max: buyer.budget_max,
        desired_surface_min_m2: buyer.desired_surface_m2 > 0 ? buyer.desired_surface_m2 - 10 : 0,
        desired_surface_max_m2: buyer.desired_surface_m2 > 0 ? buyer.desired_surface_m2 + 10 : 0,
      }];

  let bestResult = {
    matchScore: 0,
    details: { zoneMatch: false, priceMatch: false, typeMatch: false, surfaceMatch: false },
  };
  let bestCriteriaIndex = 0;

  for (let i = 0; i < criteria.length; i++) {
    const result = calculateMatchWithCriteria(buyer, property, criteria[i], buyerScore, sellerScore);
    if (result.matchScore > bestResult.matchScore) {
      bestResult = result;
      bestCriteriaIndex = i;
    }
  }

  return {
    property,
    matchScore: bestResult.matchScore,
    buyerScore,
    sellerScore,
    isMatch: bestResult.matchScore >= MATCH_SCORE_THRESHOLD,
    matchedCriteriaIndex: bestCriteriaIndex,
    details: bestResult.details,
  };
}

// ============================================================
// Fonction principale : trouve tous les matches pour un acheteur
// ============================================================

export function findMatchesForBuyer(
  buyer: BuyerProfile,
  properties: Property[]
): MatchResult[] {
  // Tous les biens actifs entrent dans l'algorithme (plus de filtre vendeur)
  const activeProperties = properties.filter((p) => p.is_active);

  // L'acheteur DOIT être qualifié (score >= 80) pour voir les biens
  if (!isBuyerQualified(buyer)) {
    return [];
  }

  // Calculer le score pour chaque propriété, filtrer les matches valides
  const results = activeProperties
    .map((property) => calculateMatchScore(buyer, property))
    .filter((result) => result.isMatch);

  // Tri : Score vendeur décroissant en priorité, puis score de match
  results.sort((a, b) => {
    if (b.sellerScore !== a.sellerScore) return b.sellerScore - a.sellerScore;
    return b.matchScore - a.matchScore;
  });

  return results;
}
