import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BadgeSwissFranc,
  CheckCircle2,
  Clock,
  Building2,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Handshake,
  Home,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Ruler,
  Star,
  UserRound,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { BuyerProfile, Property } from '../types';
import { PROPERTY_TYPE_LABELS } from '../types';
import { calculateBuyerScore, isBuyerQualified, findMatchesForBuyer } from '../utils/matching';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  getBuyerSearches,
  getMyBillingTerms,
  getMyContactRequests,
  getMyMatches,
  getMyProperties,
  proposeProperty,
  requestContact,
  respondContactRequest,
  setMyProfessional,
  setPropertyActive,
} from '../lib/api';
import type {
  BillingTerms,
  Contact,
  ContactRequest,
  Initiator,
  MatchDetails,
  RequestStatus,
  SellerProperty,
  SellerSearch,
  ServerMatch,
} from '../lib/api';
import Brand, { BRAND_NAME } from './Brand';
import SearchCard from './SearchCard';

// ============================================================
// Données de démonstration : affichées UNIQUEMENT sur la page /demo,
// jamais à une personne connectée.
// ============================================================
const DEMO_BUYER: BuyerProfile = {
  id: 'demo-buyer-1',
  user_id: 'demo-user-1',
  desired_zone: 'Lausanne',
  desired_property_type: 'apartment',
  budget_max: 950000,
  desired_surface_m2: 85,
  search_criteria: [
    {
      desired_zone: 'Lausanne',
      desired_property_type: 'apartment',
      budget_max: 950000,
      desired_surface_min_m2: 70,
      desired_surface_max_m2: 100,
    },
  ],
  personal_contribution: 200000,
  has_pre_approval: true,
  debt_ratio: 28,
  score: 0,
  created_at: '',
  updated_at: '',
};

const DEMO_PROPERTIES: Property[] = [
  {
    id: 'prop-1', seller_id: 'seller-1',
    title: 'Appartement lumineux au centre de Lausanne',
    description: '3.5 pièces rénové, vue lac, proche transports',
    property_type: 'apartment', zone: 'Lausanne', price: 890000, surface_m2: 82, rooms: 3.5,
    urgency_level: 4, listing_age_days: 45, is_conditional_sale: false, rarity_score: 4,
    score: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'prop-3', seller_id: 'seller-3',
    title: 'Duplex moderne à Lausanne-Flon',
    description: '4.5 pièces, terrasse, finitions haut de gamme',
    property_type: 'apartment', zone: 'Lausanne', price: 920000, surface_m2: 90, rooms: 4.5,
    urgency_level: 5, listing_age_days: 60, is_conditional_sale: false, rarity_score: 5,
    score: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'prop-5', seller_id: 'seller-5',
    title: 'Loft atypique à Lausanne',
    description: '2.5 pièces, ancien atelier, charme industriel',
    property_type: 'apartment', zone: 'Lausanne', price: 750000, surface_m2: 78, rooms: 2.5,
    urgency_level: 4, listing_age_days: 95, is_conditional_sale: false, rarity_score: 5,
    score: 0, is_active: true, created_at: '', updated_at: '',
  },
];

const chf = (n: number) => `${Number(n).toLocaleString('fr-CH')} CHF`;

// ============================================================
// Petits composants partagés
// ============================================================
function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/60 p-4 text-sm text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function EmptyBox({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800 p-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center text-slate-600">{icon}</div>
      <div className="mt-3 text-sm text-slate-400">{children}</div>
    </div>
  );
}

function ContactCard({ contact, label }: { contact: Contact; label: string }) {
  return (
    <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-sm">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-emerald-400">{label}</p>
      <p className="font-semibold text-slate-100">{contact.full_name || 'Nom non renseigné'}</p>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="mt-1 flex items-center gap-2 text-cyan-400 hover:underline">
          <Mail className="h-3.5 w-3.5" /> {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="mt-1 flex items-center gap-2 text-cyan-400 hover:underline">
          <Phone className="h-3.5 w-3.5" /> {contact.phone}
        </a>
      )}
    </div>
  );
}

