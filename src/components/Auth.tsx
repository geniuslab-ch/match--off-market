import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Building2, Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import type { UserRole } from '../types';
import Brand from './Brand';

// La page d'accueil peut ouvrir directement l'inscription : /auth?mode=inscription&role=seller
const params = () => new URLSearchParams(window.location.search);

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(() => params().get('mode') !== 'inscription');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [role, setRole] = useState<UserRole>(() => (params().get('role') === 'seller' ? 'seller' : 'buyer'));
  const [isProfessional, setIsProfessional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isLogin) {
      const err = await signIn(email, password);
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // Inscription
    if (!pseudo.trim()) {
      setError('Le pseudo est requis');
      setLoading(false);
      return;
    }
    if (!fullName.trim()) {
      setError('Le nom complet est requis');
      setLoading(false);
      return;
    }

    const result = await signUp(email, password, fullName, pseudo, role, role === 'seller' && isProfessional);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (!result.hasSession) {
      // Confirmation email requise — ne pas naviguer
      setEmailConfirmation(true);
    } else {
      // Session active, naviguer vers le formulaire
      navigate(role === 'seller' ? '/seller/new' : '/buyer/new');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <button type="button" onClick={() => navigate('/')} className="mx-auto block" aria-label="Retour à l'accueil">
            <Brand size="lg" />
          </button>
          <p className="mt-4 text-sm text-slate-500">Réseau immobilier off-market</p>
        </div>

        {/* Formulaire */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-lg shadow-cyan-500/5">
          <h2 className="mb-6 text-center text-lg font-semibold text-slate-100">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>

          {emailConfirmation && (
            <div className="mb-4 space-y-3 rounded-lg bg-cyan-950 px-4 py-5 text-center">
              <Mail className="mx-auto h-8 w-8 text-cyan-400" />
              <p className="text-sm font-medium text-cyan-300">
                Vérifiez votre boîte email
              </p>
              <p className="text-xs text-slate-400">
                Un lien de confirmation a été envoyé à <strong className="text-slate-200">{email}</strong>.
                Cliquez dessus pour activer votre compte, puis connectez-vous.
              </p>
              <button
                type="button"
                onClick={() => { setEmailConfirmation(false); setIsLogin(true); }}
                className="mt-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-400 hover:bg-cyan-500/30"
              >
                Se connecter
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pseudo (inscription uniquement) */}
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Pseudo <span className="text-cyan-500">*</span>
                </label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="Investisseur42"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <p className="mt-1 text-xs text-cyan-500/70">
                  Visible par les autres membres. Choisissez un pseudo discret.
                </p>
              </div>
            )}

            {/* Nom complet (inscription uniquement) */}
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Nom complet <span className="text-cyan-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                {/* Notice confidentialité */}
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0 text-cyan-600" />
                  <span>
                    Confidentiel. Votre identité ne sera révélée qu'après acceptation mutuelle d'un match par le propriétaire.
                  </span>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.ch"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="mb-1 block text-sm text-slate-400">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sélection du rôle (inscription uniquement) */}
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm text-slate-400">Par quoi commencez-vous ?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      role === 'buyer'
                        ? 'border-cyan-500 bg-cyan-950/50 text-cyan-400'
                        : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <UserCheck className="h-6 w-6" />
                    <span className="text-sm font-medium">J'achète</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      role === 'seller'
                        ? 'border-cyan-500 bg-cyan-950/50 text-cyan-400'
                        : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Building2 className="h-6 w-6" />
                    <span className="text-sm font-medium">Je vends</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Un seul compte suffit : vous pourrez acheter et vendre depuis votre espace.
                </p>
                {role === 'seller' && (
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-600 bg-slate-900 p-3">
                    <input
                      type="checkbox"
                      checked={isProfessional}
                      onChange={(e) => setIsProfessional(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-300">
                      Je suis un professionnel de l'immobilier
                      <span className="block text-xs text-slate-500">
                        Régie ou courtier. Vos biens porteront la mention « Professionnel », sans votre nom.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
            >
              {loading
                ? 'Chargement...'
                : isLogin
                  ? 'Se connecter'
                  : 'Créer mon compte'}
            </button>
          </form>

          {/* Toggle login/signup */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {isLogin ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="font-medium text-cyan-400 hover:text-cyan-300"
            >
              {isLogin ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
