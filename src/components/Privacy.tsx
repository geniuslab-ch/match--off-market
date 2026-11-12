import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Brand, { BRAND_NAME, DISPLAY_FONT } from './Brand';

// ============================================================
// Déclaration de confidentialité (nLPD, Suisse)
// Fichier : src/components/Privacy.tsx — page /confidentialite
// ============================================================
// Les éléments entre crochets [ ... ] sont à compléter avant la mise en service.
// Texte à faire relire par un juriste.

const LAST_UPDATE = '12 novembre 2026';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-800 pt-8">
      <h2 className="text-xl font-semibold text-white">
        <span className="mr-2 text-cyan-400">{n}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-cyan-500">{children}</ul>;
}

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <button onClick={() => navigate('/')} aria-label={`${BRAND_NAME}, retour à l'accueil`}>
          <Brand />
        </button>
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 pb-20">
        <div>
          <h1 className="text-4xl font-medium text-white" style={DISPLAY_FONT}>
            Déclaration de confidentialité
          </h1>
          <p className="mt-3 text-sm text-slate-400">Dernière mise à jour : {LAST_UPDATE}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-slate-300">
            Offly est un réseau immobilier off-market : la discrétion est au cœur du service. Cette déclaration
            explique quelles données nous traitons, pourquoi, avec qui elles sont partagées et quels sont vos droits.
            Elle s'appuie sur la loi fédérale sur la protection des données (nLPD).
          </p>
        </div>

        <Section n={1} title="Responsable du traitement">
          <p>
            [Raison sociale de l'entreprise exploitant Offly]
            <br />
            [Adresse postale complète]
            <br />
            Contact pour toute question sur vos données : [adresse e-mail dédiée, p. ex. confidentialite@offly.ch]
          </p>
        </Section>

        <Section n={2} title="Les données que nous traitons">
          <p>
            <strong className="text-slate-100">Votre compte</strong> : nom, pseudo, adresse e-mail, numéro de
            téléphone et mot de passe. Le mot de passe est enregistré sous forme chiffrée (hachée) : personne, pas même
            nous, ne peut le lire.
          </p>
          <p>
            <strong className="text-slate-100">Si vous cherchez un bien</strong> : vos critères de recherche (localité
            ou canton, type de bien, surface, budget maximum), le montant de votre apport, votre taux d'endettement et
            le fait que vous disposiez ou non d'une pré-approbation bancaire. Le dépôt du document de pré-approbation
            est facultatif.
          </p>
          <p>
            <strong className="text-slate-100">Si vous vendez un bien</strong> : la description du bien (localité,
            type, prix, surface, caractéristiques) et les informations qui servent au matching (délai de vente
            souhaité, ancienneté de la mise en vente, conditions de vente, rareté). Si vous l'indiquez, le fait que
            vous soyez un professionnel de l'immobilier.
          </p>
          <p>
            <strong className="text-slate-100">Les mises en relation</strong> : les demandes et propositions échangées,
            leur réponse, et, pour le suivi des ventes, la date et les notes de nos appels.
          </p>
          <p>
            <strong className="text-slate-100">La facturation</strong> : les mises en relation acceptées et les
            montants dus par les vendeurs.
          </p>
          <p>
            <strong className="text-slate-100">Les données techniques</strong> : notre hébergeur enregistre, pour la
            sécurité du service, des journaux de connexion (adresse IP, date, page demandée), conservés peu de temps.
          </p>
        </Section>

        <Section n={3} title="Pourquoi nous les utilisons">
          <Ul>
            <li>Créer et sécuriser votre compte.</li>
            <li>Calculer les correspondances entre les recherches des acheteurs et les biens des vendeurs.</li>
            <li>Organiser les mises en relation, uniquement avec l'accord des deux parties.</li>
            <li>Vous appeler pour savoir si une mise en relation a abouti à une vente.</li>
            <li>Établir les factures des vendeurs et respecter nos obligations comptables.</li>
            <li>Protéger le service contre les abus.</li>
          </Ul>
          <p>
            Nous n'utilisons pas vos données à des fins publicitaires, nous ne les vendons pas et nous ne les louons
            à personne.
          </p>
        </Section>

        <Section n={4} title="Le score automatique et votre droit à un examen humain">
          <p>
            Offly calcule automatiquement un score pour chaque recherche d'acheteur (budget, apport, pré-approbation,
            endettement) et pour chaque bien. Un acheteur dont le score est inférieur à 80 sur 100 n'a pas accès aux
            biens.
          </p>
          <p>
            Si vous estimez que ce résultat ne reflète pas votre situation, vous pouvez nous écrire : une personne
            examinera votre profil et vous pourrez faire valoir votre point de vue.
          </p>
        </Section>

        <Section n={5} title="Qui voit quoi">
          <p>
            <strong className="text-slate-100">Votre identité reste masquée jusqu'à la mise en relation.</strong>{' '}
            Votre nom, votre e-mail et votre téléphone ne sont transmis à l'autre partie que lorsque vous avez tous
            les deux accepté la mise en relation.
          </p>
          <Ul>
            <li>
              Un bien n'est montré qu'aux acheteurs qualifiés dont la recherche correspond, sans le nom ni les
              coordonnées du vendeur. Seule la mention « Propriétaire » ou « Professionnel » est visible.
            </li>
            <li>
              Si vous l'acceptez (option activée par défaut, modifiable à tout moment dans votre profil), votre
              recherche est visible des vendeurs et sur une page publique, sous forme anonyme : localité, type de bien,
              surface, budget arrondi aux 50 000 CHF supérieurs et mention d'une pré-approbation déclarée. Votre
              apport, votre endettement et votre identité n'y figurent jamais.
            </li>
            <li>Les vendeurs voient le pseudo et le score des acheteurs qui leur adressent une demande.</li>
            <li>
              Votre document de pré-approbation n'est jamais montré aux autres utilisateurs. Seuls vous et
              l'administration d'Offly pouvez l'ouvrir, pour vérifier votre dossier.
            </li>
          </Ul>
        </Section>

        <Section n={6} title="Nos prestataires">
          <p>
            Nous faisons appel à des prestataires qui traitent des données pour notre compte, uniquement selon nos
            instructions :
          </p>
          <Ul>
            <li>
              <strong className="text-slate-100">Supabase</strong> : base de données, comptes et stockage des
              documents. Région d'hébergement : [région choisie pour le projet Supabase, p. ex. Francfort (UE)].
            </li>
            <li>
              <strong className="text-slate-100">Vercel</strong> : hébergement et diffusion du site.
            </li>
            <li>
              <strong className="text-slate-100">bexio</strong> (Suisse) : facturation des vendeurs.
            </li>
          </Ul>
          <p>
            Certains de ces prestataires sont établis ou disposent d'infrastructures hors de Suisse, notamment dans
            l'Union européenne et aux États-Unis. Ces transferts ont lieu vers des pays reconnus par le Conseil
            fédéral comme offrant une protection adéquate, ou sont encadrés par des garanties appropriées (clauses
            contractuelles types reconnues par le Préposé fédéral, ou certification au Swiss-U.S. Data Privacy
            Framework).
          </p>
          <p>
            Le site n'utilise aucun outil de mesure d'audience ni de publicité, et ses polices de caractères sont
            hébergées sur nos propres serveurs : aucune donnée n'est transmise à Google ou à un réseau publicitaire
            lorsque vous le consultez.
          </p>
        </Section>

        <Section n={7} title="Sécurité">
          <Ul>
            <li>Toutes les communications avec le site sont chiffrées (HTTPS).</li>
            <li>
              Chaque utilisateur n'accède qu'à ses propres données : ces règles sont appliquées directement par la
              base de données, et non par le seul affichage du site.
            </li>
            <li>
              Les documents de pré-approbation sont conservés dans un espace privé, sans lien public, et ne sont
              accessibles qu'à leur titulaire et à l'administration.
            </li>
            <li>Les mots de passe ne sont jamais conservés en clair.</li>
            <li>L'accès administrateur est limité aux personnes qui en ont besoin pour le service.</li>
          </Ul>
          <p>
            Aucun système n'est infaillible. En cas de violation de la sécurité présentant un risque élevé pour vous,
            nous en informerons le Préposé fédéral et, si nécessaire, les personnes concernées.
          </p>
        </Section>

        <Section n={8} title="Durée de conservation">
          <Ul>
            <li>Votre compte, vos recherches et vos biens : tant que votre compte est actif.</li>
            <li>
              Le document de pré-approbation : jusqu'à la fin de votre recherche ou à votre demande de suppression.
            </li>
            <li>Les notes de suivi des ventes : jusqu'à la clôture du dossier.</li>
            <li>
              Les données de facturation : dix ans, comme l'exige le droit suisse pour les pièces comptables (art.
              958f CO).
            </li>
          </Ul>
          <p>
            À la suppression de votre compte, vos données sont effacées, à l'exception de celles que la loi nous
            oblige à conserver.
          </p>
        </Section>

        <Section n={9} title="Stockage dans votre navigateur">
          <p>
            Le site enregistre dans votre navigateur uniquement ce qui est nécessaire à son fonctionnement : votre
            session de connexion et le dernier onglet ouvert (« J'achète » ou « Je vends »). Aucun cookie publicitaire
            ni de suivi n'est utilisé.
          </p>
        </Section>

        <Section n={10} title="Vos droits">
          <p>Vous pouvez à tout moment :</p>
          <Ul>
            <li>savoir quelles données nous détenons sur vous et en recevoir une copie ;</li>
            <li>les faire corriger si elles sont inexactes ;</li>
            <li>en demander la suppression ;</li>
            <li>vous opposer à un traitement ou retirer votre consentement, par exemple à la visibilité de votre recherche ;</li>
            <li>recevoir vos données dans un format courant, ou les faire transmettre à un autre prestataire.</li>
          </Ul>
          <p>
            Écrivez-nous à [adresse e-mail dédiée]. Nous répondons dans un délai de 30 jours. Si vous estimez que vos
            droits ne sont pas respectés, vous pouvez vous adresser au Préposé fédéral à la protection des données et
            à la transparence (PFPDT), www.edoeb.admin.ch.
          </p>
        </Section>

        <Section n={11} title="Si vous déposez les données d'une autre personne">
          <p>
            Si vous saisissez la recherche ou le document d'un client ou d'un proche, vous devez avoir obtenu son
            accord au préalable et l'avoir informé de cette déclaration.
          </p>
        </Section>

        <Section n={12} title="Modifications">
          <p>
            Nous pouvons adapter cette déclaration, par exemple lors de l'ajout d'un service. La version publiée sur
            cette page fait foi ; en cas de changement important, nous vous en informerons par e-mail.
          </p>
        </Section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        {BRAND_NAME} · Déclaration de confidentialité
      </footer>
    </div>
  );
}
