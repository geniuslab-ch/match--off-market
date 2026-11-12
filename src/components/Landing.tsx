import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, EyeOff, KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import { getPublicSearches } from '../lib/api';
import type { BuyerSearch } from '../lib/api';
import Brand, { BRAND_NAME, DISPLAY_FONT, SLOGAN } from './Brand';
import SearchCard from './SearchCard';

function Entry({
  icon,
  title,
  who,
  children,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  who: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-3xl border border-slate-700 bg-slate-900 p-7 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">{icon}</span>
      <span className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{who}</span>
      <span className="mt-2 text-2xl font-medium leading-snug text-white sm:text-3xl" style={DISPLAY_FONT}>
        {title}
      </span>
      <span className="mt-3 text-sm leading-relaxed text-slate-400">{children}</span>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400">
        Commencer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-bold text-cyan-400">Étape {n}</p>
      <p className="mt-1 font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{children}</p>
    </li>
  );
}

// Page d'accueil publique : deux entrées, vendeur ou acheteur.
export default function Landing() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState<BuyerSearch[]>([]);

  // Recherches en cours, anonymes. Si la base ne répond pas, la section reste simplement masquée.
  useEffect(() => {
    let alive = true;
    getPublicSearches()
      .then((list) => alive && setSearches(list ?? []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Brand />
        <button onClick={() => navigate('/auth')} className="text-sm text-slate-300 hover:text-cyan-400">
          Se connecter
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        {/* Accroche et les deux entrées */}
        <section className="pt-8 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Projet pilote · Suisse romande
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-medium leading-[1.1] text-white sm:text-6xl" style={DISPLAY_FONT}>
            L'immobilier qui se vend <span className="italic text-cyan-400">sans annonce.</span>
          </h1>
          <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-400">{SLOGAN}</p>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            {BRAND_NAME} met en relation, en toute discrétion, les propriétaires et régies qui vendent hors
            marché avec des acheteurs qualifiés.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Entry
              icon={<Building2 className="h-5 w-5" />}
              who="Propriétaire ou régie"
              title="Je suis vendeur off-market"
              onClick={() => navigate('/auth?mode=inscription&role=seller')}
            >
              Voyez les acheteurs qualifiés qui cherchent un bien comme le vôtre et proposez-le sans le publier.
            </Entry>
            <Entry
              icon={<UserCheck className="h-5 w-5" />}
              who="Particulier ou investisseur"
              title="Je suis acheteur off-market"
              onClick={() => navigate('/auth?mode=inscription&role=buyer')}
            >
              Décrivez votre recherche et votre financement, puis recevez les biens hors annonces qui
              correspondent.
            </Entry>
          </div>
        </section>

        {/* Recherches en cours */}
        {searches.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-medium text-white sm:text-3xl" style={DISPLAY_FONT}>
              Ils cherchent en ce moment
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {searches.length} acheteur{searches.length > 1 ? 's' : ''} qualifié{searches.length > 1 ? 's' : ''}{' '}
              {searches.length > 1 ? 'ont' : 'a'} une recherche active. Leur identité reste confidentielle.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {searches.slice(0, 6).map((s) => (
                <SearchCard key={s.id} search={s}>
                  <button
                    onClick={() => navigate(`/recherche/${s.id}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-400"
                  >
                    J'ai un bien qui correspond <ArrowRight className="h-4 w-4" />
                  </button>
                </SearchCard>
              ))}
            </div>
          </section>
        )}

        {/* Fonctionnement */}
        <section className="mt-16">
          <h2 className="text-2xl font-medium text-white sm:text-3xl" style={DISPLAY_FONT}>
            Comment ça marche
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <Step n={1} title="Chacun décrit sa situation">
              Le vendeur ou la régie décrit le bien. L'acheteur indique sa recherche et son financement.
            </Step>
            <Step n={2} title="Le matching fait le tri">
              Zone, budget, type de bien, surface : seuls les biens et les acheteurs qui se correspondent sont
              présentés l'un à l'autre.
            </Step>
            <Step n={3} title="Mise en relation sur accord">
              L'acheteur demande un bien, ou le vendeur propose le sien. Les coordonnées ne sont partagées
              qu'après accord des deux parties.
            </Step>
          </ol>
        </section>

        {/* Garanties */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <EyeOff className="h-5 w-5 text-cyan-400" />
            <p className="mt-3 font-semibold text-slate-100">Aucune annonce publique</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Les biens n'apparaissent sur aucun portail. Seuls les acheteurs dont la recherche correspond les
              voient.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <p className="mt-3 font-semibold text-slate-100">Des acheteurs qualifiés</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Chaque acheteur est noté sur son apport, sa pré-approbation bancaire et son endettement. Tous ceux
              qui accèdent aux biens ont déclaré une pré-approbation bancaire.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <KeyRound className="h-5 w-5 text-cyan-400" />
            <p className="mt-3 font-semibold text-slate-100">Identités protégées</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Ni le vendeur ni l'acheteur ne voient les coordonnées de l'autre avant d'avoir accepté la mise en
              relation.
            </p>
          </div>
        </section>

        {/* Tarifs */}
        <section className="mt-16">
          <h2 className="text-2xl font-medium text-white sm:text-3xl" style={DISPLAY_FONT}>
            Tarifs
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Le réseau est <span className="font-semibold text-cyan-400">gratuit pendant le projet pilote</span>. Il
            deviendra payant pour les vendeurs à partir du 1er janvier 2027.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-semibold text-slate-100">Acheteurs</p>
              <p className="mt-2 text-2xl font-medium text-white" style={DISPLAY_FONT}>Gratuit</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">Aujourd'hui comme après le pilote.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-semibold text-slate-100">Propriétaire d'un seul bien</p>
              <p className="mt-2 text-2xl font-medium text-white" style={DISPLAY_FONT}>
                3 000 CHF <span className="text-sm text-slate-400">hors TVA</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Dès 2027, forfait dû uniquement si le bien est vendu grâce au réseau.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-semibold text-slate-100">Régies et courtiers</p>
              <p className="mt-2 text-2xl font-medium text-white" style={DISPLAY_FONT}>
                150 CHF <span className="text-sm text-slate-400">hors TVA</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Dès 2027, par mise en relation acceptée, jusqu'à 8 biens dans le réseau. Au-delà de 8 biens,
                abonnement de 300 CHF hors TVA par mois.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-slate-500">
          Envie de voir à quoi ressemble l'espace acheteur ?{' '}
          <button onClick={() => navigate('/demo')} className="text-cyan-400 hover:underline">
            Voir la démonstration
          </button>
        </p>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        {BRAND_NAME} · Réseau immobilier off-market
      </footer>
    </div>
  );
}
