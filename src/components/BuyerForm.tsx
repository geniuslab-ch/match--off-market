import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeSwissFranc,
  Landmark,
  CheckCircle2,
  Percent,
  Home,
  Ruler,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Copy,
  Trash2,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { calculateBuyerScore, criterionBuyerScore } from '../utils/matching';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType, BuyerProfile } from '../types';
import CommuneSelect from './CommuneSelect';
import MoneyInput from './MoneyInput';
import Brand from './Brand';
import DocumentUpload from './DocumentUpload';

interface CriteriaForm {
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: string;
  desired_surface_min_m2: string;
  desired_surface_max_m2: string;
}

function newCriteria(): CriteriaForm {
  return {
    desired_zone: 'Lausanne',
    desired_property_type: 'apartment',
    budget_max: '',
    desired_surface_min_m2: '',
    desired_surface_max_m2: '',
  };
}

export default function BuyerForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [criteriaList, setCriteriaList] = useState<CriteriaForm[]>([
    newCriteria(),
  ]);
  const [financials, setFinancials] = useState({
    personal_contribution: '',
    has_pre_approval: false,
    debt_ratio: '',
  });

  const [preApprovalDocPath, setPreApprovalDocPath] = useState<string | null>(null);
  // Recherche visible, sous forme anonyme, par les vendeurs et régies du réseau
  const [shareSearch, setShareSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Chargement du profil existant, pour que « Mettre à jour » reparte des données enregistrées
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadExisting() {
      if (!supabase || !user) {
        setLoadingProfile(false);
        return;
      }
      const { data } = await supabase.from('buyer_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (!alive) return;
      if (data) {
        const p = data as BuyerProfile;
        const saved = p.search_criteria && p.search_criteria.length > 0 ? p.search_criteria : null;
        setCriteriaList(
          saved
            ? saved.map((c) => ({
                desired_zone: c.desired_zone,
                desired_property_type: c.desired_property_type,
                budget_max: c.budget_max ? String(c.budget_max) : '',
                desired_surface_min_m2: c.desired_surface_min_m2 ? String(c.desired_surface_min_m2) : '',
                desired_surface_max_m2: c.desired_surface_max_m2 ? String(c.desired_surface_max_m2) : '',
              }))
            : [
                {
                  desired_zone: p.desired_zone || 'Lausanne',
                  desired_property_type: p.desired_property_type || 'apartment',
                  budget_max: p.budget_max ? String(p.budget_max) : '',
                  desired_surface_min_m2: p.desired_surface_m2 ? String(p.desired_surface_m2) : '',
                  desired_surface_max_m2: '',
                },
              ],
        );
        setFinancials({
          personal_contribution: p.personal_contribution != null ? String(Math.round(Number(p.personal_contribution))) : '',
          has_pre_approval: Boolean(p.has_pre_approval),
          debt_ratio: p.debt_ratio != null ? String(p.debt_ratio) : '',
        });
        setPreApprovalDocPath(p.pre_approval_doc_path || null);
        setShareSearch(p.share_search !== false);
      }
      setLoadingProfile(false);
    }
    loadExisting();
    return () => {
      alive = false;
    };
  }, [user]);

  // Score en temps réel
  const liveProfile = {
    budget_max:
      Math.max(...criteriaList.map((c) => Number(c.budget_max) || 0)) || 0,
    personal_contribution: Number(financials.personal_contribution) || 0,
    has_pre_approval: financials.has_pre_approval,
    debt_ratio: Number(financials.debt_ratio) || 0,
    search_criteria: criteriaList.map((c) => ({
      desired_zone: c.desired_zone,
      desired_property_type: c.desired_property_type,
      budget_max: Number(c.budget_max) || 0,
      desired_surface_min_m2: Number(c.desired_surface_min_m2) || 0,
      desired_surface_max_m2: Number(c.desired_surface_max_m2) || 0,
    })),
  } as BuyerProfile;
  const liveScore = calculateBuyerScore(liveProfile);

  function updateCriteria(
    index: number,
    field: keyof CriteriaForm,
    value: string
  ) {
    setCriteriaList((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function addCriteria() {
    setCriteriaList((prev) => [...prev, newCriteria()]);
  }

  function copyCriteria(index: number) {
    setCriteriaList((prev) => {
      const copy = { ...prev[index] };
      // On remet la zone à vide pour inciter à changer
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function removeCriteria(index: number) {
    if (criteriaList.length <= 1) return;
    setCriteriaList((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFinancial(field: string, value: string | boolean) {
    setFinancials((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!supabase) {
      setError(
        'Supabase non configuré. Veuillez configurer les variables d\'environnement.'
      );
      return;
    }

    if (!user) {
      setError(
        'Vous devez être connecté pour enregistrer votre profil. Veuillez vous reconnecter.'
      );
      return;
    }

    // Validation des critères
    for (let i = 0; i < criteriaList.length; i++) {
      const c = criteriaList[i];
      if (!c.budget_max || Number(c.budget_max) <= 0) {
        setError(`Critère ${i + 1} : le budget max est requis.`);
        return;
      }
      const minS = Number(c.desired_surface_min_m2);
      const maxS = Number(c.desired_surface_max_m2);
      if (minS && maxS && minS > maxS) {
        setError(
          `Critère ${i + 1} : la surface min ne peut pas dépasser la surface max.`
        );
        return;
      }
    }

    setLoading(true);

    // On utilise le premier critère comme critère principal (rétro-compatibilité)
    const primary = criteriaList[0];
    const payload = {
      user_id: user.id,
      desired_zone: primary.desired_zone,
      desired_property_type: primary.desired_property_type,
      budget_max: Number(primary.budget_max),
      desired_surface_m2: Number(primary.desired_surface_min_m2) || 0,
      personal_contribution: Number(financials.personal_contribution),
      has_pre_approval: financials.has_pre_approval,
      pre_approval_doc_path: preApprovalDocPath || null,
      debt_ratio: Number(financials.debt_ratio),
      score: liveScore,
      share_search: shareSearch,
      search_criteria: criteriaList.map((c) => ({
        desired_zone: c.desired_zone,
        desired_property_type: c.desired_property_type,
        budget_max: Number(c.budget_max),
        desired_surface_min_m2: Number(c.desired_surface_min_m2) || 0,
        desired_surface_max_m2: Number(c.desired_surface_max_m2) || 0,
      })),
    };

    const { error: err } = await supabase
      .from('buyer_profiles')
      .upsert(payload, {
        onConflict: 'user_id',
      });

    setLoading(false);

    if (err) {
      setError(`Erreur lors de l'enregistrement : ${err.message}`);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <Brand size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {loadingProfile ? (
          <p className="py-20 text-center text-slate-500">Chargement de votre profil...</p>
        ) : (
        <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">
            Profil Acheteur Solvable
          </h1>
          <p className="mt-1 text-slate-400">
            Complétez vos critères pour accéder aux biens off-market
          </p>
        </div>

        {/* Score en temps réel */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${
              liveScore >= 80
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {liveScore}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">
              Score acheteur : {liveScore}/100
            </p>
            <p className="text-xs text-slate-400">
              {liveScore >= 80
                ? 'Qualifié pour le matching'
                : 'Seuil requis : 80/100'}
            </p>
            {criteriaList.length > 1 && (
              <p className="mt-1 text-xs text-slate-500">
                Chaque recherche est évaluée avec son propre budget :{' '}
                {criteriaList
                  .map((c, i) => `n° ${i + 1} ${criterionBuyerScore(liveProfile, Number(c.budget_max) || 0)}/100`)
                  .join(' · ')}
              </p>
            )}
          </div>
          {liveScore >= 80 && (
            <CheckCircle2 className="ml-auto h-6 w-6 text-emerald-400" />
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Profil enregistré avec succès ! Redirection...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Critères de recherche multiples */}
          {criteriaList.map((criteria, index) => (
            <section
              key={index}
              className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  Critère de recherche {index + 1}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyCriteria(index)}
                    title="Dupliquer ce critère"
                    className="flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-600 hover:text-cyan-400"
                  >
                    <Copy className="h-3.5 w-3.5" /> Dupliquer
                  </button>
                  {criteriaList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriteria(index)}
                      title="Supprimer ce critère"
                      className="flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Zone souhaitée - recherche */}
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> Zone souhaitée
                  </label>
                  <CommuneSelect
                    allowCantons
                    value={criteria.desired_zone}
                    onChange={(v) => updateCriteria(index, 'desired_zone', v)}
                  />
                </div>

                {/* Type de bien */}
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <Home className="h-3.5 w-3.5" /> Type de bien
                  </label>
                  <select
                    value={criteria.desired_property_type}
                    onChange={(e) =>
                      updateCriteria(
                        index,
                        'desired_property_type',
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    {Object.entries(PROPERTY_TYPE_LABELS).map(
                      ([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Budget max */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <BadgeSwissFranc className="h-3.5 w-3.5" /> Budget max (CHF)
                  </label>
                  <MoneyInput
                    value={criteria.budget_max}
                    onChange={(v) => updateCriteria(index, 'budget_max', v)}
                    placeholder="950000"
                    required
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Surface souhaitée - fourchette */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Ruler className="h-3.5 w-3.5" /> Surface souhaitée (m²)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      value={criteria.desired_surface_min_m2}
                      onChange={(e) =>
                        updateCriteria(
                          index,
                          'desired_surface_min_m2',
                          e.target.value
                        )
                      }
                      placeholder="Min. ex: 60"
                      min={0}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="mt-0.5 text-xs text-slate-500">Minimum</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={criteria.desired_surface_max_m2}
                      onChange={(e) =>
                        updateCriteria(
                          index,
                          'desired_surface_max_m2',
                          e.target.value
                        )
                      }
                      placeholder="Max. ex: 120"
                      min={0}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="mt-0.5 text-xs text-slate-500">Maximum</p>
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* Bouton ajouter critère */}
          <button
            type="button"
            onClick={addCriteria}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-600 bg-slate-800/50 py-4 text-sm text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter un critère de recherche
          </button>

          {/* Critères financiers (scoring) */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Critères financiers
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Landmark className="h-3.5 w-3.5" /> Apport personnel (CHF)
                </label>
                <MoneyInput
                  value={financials.personal_contribution}
                  onChange={(v) => updateFinancial('personal_contribution', v)}
                  placeholder="200000"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {(() => {
                  const apport = Number(financials.personal_contribution) || 0;
                  const lines = criteriaList
                    .map((c, i) => ({ i, budget: Number(c.budget_max) || 0, zone: c.desired_zone }))
                    .filter((l) => l.budget > 0);
                  if (lines.length === 0) return null;
                  return (
                    <ul className="mt-2 space-y-1 text-xs">
                      {lines.map((l) => {
                        const pct = (apport / l.budget) * 100;
                        const ok = pct >= 20;
                        return (
                          <li key={l.i} className={ok ? 'text-emerald-400' : 'text-amber-300'}>
                            Recherche {l.i + 1} ({l.zone}) : {pct.toFixed(1)} % de{' '}
                            {l.budget.toLocaleString('fr-CH')} CHF
                            {ok ? ' (+20 pts)' : ' (minimum 20 %)'}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Percent className="h-3.5 w-3.5" /> Taux d'endettement (%)
                </label>
                <input
                  type="number"
                  value={financials.debt_ratio}
                  onChange={(e) =>
                    updateFinancial('debt_ratio', e.target.value)
                  }
                  placeholder="28"
                  required
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {Number(financials.debt_ratio) <= 33
                    ? '+10 pts'
                    : 'Doit être ≤ 33%'}
                </p>
              </div>
            </div>

            {/* Pré-approbation */}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                financials.has_pre_approval
                  ? 'border-cyan-500 bg-cyan-950/50'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              <input
                type="checkbox"
                checked={financials.has_pre_approval}
                onChange={(e) =>
                  updateFinancial('has_pre_approval', e.target.checked)
                }
                className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <p
                  className={`text-sm font-medium ${financials.has_pre_approval ? 'text-cyan-400' : 'text-slate-300'}`}
                >
                  Pré-approbation bancaire
                </p>
                <p className="text-xs text-slate-500">
                  {financials.has_pre_approval
                    ? '+30 pts'
                    : 'Ajoute 30 points à votre score'}
                </p>
              </div>
            </label>

            {/* Upload document pré-approbation */}
            {financials.has_pre_approval && (
              <DocumentUpload
                existingPath={preApprovalDocPath || undefined}
                onUploadComplete={(path) => setPreApprovalDocPath(path)}
              />
            )}
          </section>

          {/* Visibilité de la recherche */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <input
              type="checkbox"
              checked={shareSearch}
              onChange={(e) => setShareSearch(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">
                Montrer ma recherche aux vendeurs et aux régies
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                Ils voient uniquement la zone, le type de bien, la surface et un budget arrondi. Jamais votre nom,
                votre pseudo ni votre apport. Ils peuvent ainsi vous proposer un bien qui n'est pas encore dans le
                réseau.
              </span>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
              </span>
            ) : (
              `Enregistrer mon profil acheteur (${criteriaList.length} critère${criteriaList.length > 1 ? 's' : ''})`
            )}
          </button>
        </form>
        </>
        )}
      </main>
    </div>
  );
}
