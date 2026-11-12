import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getPublicSearch } from '../lib/api';
import type { BuyerSearch } from '../lib/api';
import Brand, { BRAND_NAME, DISPLAY_FONT } from './Brand';
import SearchCard from './SearchCard';

// Page publique d'une recherche d'acheteur : c'est le lien qu'une régie
// transfère à un propriétaire. On y voit l'essentiel, sans aucune identité ;
// pour proposer un bien, il faut un compte vendeur.
export default function SearchPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [search, setSearch] = useState<BuyerSearch | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    if (!id) {
      setState('missing');
      return;
    }
    getPublicSearch(id)
      .then((s) => {
        if (!alive) return;
        setSearch(s);
        setState(s ? 'ready' : 'missing');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [id]);

  const cta = session
    ? { label: 'Proposer un bien depuis mon espace', to: '/dashboard' }
    : { label: 'Créer mon compte vendeur et proposer un bien', to: '/auth?mode=inscription&role=seller' };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <button onClick={() => navigate('/')} aria-label={BRAND_NAME}>
          <Brand />
        </button>
        {!session && (
          <button onClick={() => navigate('/auth')} className="text-sm text-slate-300 hover:text-cyan-400">
            Se connecter
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        {state === 'loading' && <p className="py-20 text-center text-slate-500">Chargement...</p>}

        {(state === 'missing' || state === 'error') && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
            <p className="text-lg font-semibold text-slate-100">
              {state === 'missing' ? "Cette recherche n'est plus active" : 'Cette page est momentanément indisponible'}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {state === 'missing'
                ? "L'acheteur a peut-être trouvé son bien ou retiré sa recherche."
                : 'Réessayez dans quelques instants.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-200 hover:border-cyan-500 hover:text-cyan-400"
            >
              Voir les autres recherches
            </button>
          </div>
        )}

        {state === 'ready' && search && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">Recherche en cours</p>
            <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl" style={DISPLAY_FONT}>
              Un acheteur qualifié cherche un bien comme celui-ci.
            </h1>
            <p className="mt-3 text-slate-400">
              Vous avez un bien qui correspond et préférez le vendre sans annonce publique ? Proposez-le à cet
              acheteur, en toute discrétion.
            </p>

            <div className="mt-8">
              <SearchCard search={search}>
                <button
                  onClick={() => navigate(cta.to)}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-cyan-500"
                >
                  {cta.label}
                </button>
              </SearchCard>
            </div>

            <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
              <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <p className="mt-2 font-semibold text-slate-100">Acheteur qualifié</p>
                <p className="mt-1 text-slate-400">Noté sur son apport, sa pré-approbation bancaire et son endettement.</p>
              </li>
              <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <EyeOff className="h-5 w-5 text-cyan-400" />
                <p className="mt-2 font-semibold text-slate-100">Aucune annonce</p>
                <p className="mt-1 text-slate-400">Votre bien n'apparaît sur aucun portail.</p>
              </li>
              <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <KeyRound className="h-5 w-5 text-cyan-400" />
                <p className="mt-2 font-semibold text-slate-100">Contact sur accord</p>
                <p className="mt-1 text-slate-400">Les coordonnées ne sont échangées que si les deux parties acceptent.</p>
              </li>
            </ul>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        {BRAND_NAME} · Réseau immobilier off-market
      </footer>
    </div>
  );
}
