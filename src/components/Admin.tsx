import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Eye, EyeOff, Home, Mail, Phone, PhoneCall, Trash2, XCircle } from 'lucide-react';
import { adminDeleteProperty, adminGetFollowups, adminGetProperties, adminRecordCall, adminSetPropertyActive } from '../lib/api';
import type { AdminProperty, CallOutcome, Followup } from '../lib/api';
import { PROPERTY_TYPE_LABELS } from '../types';
import Brand, { BRAND_NAME } from './Brand';

const chf = (n: number) => `${Number(n).toLocaleString('fr-CH')} CHF`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-CH') : '');

const GROUPS: { key: Followup['priority']; title: string; help: string }[] = [
  {
    key: 'urgent',
    title: 'À appeler en urgence',
    help: 'Le bien a été retiré du réseau après la mise en relation : la vente est probable.',
  },
  { key: 'due', title: 'À appeler maintenant', help: 'La date de rappel est atteinte.' },
  { key: 'later', title: 'Rappels à venir', help: 'Rien à faire avant la date indiquée.' },
  { key: 'closed', title: 'Dossiers clos', help: 'Le résultat est connu.' },
];

function PersonLine({
  role,
  p,
}: {
  role: string;
  p: { full_name: string | null; email: string | null; phone: string | null };
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-900 p-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{role}</p>
      <p className="mt-0.5 font-semibold text-slate-100">{p.full_name || 'Nom non renseigné'}</p>
      {p.phone ? (
        <a href={`tel:${p.phone}`} className="mt-1 flex items-center gap-2 text-cyan-400 hover:underline">
          <Phone className="h-3.5 w-3.5" /> {p.phone}
        </a>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Pas de téléphone enregistré</p>
      )}
      {p.email && (
        <a href={`mailto:${p.email}`} className="mt-1 flex items-center gap-2 break-all text-cyan-400 hover:underline">
          <Mail className="h-3.5 w-3.5 shrink-0" /> {p.email}
        </a>
      )}
    </div>
  );
}

function billingLabel(f: Followup): string {
  if (f.billing_rule === 'pilot') return 'Gratuit (pilote)';
  if (f.billing_rule === 'per_contact') return `${chf(f.fee_chf)} hors TVA, mise en relation`;
  if (f.billing_rule === 'subscription') return 'Inclus dans un abonnement';
  if (f.billing_rule === 'owner_success') {
    return f.fee_chf > 0 ? `${chf(f.fee_chf)} hors TVA, vente` : 'Forfait dû si le bien est vendu';
  }
  return 'Non défini';
}