function ScoreBadge({ score, threshold, label }: { score: number; threshold: number; label: string }) {
  const qualified = score >= threshold;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
      qualified ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
    }`}>
      {qualified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span>{label} : {score}/100</span>
    </div>
  );
}

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700">
        <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CriteriaBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      ok ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-500'
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ============================================================
// Carte du profil acheteur
// ============================================================
function BuyerScoreCard({ buyer, onEdit }: { buyer: BuyerProfile; onEdit?: () => void }) {
  const score = calculateBuyerScore(buyer);
  const qualified = isBuyerQualified(buyer);
  const contributionPct = buyer.budget_max > 0
    ? ((buyer.personal_contribution / buyer.budget_max) * 100).toFixed(1)
    : '0';
  const criteria = buyer.search_criteria ?? [];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg shadow-cyan-500/5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Votre profil acheteur</h2>
        <div className="flex items-center gap-3">
          {onEdit && qualified && buyer.share_search !== false && (
            <a
              href={`/recherche/${buyer.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-400 hover:text-cyan-400 hover:underline"
            >
              Voir ma recherche comme un vendeur
            </a>
          )}
          {onEdit && (
            <button onClick={onEdit} className="text-sm text-cyan-400 hover:underline">
              Mettre à jour
            </button>
          )}
          <ScoreBadge score={score} threshold={80} label={qualified ? 'Qualifié' : 'Non qualifié'} />
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <ScoreBar value={buyer.budget_max > 0 ? 40 : 0} max={40} label="Budget renseigné" />
        <ScoreBar value={parseFloat(contributionPct) >= 20 ? 20 : 0} max={20} label={`Apport (${contributionPct} %)`} />
        <ScoreBar value={buyer.has_pre_approval ? 30 : 0} max={30} label="Pré-approbation bancaire" />
        <ScoreBar value={buyer.debt_ratio <= 33 ? 10 : 0} max={10} label={`Endettement (${buyer.debt_ratio} %)`} />
      </div>

      {criteria.length > 0 && (
        <div className="mt-4 space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg bg-slate-900 p-3 text-center text-xs sm:grid-cols-4">
              <div>
                <p className="text-slate-400">Recherche {i + 1}</p>
                <p className="font-semibold text-cyan-400">{c.desired_zone}</p>
              </div>
              <div>
                <p className="text-slate-400">Budget max</p>
                <p className="font-semibold text-slate-100">{chf(c.budget_max)}</p>
              </div>
              <div>
                <p className="text-slate-400">Type</p>
                <p className="font-semibold text-slate-100">{PROPERTY_TYPE_LABELS[c.desired_property_type]}</p>
              </div>
              <div>
                <p className="text-slate-400">Surface</p>
                <p className="font-semibold text-slate-100">
                  {c.desired_surface_min_m2 > 0 && c.desired_surface_max_m2 > 0
                    ? `${c.desired_surface_min_m2} à ${c.desired_surface_max_m2} m²`
                    : c.desired_surface_min_m2 > 0
                      ? `dès ${c.desired_surface_min_m2} m²`
                      : c.desired_surface_max_m2 > 0
                        ? `jusqu'à ${c.desired_surface_max_m2} m²`
                        : 'Toute surface'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Carte d'un bien qui matche
// ============================================================
function SellerBadge({ sellerScore }: { sellerScore: number }) {
  if (sellerScore < 75) return null;
  const high = sellerScore >= 85;
  return (
    <div className={`absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${
      high ? 'bg-orange-500/90 text-white' : 'bg-amber-500/90 text-slate-900'
    }`}>
      {high ? <><Zap className="h-3 w-3" /> Opportunité rapide</> : <><Flame className="h-3 w-3" /> Vendeur motivé</>}
    </div>
  );
}

interface CardData {
  property: Omit<Property, 'seller_id'>;
  matchScore: number;
  sellerScore: number;
  details: MatchDetails;
  requestStatus: RequestStatus | null;
  initiatedBy: Initiator | null;
  contact: Contact | null;
  sellerType?: 'owner' | 'professional';
}

function MatchCard({
  data,
  onRequest,
  onRespond,
  busy,
  demo,
  preview,
}: {
  data: CardData;
  onRequest?: () => void;
  onRespond?: (accept: boolean) => void;
  busy?: boolean;
  demo?: boolean;
  /** Aperçu par le vendeur : pas de score de matching, bouton inactif */
  preview?: boolean;
}) {
  const { property, matchScore, sellerScore, details, requestStatus, initiatedBy, contact, sellerType } = data;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 shadow-lg shadow-cyan-500/5 transition-all hover:border-cyan-500/50 hover:shadow-cyan-500/10">
      <div className="relative flex h-40 items-center justify-center rounded-t-2xl bg-gradient-to-br from-cyan-950 to-slate-800">
        <Home className="h-12 w-12 text-cyan-700" />
        {!preview && (
          <div className="absolute right-3 top-3 rounded-full bg-slate-900/90 px-3 py-1 text-sm font-bold text-cyan-400 shadow-sm backdrop-blur-sm">
            {matchScore}/100
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-2.5 py-1 text-xs font-medium text-slate-950">
          Off-market
        </div>
        <SellerBadge sellerScore={sellerScore} />
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div>
          <h3 className="font-semibold leading-tight text-slate-100">{property.title}</h3>
          {property.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{property.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {property.zone}</span>
          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {property.surface_m2} m²</span>
          {property.rooms ? <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {property.rooms} p.</span> : null}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1 text-lg font-bold text-slate-100">
            <BadgeSwissFranc className="h-5 w-5 text-cyan-500" />
            {Number(property.price).toLocaleString('fr-CH')}
          </span>
          <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-400">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </span>
        </div>

        {preview ? (
          <p className="text-xs text-slate-500">
            Ici, l'acheteur voit son score de matching et les critères qui correspondent à sa recherche.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <CriteriaBadge ok={details.zone} label="Zone" />
            <CriteriaBadge ok={details.price} label="Prix" />
            <CriteriaBadge ok={details.type} label="Type" />
            <CriteriaBadge ok={details.surface} label="Surface" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Motivation vendeur : {sellerScore}/100
          </span>
          {sellerType && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-900 px-2 py-0.5 text-slate-300">
              {sellerType === 'professional' ? (
                <><Building2 className="h-3.5 w-3.5" /> Professionnel</>
              ) : (
                <><UserRound className="h-3.5 w-3.5" /> Propriétaire</>
              )}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2">
          {contact ? (
            <ContactCard contact={contact} label="Mise en relation acceptée" />
          ) : requestStatus === 'pending' && initiatedBy === 'seller' ? (
            <div className="rounded-xl border border-cyan-700 bg-cyan-950/40 p-3">
              <p className="text-sm font-medium text-cyan-300">Le vendeur vous propose ce bien</p>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => onRespond?.(false)}
                  className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Décliner
                </button>
                <button
                  disabled={busy}
                  onClick={() => onRespond?.(true)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
                >
                  Accepter
                </button>
              </div>
            </div>
          ) : requestStatus === 'pending' ? (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm text-amber-300">
              <Clock className="h-4 w-4" /> Demande envoyée, en attente de réponse
            </p>
          ) : requestStatus === 'declined' ? (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm text-slate-400">
              <XCircle className="h-4 w-4" />
              {initiatedBy === 'seller' ? 'Vous avez décliné cette proposition' : 'Demande déclinée par le vendeur'}
            </p>
          ) : (
            <button
              onClick={onRequest}
              disabled={busy || demo || preview}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Handshake className="h-4 w-4" />
              {demo
                ? 'Disponible après inscription'
                : busy
                  ? 'Envoi...'
                  : 'Demander une mise en relation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vue acheteur
// ============================================================
function BuyerView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [matches, setMatches] = useState<ServerMatch[]>([]);
  const [qualified, setQualified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState<'all' | 'owner' | 'professional'>('all');

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setError(null);
    try {
      const { data: bp, error: bpErr } = await supabase
        .from('buyer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (bpErr) throw new Error(bpErr.message);
      setProfile((bp as BuyerProfile | null) ?? null);

      if (bp) {
        const res = await getMyMatches();
        setQualified(res.qualified);
        setMatches(res.matches);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRequest(propertyId: string) {
    setBusyId(propertyId);
    setError(null);
    try {
      await requestContact(propertyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "La demande n'a pas pu être envoyée.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRespond(propertyId: string, requestId: string | null, accept: boolean) {
    if (!requestId) return;
    setBusyId(propertyId);
    setError(null);
    try {
      await respondContactRequest(requestId, accept);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "La réponse n'a pas pu être enregistrée.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-500">Chargement...</div>;

  if (!profile) {
    return (
      <>
        {error && <ErrorBox message={error} />}
        <div className="rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-800 p-8 text-center">
          <Plus className="mx-auto h-10 w-10 text-cyan-500/60" />
          <h2 className="mt-3 text-lg font-semibold text-slate-100">Créez votre profil acheteur</h2>
          <p className="mt-1 text-sm text-slate-400">
            Indiquez vos critères de recherche et votre situation financière pour accéder aux biens off-market.
          </p>
          <button
            onClick={() => navigate('/buyer/new')}
            className="mt-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-cyan-500"
          >
            Créer mon profil acheteur
          </button>
        </div>
      </>
    );
  }

  const shown = sellerFilter === 'all' ? matches : matches.filter((m) => m.seller_type === sellerFilter);
  const exactCount = matches.filter((m) => m.details.zone).length;

  return (
    <>
      {error && <ErrorBox message={error} />}
      <BuyerScoreCard buyer={profile} onEdit={() => navigate('/buyer/new')} />

      <section>
        <h2 className="text-lg font-semibold text-slate-100">Vos matchs</h2>
        <p className="mb-4 text-sm text-slate-400">
          {qualified
            ? `${exactCount} bien${exactCount > 1 ? 's' : ''} dans votre zone${matches.length > exactCount ? `, ${matches.length - exactCount} hors zone` : ''}.`
            : 'Les biens sont accessibles à partir de 80 points.'}
        </p>

        {!qualified ? (
          <EmptyBox icon={<Lock className="h-10 w-10" />}>
            Votre score acheteur est inférieur à 80/100. Complétez votre profil (apport, pré-approbation bancaire)
            pour accéder aux biens.
          </EmptyBox>
        ) : matches.length === 0 ? (
          <EmptyBox icon={<Home className="h-10 w-10" />}>
            Aucun bien ne correspond à votre recherche pour le moment. Revenez bientôt : de nouveaux biens sont
            ajoutés par les régies partenaires.
          </EmptyBox>
        ) : (
          <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de vendeur">
            {([
              ['all', 'Tous les vendeurs'],
              ['owner', 'Propriétaires uniquement'],
              ['professional', 'Professionnels uniquement'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSellerFilter(value)}
                aria-pressed={sellerFilter === value}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  sellerFilter === value
                    ? 'bg-cyan-500 font-semibold text-slate-950'
                    : 'border border-slate-600 text-slate-300 hover:border-cyan-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {shown.length === 0 && (
            <p className="rounded-xl bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">
              Aucun bien de ce type parmi vos matchs.
            </p>
          )}
          {[
            {
              key: 'exact',
              title: 'Matching exact',
              help: 'Dans la localité que vous recherchez.',
              list: shown.filter((m) => m.details.zone),
            },
            {
              key: 'hors-zone',
              title: 'Matching hors zone',
              help: 'Ces biens correspondent à votre recherche, mais se trouvent dans une autre localité.',
              list: shown.filter((m) => !m.details.zone),
            },
          ]
            .filter((group) => group.list.length > 0)
            .map((group) => (
              <div key={group.key} className="mb-8">
                <h3 className="text-base font-semibold text-slate-100">
                  {group.title} <span className="font-normal text-slate-500">({group.list.length})</span>
                </h3>
                <p className="mb-3 text-sm text-slate-400">{group.help}</p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.list.map((m) => (
              <MatchCard
                key={m.property.id}
                data={{
                  property: m.property,
                  sellerType: m.seller_type,
                  matchScore: m.match_score,
                  sellerScore: m.seller_score,
                  details: m.details,
                  requestStatus: m.request_status,
                  initiatedBy: m.initiated_by,
                  contact: m.contact,
                }}
                busy={busyId === m.property.id}
                onRequest={() => handleRequest(m.property.id)}
                onRespond={(accept) => handleRespond(m.property.id, m.request_id, accept)}
              />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </section>
    </>
  );
}

// ============================================================
// Tarifs : ce qu'une mise en relation acceptée coûte au vendeur
// ============================================================
const money = (n: number) => `${Number(n).toLocaleString('fr-CH')} CHF hors TVA`;

/** Phrases affichées au vendeur avant qu'il accepte ou propose. `terms` vaut null si la base ne les fournit pas. */
function billingLines(terms: BillingTerms | null): string[] {
  if (!terms) return ['Gratuit pendant le projet pilote.'];
  const later = {
    per_contact: `${money(terms.per_contact_chf)} par mise en relation acceptée.`,
    subscription: `inclus dans votre abonnement de ${money(terms.subscription_chf)} par mois (plus de ${terms.subscription_above} biens actifs).`,
    owner_success: `aucun frais à la mise en relation ; ${money(terms.owner_success_chf)} uniquement si le bien est vendu grâce au réseau.`,
  }[terms.rule];
  if (terms.pilot) {
    return ['Gratuit pendant le projet pilote, jusqu\'au 31 décembre 2026.', `À partir du 1er janvier 2027 : ${later}`];
  }
  if (terms.rule === 'per_contact') return [`Cette mise en relation vous sera facturée ${money(terms.fee_chf)}.`];
  if (terms.rule === 'subscription') {
    return [`Cette mise en relation est incluse dans votre abonnement de ${money(terms.subscription_chf)} par mois.`];
  }
  return [
    'Aucun frais pour cette mise en relation.',
    `${money(terms.owner_success_chf)} seront dus uniquement si le bien est vendu grâce au réseau.`,
  ];
}

function billingNote(r: ContactRequest): string | null {
  if (r.status !== 'accepted' || !r.billing_rule) return null;
  if (r.billing_rule === 'pilot') return 'Gratuit (projet pilote)';
  if (r.billing_rule === 'per_contact') return `Facturé ${money(r.fee_chf ?? 0)}`;
  if (r.billing_rule === 'subscription') return 'Inclus dans votre abonnement';
  return 'Aucun frais à la mise en relation';
}

function ConfirmDialog({
  title,
  lines,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  lines: string[];
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-confirmation"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <h3 id="titre-confirmation" className="text-lg font-semibold text-slate-100">{title}</h3>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-800 p-4 text-sm leading-relaxed text-slate-200">
          {lines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-semibold text-cyan-300' : 'text-slate-300'}>{line}</p>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Les coordonnées sont échangées dès que les deux parties ont accepté.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            autoFocus
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vue vendeur / régie
// ============================================================
function SellerView() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [isPro, setIsPro] = useState(Boolean(user?.is_professional));

  // Case cochée à l'inscription : on l'enregistre à la première visite de l'espace vendeur
  useEffect(() => {
    if (session?.user.user_metadata?.is_professional === true && user && !user.is_professional) {
      setMyProfessional(true)
        .then(() => setIsPro(true))
        .catch(() => undefined);
    }
  }, [session, user]);

  const [properties, setProperties] = useState<SellerProperty[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [searches, setSearches] = useState<SellerSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [terms, setTerms] = useState<BillingTerms | null>(null);
  // Action en attente de confirmation : accepter une demande ou proposer un bien
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'accept'; id: string; title: string }
    | { kind: 'propose'; id: string; propertyId: string; searchId: string; title: string }
    | null
  >(null);

  async function copyLink(searchId: string) {
    const link = `${window.location.origin}/recherche/${searchId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(searchId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt('Copiez ce lien :', link);
    }
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const [props, reqs, srch] = await Promise.all([
        getMyProperties(),
        getMyContactRequests(),
        getBuyerSearches(),
      ]);
      setProperties(props);
      setRequests(reqs);
      setSearches(srch);
      // Conditions tarifaires : si la base ne les fournit pas encore, on affiche le texte du pilote
      getMyBillingTerms().then(setTerms).catch(() => setTerms(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'action n'a pas abouti.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-500">Chargement...</div>;

  const pending = requests.filter((r) => r.status === 'pending' && r.initiated_by === 'buyer').length;

  return (
    <>
      {error && <ErrorBox message={error} />}

      {previewId &&
        (() => {
          const item = properties.find((x) => x.property.id === previewId);
          if (!item) return null;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4"
              onClick={() => setPreviewId(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titre-apercu"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 id="titre-apercu" className="text-sm font-semibold text-slate-200">
                    Votre bien vu par un acheteur
                  </h3>
                  <button
                    onClick={() => setPreviewId(null)}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Fermer
                  </button>
                </div>
                <MatchCard
                  preview
                  data={{
                    property: item.property,
                    sellerType: isPro ? 'professional' : 'owner',
                    matchScore: 0,
                    sellerScore: item.seller_score,
                    details: { zone: true, price: true, type: true, surface: true },
                    requestStatus: null,
                    initiatedBy: null,
                    contact: null,
                  }}
                />
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Seuls les acheteurs qualifiés dont la recherche correspond voient ce bien. Votre nom et vos
                  coordonnées restent masqués jusqu'à la mise en relation.
                </p>
              </div>
            </div>
          );
        })()}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === 'accept'
              ? `Accepter la mise en relation pour « ${confirm.title} » ?`
              : `Proposer « ${confirm.title} » à cet acheteur ?`
          }
          lines={
            confirm.kind === 'accept'
              ? billingLines(terms)
              : ["Si l'acheteur accepte, la mise en relation est établie.", ...billingLines(terms)]
          }
          confirmLabel={confirm.kind === 'accept' ? 'Confirmer et accepter' : 'Confirmer et proposer'}
          busy={busyId === confirm.id}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const c = confirm;
            run(c.id, () =>
              c.kind === 'accept' ? respondContactRequest(c.id, true) : proposeProperty(c.propertyId, c.searchId),
            ).finally(() => setConfirm(null));
          }}
        />
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4">
        <input
          type="checkbox"
          checked={isPro}
          disabled={busyId === 'pro'}
          onChange={(e) => {
            const value = e.target.checked;
            run('pro', async () => {
              await setMyProfessional(value);
              setIsPro(value);
            });
          }}
          className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
        />
        <span className="text-sm text-slate-200">
          Je suis un professionnel de l'immobilier (régie, courtier)
          <span className="mt-0.5 block text-xs text-slate-400">
            {isPro
              ? 'Vos biens sont présentés aux acheteurs avec la mention « Professionnel ». Votre nom reste masqué jusqu\'à la mise en relation.'
              : 'Vos biens sont présentés aux acheteurs avec la mention « Propriétaire ».'}
          </span>
        </span>
      </label>

      <section>
        <h2 className="text-lg font-semibold text-slate-100">Mises en relation</h2>
        <p className="mb-4 text-sm text-slate-400">
          {pending > 0
            ? `${pending} demande${pending > 1 ? 's' : ''} en attente de votre réponse.`
            : 'Les coordonnées ne sont échangées que lorsque les deux parties sont d\'accord.'}
        </p>

        {requests.length === 0 ? (
          <EmptyBox icon={<Handshake className="h-10 w-10" />}>
            Aucune mise en relation pour le moment. Proposez un de vos biens à un acheteur ci-dessous, ou attendez
            qu'un acheteur qualifié en fasse la demande.
          </EmptyBox>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100">{r.property_title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Acheteur <span className="text-slate-200">{r.buyer_pseudo || 'anonyme'}</span>
                      {' · '}score acheteur {r.buyer_score}/100
                      {' · '}matching {r.match_score}/100
                      {r.has_pre_approval ? ' · pré-approbation bancaire déclarée' : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.initiated_by === 'seller' ? 'Proposée par vous le ' : 'Demande reçue le '}
                      {new Date(r.created_at).toLocaleDateString('fr-CH')}
                      {billingNote(r) ? ` · ${billingNote(r)}` : ''}
                    </p>
                  </div>

                  {r.status === 'pending' && r.initiated_by === 'seller' && (
                    <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs text-amber-300">
                      <Clock className="h-3.5 w-3.5" /> En attente de l'acheteur
                    </span>
                  )}
                  {r.status === 'pending' && r.initiated_by === 'buyer' && (
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => run(r.id, () => respondContactRequest(r.id, false))}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                      >
                        Décliner
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => setConfirm({ kind: 'accept', id: r.id, title: r.property_title })}
                        className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
                      >
                        Accepter
                      </button>
                    </div>
                  )}
                  {r.status === 'declined' && (
                    <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-400">Déclinée</span>
                  )}
                </div>
                {r.contact && (
                  <div className="mt-3">
                    <ContactCard contact={r.contact} label="Mise en relation acceptée : coordonnées de l'acheteur" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-100">Acheteurs en recherche</h2>
        <p className="mb-4 text-sm text-slate-400">
          {searches.length > 0
            ? `${searches.length} acheteur${searches.length > 1 ? 's' : ''} qualifié${searches.length > 1 ? 's' : ''} recherche${searches.length > 1 ? 'nt' : ''} un bien en ce moment. Leur identité reste masquée jusqu'à la mise en relation.`
            : 'Les recherches des acheteurs qualifiés apparaîtront ici.'}
        </p>

        {searches.length === 0 ? (
          <EmptyBox icon={<Users className="h-10 w-10" />}>
            Aucune recherche active pour le moment.
          </EmptyBox>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {searches.map((s) => (
              <SearchCard key={s.id} search={s} score={s.buyer_score}>
                <div className="space-y-2">
                  {s.my_properties.length === 0 ? (
                    <button
                      onClick={() => navigate('/seller/new')}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-600 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-950"
                    >
                      <Plus className="h-4 w-4" /> Ajouter un bien correspondant
                    </button>
                  ) : (
                    s.my_properties.map((mp) => (
                      <div key={mp.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900 px-3 py-2">
                        <span className="min-w-0 text-sm">
                          <span className="block truncate text-slate-200">{mp.title}</span>
                          <span className="text-xs text-slate-500">
                            Matching {mp.match_score}/100
                            {mp.zone_match === false && <span className="text-amber-300"> · hors zone</span>}
                          </span>
                        </span>
                        {mp.request_status === null ? (
                          <button
                            disabled={busyId === `${s.id}:${mp.id}`}
                            onClick={() =>
                              setConfirm({
                                kind: 'propose',
                                id: `${s.id}:${mp.id}`,
                                propertyId: mp.id,
                                searchId: s.id,
                                title: mp.title,
                              })
                            }
                            className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
                          >
                            Proposer ce bien
                          </button>
                        ) : (
                          <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                            {mp.request_status === 'pending'
                              ? 'En attente'
                              : mp.request_status === 'accepted'
                                ? 'En relation'
                                : 'Sans suite'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => copyLink(s.id)}
                    className="flex w-full items-center justify-center gap-2 py-1.5 text-xs text-slate-400 hover:text-cyan-400"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === s.id ? 'Lien copié' : 'Copier le lien à transférer à un propriétaire'}
                  </button>
                </div>
              </SearchCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Vos biens</h2>
            <p className="text-sm text-slate-400">
              {properties.length} bien{properties.length > 1 ? 's' : ''} enregistré{properties.length > 1 ? 's' : ''}.
              Ils ne sont visibles que des acheteurs qualifiés dont la recherche correspond.
            </p>
          </div>
          <button
            onClick={() => navigate('/seller/new')}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500"
          >
            <Plus className="h-4 w-4" /> Ajouter un bien
          </button>
        </div>

        {properties.length === 0 ? (
          <EmptyBox icon={<Home className="h-10 w-10" />}>
            Vous n'avez pas encore ajouté de bien. Ajoutez-en un pour voir combien d'acheteurs qualifiés
            correspondent.
          </EmptyBox>
        ) : (
          <ul className="space-y-3">
            {properties.map(({ property: p, matching_buyers, pending_requests, seller_score }) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-slate-800 p-4 ${
                  p.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100">{p.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {p.zone} · {PROPERTY_TYPE_LABELS[p.property_type]} · {p.surface_m2} m² · {chf(p.price)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Score vendeur {seller_score}/100 · {p.is_active ? 'Actif' : 'Retiré du réseau'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm text-cyan-400">
                    <Users className="h-4 w-4" />
                    {matching_buyers} acheteur{matching_buyers > 1 ? 's' : ''} qualifié{matching_buyers > 1 ? 's' : ''}
                  </span>
                  {pending_requests > 0 && (
                    <span className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
                      {pending_requests} en attente
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewId(p.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-950"
                  >
                    <Eye className="h-4 w-4" /> Aperçu
                  </button>
                  <button
                    disabled={busyId === p.id}
                    onClick={() => run(p.id, () => setPropertyActive(p.id, !p.is_active))}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {p.is_active ? <><EyeOff className="h-4 w-4" /> Retirer</> : <><Eye className="h-4 w-4" /> Réactiver</>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ============================================================
// Vue démonstration (page /demo, sans connexion)
// ============================================================
function DemoView() {
  const matches = useMemo(() => findMatchesForBuyer(DEMO_BUYER, DEMO_PROPERTIES), []);
  return (
    <>
      <p className="rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        Démonstration : le profil et les biens ci-dessous sont fictifs.
      </p>
      <BuyerScoreCard buyer={DEMO_BUYER} />
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Exemple de matchs</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard
              key={m.property.id}
              demo
              data={{
                property: m.property,
                matchScore: m.matchScore,
                sellerScore: m.sellerScore,
                details: {
                  zone: m.details.zoneMatch,
                  price: m.details.priceMatch,
                  type: m.details.typeMatch,
                  surface: m.details.surfaceMatch,
                },
                requestStatus: null,
                initiatedBy: null,
                contact: null,
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}

// ============================================================
// Tableau de bord
// ============================================================
export default function Dashboard({ demo = false }: { demo?: boolean }) {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/auth', { replace: true });
  }

  // Un même compte peut acheter et vendre : deux onglets, le premier affiché
  // dépend du choix fait à l'inscription puis de la dernière visite.
  const [tab, setTab] = useState<'buy' | 'sell'>(() => {
    try {
      const saved = localStorage.getItem('om_onglet');
      if (saved === 'buy' || saved === 'sell') return saved;
    } catch {
      // stockage indisponible : on garde le choix par défaut
    }
    return 'buy';
  });
  const [tabChosen, setTabChosen] = useState(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('om_onglet');
    } catch {
      saved = null;
    }
    if (!tabChosen && !saved && user?.role === 'seller') setTab('sell');
  }, [user, tabChosen]);

  function chooseTab(next: 'buy' | 'sell') {
    setTab(next);
    setTabChosen(true);
    try {
      localStorage.setItem('om_onglet', next);
    } catch {
      // sans stockage, le choix vaut pour cette visite
    }
  }

  let content: ReactNode;
  if (demo) {
    content = <DemoView />;
  } else if (!user) {
    // Session ouverte mais fiche utilisateur introuvable : on n'affiche jamais de données fictives.
    content = (
      <ErrorBox message="Votre compte n'a pas pu être chargé. Déconnectez-vous puis reconnectez-vous ; si le problème persiste, contactez-nous." />
    );
  } else {
    content = (
      <>
        <div className="flex gap-2 border-b border-slate-800" role="tablist" aria-label="Mon espace">
          {([
            ['buy', "J'achète"],
            ['sell', 'Je vends'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => chooseTab(value)}
              className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold ${
                tab === value
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'sell' ? <SellerView /> : <BuyerView />}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <button onClick={() => navigate(demo ? '/' : '/dashboard')} aria-label={BRAND_NAME}>
            <Brand />
          </button>
          <div className="flex items-center gap-4">
            {demo ? (
              <button
                onClick={() => navigate('/auth?mode=inscription')}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-cyan-500"
              >
                Demander mon accès
              </button>
            ) : (
              <>
                {user && (
                  <span className="text-sm text-slate-400">
                    {user.pseudo || user.full_name}
                  </span>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-400 hover:bg-cyan-500/20"
                  >
                    Suivi des ventes
                  </button>
                )}
                {(user || session) && (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-8">{content}</main>

      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-500">
        {BRAND_NAME} · Réseau immobilier off-market
      </footer>
    </div>
  );
}
