import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Mail, Phone, PhoneCall, XCircle } from 'lucide-react';
import { adminGetFollowups, adminRecordCall } from '../lib/api';
import type { CallOutcome, Followup } from '../lib/api';
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

// Page réservée à l'administrateur : suivi téléphonique des mises en relation
// acceptées, pour savoir si un bien a été vendu grâce au réseau.
export default function Admin() {
  const navigate = useNavigate();
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
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        {BRAND_NAME} · Administration
      </footer>
    </div>
  );
}