function FollowupCard({
  f,
  busy,
  onRecord,
}: {
  f: Followup;
  busy: boolean;
  onRecord: (outcome: CallOutcome, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const closed = f.priority === 'closed';

  return (
    <li
      className={`rounded-2xl border bg-slate-800 p-5 ${
        f.priority === 'urgent' ? 'border-red-700' : f.priority === 'due' ? 'border-amber-600' : 'border-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100">{f.property.title}</p>
          <p className="mt-0.5 text-sm text-slate-400">
            {f.property.zone} · {chf(f.property.price)} · mise en relation du {day(f.accepted_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {f.probable_sale && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950 px-3 py-1 text-xs font-semibold text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Probablement vendu
              {f.property.deactivated_at ? ` · retiré le ${day(f.property.deactivated_at)}` : ''}
            </span>
          )}
          {f.sale_status === 'sold' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Vendu
            </span>
          )}
          {f.sale_status === 'not_sold' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
              <XCircle className="h-3.5 w-3.5" /> Pas de vente
            </span>
          )}
          {!closed && f.next_call_at && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5" /> Rappel le {day(f.next_call_at)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PersonLine role="Acheteur à appeler" p={f.buyer} />
        <PersonLine role={f.seller.is_professional ? 'Vendeur (professionnel)' : 'Vendeur (propriétaire)'} p={f.seller} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Facturation : {billingLabel(f)}
        {f.last_call_at ? ` · dernier appel le ${day(f.last_call_at)}` : ''}
        {f.call_note ? ` · « ${f.call_note} »` : ''}
      </p>

      {!closed && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <label htmlFor={`note-${f.id}`} className="mb-1 block text-xs text-slate-400">
            Note de l'appel (facultatif)
          </label>
          <input
            id={`note-${f.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. : visite faite, offre en cours"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => onRecord('sold', note)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Vendu grâce au réseau
            </button>
            <button
              disabled={busy}
              onClick={() => onRecord('callback', note)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              Rappeler dans 30 jours
            </button>
            <button
              disabled={busy}
              onClick={() => onRecord('not_sold', note)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              Pas de vente, clore
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ------------------------------------------------------------
// Onglet Annonces : toutes les annonces du réseau
// ------------------------------------------------------------
function PropertiesTab() {
  const [items, setItems] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminProperty | null>(null);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await adminGetProperties());
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

  const active = items.filter((i) => i.property.is_active).length;
  const shown = items.filter((i) =>
    filter === 'all' ? true : filter === 'active' ? i.property.is_active : !i.property.is_active,
  );

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-400">
        {loading
          ? 'Chargement...'
          : `${items.length} annonce${items.length > 1 ? 's' : ''}, dont ${active} active${active > 1 ? 's' : ''}.`}
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les annonces">
        {([
          ['active', 'Actives'],
          ['inactive', 'Retirées'],
          ['all', 'Toutes'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === value
                ? 'bg-cyan-500 font-semibold text-slate-950'
                : 'border border-slate-600 text-slate-300 hover:border-cyan-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-900 bg-red-950/60 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-800 p-10 text-center text-sm text-slate-400">
          Aucune annonce dans cette catégorie.
        </p>
      )}

      <ul className="space-y-3">
        {shown.map(({ property: p, seller, pending_requests, accepted_requests }) => (
          <li
            key={p.id}
            className={`rounded-2xl border bg-slate-800 p-4 ${p.is_active ? 'border-slate-700' : 'border-slate-800 opacity-70'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-100">
                  <Home className="h-4 w-4 shrink-0 text-cyan-500" /> {p.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {p.zone} · {PROPERTY_TYPE_LABELS[p.property_type] ?? p.property_type} · {p.surface_m2} m² ·{' '}
                  {chf(p.price)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {seller.full_name || 'Vendeur sans nom'} ({seller.is_professional ? 'professionnel' : 'propriétaire'})
                  {seller.email ? ` · ${seller.email}` : ''}
                  {seller.phone ? ` · ${seller.phone}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ajoutée le {day(p.created_at)} · {p.is_active ? 'Active' : 'Retirée'}
                  {accepted_requests > 0 ? ` · ${accepted_requests} mise${accepted_requests > 1 ? 's' : ''} en relation` : ''}
                  {pending_requests > 0 ? ` · ${pending_requests} en attente` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busyId === p.id}
                  onClick={() => run(p.id, () => adminSetPropertyActive(p.id, !p.is_active))}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  {p.is_active ? <><EyeOff className="h-4 w-4" /> Retirer</> : <><Eye className="h-4 w-4" /> Réactiver</>}
                </button>
                <button
                  disabled={busyId === p.id || accepted_requests > 0}
                  title={accepted_requests > 0 ? 'Déjà mise en relation : retirez-la plutôt' : undefined}
                  onClick={() => setConfirmDelete(items.find((i) => i.property.id === p.id) ?? null)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-suppression"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
          >
            <h3 id="titre-suppression" className="text-lg font-semibold text-slate-100">
              Supprimer « {confirmDelete.property.title} » ?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              L'annonce et les demandes en attente qui la concernent seront effacées définitivement. Pour la masquer
              sans rien perdre, utilisez plutôt « Retirer ».
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                autoFocus
                disabled={busyId === confirmDelete.property.id}
                onClick={() => {
                  const id = confirmDelete.property.id;
                  run(id, () => adminDeleteProperty(id)).finally(() => setConfirmDelete(null));
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Page réservée à l'administrateur : suivi téléphonique des mises en relation
// acceptées, pour savoir si un bien a été vendu grâce au réseau.
export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'sales' | 'properties'>('sales');
  const [items, setItems] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await adminGetFollowups());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function record(id: string, outcome: CallOutcome, note: string) {
    setBusyId(id);
    setError(null);
    try {
      await adminRecordCall(id, outcome, note);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'appel n'a pas pu être noté.");
    } finally {
      setBusyId(null);
    }
  }

  const toCall = items.filter((i) => i.priority === 'urgent' || i.priority === 'due').length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Mon espace
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <div className="flex gap-2 border-b border-slate-800" role="tablist" aria-label="Administration">
          {([
            ['sales', 'Suivi des ventes'],
            ['properties', 'Annonces'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold ${
                tab === value ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'properties' ? (
          <PropertiesTab />
        ) : (
        <>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
            <PhoneCall className="h-6 w-6 text-cyan-400" /> Suivi des ventes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {loading
              ? 'Chargement...'
              : `${items.length} mise${items.length > 1 ? 's' : ''} en relation acceptée${items.length > 1 ? 's' : ''}, ${toCall} appel${toCall > 1 ? 's' : ''} à passer.`}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-900 bg-red-950/60 p-4 text-sm text-red-300">
            {error}
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-800 p-10 text-center text-sm text-slate-400">
            Aucune mise en relation acceptée pour le moment.
          </p>
        )}

        {GROUPS.map((g) => {
          const list = items.filter((i) => i.priority === g.key);
          if (list.length === 0) return null;
          return (
            <section key={g.key}>
              <h2 className="text-lg font-semibold text-slate-100">
                {g.title} <span className="font-normal text-slate-500">({list.length})</span>
              </h2>
              <p className="mb-3 text-sm text-slate-400">{g.help}</p>
              <ul className="space-y-4">
                {list.map((f) => (
                  <FollowupCard
                    key={f.id}
                    f={f}
                    busy={busyId === f.id}
                    onRecord={(outcome, note) => record(f.id, outcome, note)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        {BRAND_NAME} · Administration
      </footer>
    </div>
  );
}
