import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeSwissFranc,
  Home,
  Ruler,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Flame,
  Star,
  Clock,
  FileText,
  DoorOpen,
  Building2,
  MapPin,
  Info,
  Car,
  TreePine,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { calculateSellerScore } from '../utils/matching';
import {
  PROPERTY_TYPE_LABELS,
  SITUATION_LABELS,
  HOUSE_TYPE_LABELS,
  COMMERCIAL_TYPE_LABELS,
  FLOOR_OPTIONS,
  EXTERIOR_OPTIONS,
  PARKING_TYPE_OPTIONS,
  BONUS_OPTIONS,
} from '../types';
import type { PropertyType, SituationType, HouseType, CommercialType, Property } from '../types';
import CommuneSelect from './CommuneSelect';
import Brand from './Brand';

export default function SellerForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment' as PropertyType,
    zone: 'Lausanne',
    price: '',
    surface_m2: '',
    rooms: '',
    floor: '',
    house_type: '' as HouseType | '',
    commercial_type: '' as CommercialType | '',
    situation: '' as SituationType | '',
    exterior: [] as string[],
    parking_types: [] as string[],
    parking_quantity: '1',
    bonuses: [] as string[],
    urgency_level: '3',
    listing_age_days: '0',
    is_conditional_sale: false,
    conditional_sale_details: '',
    rarity_score: '3',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Score vendeur en temps réel
  const liveProperty = {
    urgency_level: Number(form.urgency_level),
    listing_age_days: Number(form.listing_age_days),
    is_conditional_sale: form.is_conditional_sale,
    rarity_score: Number(form.rarity_score),
  } as Property;
  const liveScore = calculateSellerScore(liveProperty);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleArrayItem(field: 'exterior' | 'bonuses' | 'parking_types', item: string) {
    setForm((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item],
      };
    });
  }

  function toggleExteriorAll() {
    setForm((prev) => {
      const allSelected = EXTERIOR_OPTIONS.every((o) => prev.exterior.includes(o));
      return { ...prev, exterior: allSelected ? [] : [...EXTERIOR_OPTIONS] };
    });
  }

  function clearExterior() {
    setForm((prev) => ({ ...prev, exterior: [] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setError('Supabase non configuré. Contactez l\'administrateur.');
      return;
    }
    if (!user) {
      setError('Vous devez être connecté pour publier un bien. Rechargez la page et reconnectez-vous.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        seller_id: user.id,
        title: form.title,
        description: form.description || null,
        property_type: form.property_type,
        zone: form.zone,
        price: Number(form.price),
        surface_m2: Number(form.surface_m2),
        rooms: form.rooms ? Number(form.rooms) : null,
        urgency_level: Number(form.urgency_level),
        listing_age_days: Number(form.listing_age_days),
        is_conditional_sale: form.is_conditional_sale,
        rarity_score: Number(form.rarity_score),
        score: liveScore,
      };

      // Champs optionnels — seulement si renseignés
      if (form.property_type === 'apartment' && form.floor) {
        payload.floor = form.floor;
      }
      if (['house', 'villa'].includes(form.property_type) && form.house_type) {
        payload.house_type = form.house_type;
      }
      if (form.property_type === 'commercial' && form.commercial_type) {
        payload.commercial_type = form.commercial_type;
      }
      if (form.situation) {
        payload.situation = form.situation;
      }
      if (form.exterior.length > 0) {
        payload.exterior = form.exterior;
      }
      if (form.parking_types.length > 0) {
        payload.parking_types = form.parking_types;
        payload.parking_quantity = Number(form.parking_quantity) || 1;
      }
      if (form.bonuses.length > 0) {
        payload.bonuses = form.bonuses;
      }
      if (form.is_conditional_sale && form.conditional_sale_details) {
        payload.conditional_sale_details = form.conditional_sale_details;
      }

      const { error: err } = await supabase.from('properties').insert(payload);

      if (err) {
        setError(err.message);
      } else {
        navigate('/dashboard');
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Erreur inattendue lors de la publication.');
    } finally {
      setLoading(false);
    }
  }

  const urgencyLabels = ['', 'Pas pressé', 'Peu pressé', 'Modéré', 'Pressé', 'Très urgent'];
  const rarityLabels = ['', 'Courant', 'Peu courant', 'Assez rare', 'Rare', 'Exceptionnel'];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <Brand size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Ajouter un bien off-market</h1>
          <p className="mt-1 text-slate-400">Publiez votre bien de manière confidentielle</p>
        </div>

        {/* Score vendeur en temps réel */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${
            liveScore >= 75 ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'
          }`}>
            {liveScore}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">Score motivation : {liveScore}/100</p>
            <p className="text-xs text-slate-400">
              {liveScore >= 85
                ? 'Badge "Opportunité Rapide" affiché aux acheteurs'
                : liveScore >= 75
                  ? 'Badge "Vendeur Motivé" affiché aux acheteurs'
                  : 'Votre bien sera visible — un score plus élevé le met en avant'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du bien */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Informations du bien</h2>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <FileText className="h-3.5 w-3.5" /> Titre
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Appartement lumineux au centre de Lausanne"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <FileText className="h-3.5 w-3.5" /> Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="3.5 pièces rénové, vue lac, proche transports..."
                rows={3}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Home className="h-3.5 w-3.5" /> Type de bien
                </label>
                <select
                  value={form.property_type}
                  onChange={(e) => update('property_type', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  Zone
                </label>
                <CommuneSelect
                  value={form.zone}
                  onChange={(v) => update('zone', v)}
                />
              </div>

              {/* Étage — Appartement uniquement */}
              {form.property_type === 'apartment' && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> Étage
                  </label>
                  <select
                    value={form.floor}
                    onChange={(e) => update('floor', e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {FLOOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type de maison — Maison / Villa */}
              {(form.property_type === 'house' || form.property_type === 'villa') && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <Home className="h-3.5 w-3.5" /> Type de maison
                  </label>
                  <select
                    value={form.house_type}
                    onChange={(e) => update('house_type', e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {Object.entries(HOUSE_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type de local — Commercial */}
              {form.property_type === 'commercial' && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> Type de local
                  </label>
                  <select
                    value={form.commercial_type}
                    onChange={(e) => update('commercial_type', e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {Object.entries(COMMERCIAL_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Situation — Tous types */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> Situation
                </label>
                <select
                  value={form.situation}
                  onChange={(e) => update('situation', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {Object.entries(SITUATION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <BadgeSwissFranc className="h-3.5 w-3.5" /> Prix (CHF)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="890000"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Ruler className="h-3.5 w-3.5" /> Surface (m²)
                </label>
                <input
                  type="number"
                  value={form.surface_m2}
                  onChange={(e) => update('surface_m2', e.target.value)}
                  placeholder="82"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <DoorOpen className="h-3.5 w-3.5" /> Pièces
                </label>
                <input
                  type="number"
                  value={form.rooms}
                  onChange={(e) => update('rooms', e.target.value)}
                  placeholder="3.5"
                  step={0.5}
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Extérieur */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              <TreePine className="mr-1.5 inline h-4 w-4" />
              Extérieur
            </h2>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={clearExterior}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  form.exterior.length === 0
                    ? 'border-cyan-500 bg-cyan-950/50 text-cyan-400'
                    : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                }`}
              >
                Aucun
              </button>
              <button
                type="button"
                onClick={toggleExteriorAll}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  EXTERIOR_OPTIONS.every((o) => form.exterior.includes(o))
                    ? 'border-cyan-500 bg-cyan-950/50 text-cyan-400'
                    : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                }`}
              >
                Tous
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {EXTERIOR_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    form.exterior.includes(option)
                      ? 'border-cyan-500 bg-cyan-950/50 text-cyan-300'
                      : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.exterior.includes(option)}
                    onChange={() => toggleArrayItem('exterior', option)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>

          {/* Parking */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              <Car className="mr-1.5 inline h-4 w-4" />
              Parking
            </h2>

            <div className="grid grid-cols-1 gap-2">
              {PARKING_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    form.parking_types.includes(opt.value)
                      ? 'border-cyan-500 bg-cyan-950/50 text-cyan-300'
                      : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.parking_types.includes(opt.value)}
                    onChange={() => toggleArrayItem('parking_types', opt.value)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {form.parking_types.length > 0 && (
              <div>
                <label className="mb-1 text-sm text-slate-400">Nombre total de places</label>
                <input
                  type="number"
                  value={form.parking_quantity}
                  onChange={(e) => update('parking_quantity', e.target.value)}
                  min={1}
                  max={20}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}
          </section>

          {/* Bonus */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              <Sparkles className="mr-1.5 inline h-4 w-4" />
              Bonus
            </h2>

            <div className="grid grid-cols-1 gap-2">
              {BONUS_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    form.bonuses.includes(option)
                      ? 'border-cyan-500 bg-cyan-950/50 text-cyan-300'
                      : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.bonuses.includes(option)}
                    onChange={() => toggleArrayItem('bonuses', option)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>

          {/* Critères de scoring vendeur */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Critères de scoring</h2>

            {/* Urgence */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm text-slate-400">
                <Flame className="h-3.5 w-3.5" /> Niveau d'urgence : {urgencyLabels[Number(form.urgency_level)]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={form.urgency_level}
                onChange={(e) => update('urgency_level', e.target.value)}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Pas pressé</span><span>Très urgent</span>
              </div>
            </div>

            {/* Ancienneté */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <Clock className="h-3.5 w-3.5" /> En vente depuis (jours)
              </label>
              <input
                type="number"
                value={form.listing_age_days}
                onChange={(e) => update('listing_age_days', e.target.value)}
                placeholder="0"
                min={0}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Plus l'annonce est ancienne, plus le score augmente (max à 90 jours)
              </p>
            </div>

            {/* Rareté */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm text-slate-400">
                <Star className="h-3.5 w-3.5" /> Rareté du bien : {rarityLabels[Number(form.rarity_score)]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={form.rarity_score}
                onChange={(e) => update('rarity_score', e.target.value)}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Courant</span><span>Exceptionnel</span>
              </div>
            </div>

            {/* Vente conditionnelle */}
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all border-slate-600 bg-slate-900">
                <input
                  type="checkbox"
                  checked={form.is_conditional_sale}
                  onChange={(e) => update('is_conditional_sale', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <p className={`text-sm font-medium ${form.is_conditional_sale ? 'text-red-400' : 'text-slate-300'}`}>
                    Vente conditionnelle
                  </p>
                  <p className="text-xs text-slate-500">
                    {form.is_conditional_sale ? '-20 pts (réduit le score)' : 'Non coché = +20 pts'}
                  </p>
                </div>
              </label>

              {/* Explication vente conditionnelle */}
              <div className="flex items-start gap-2 rounded-lg bg-slate-900/50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500/70" />
                <p className="text-xs text-slate-500">
                  Une <strong className="text-slate-400">vente conditionnelle</strong> signifie que la vente est soumise à une ou plusieurs conditions suspensives
                  (ex : obtention d'un permis de construire, vente préalable d'un autre bien, accord d'une copropriété, succession en cours, etc.).
                  Cela peut ralentir le processus de transaction et réduit le score vendeur de 20 points.
                </p>
              </div>

              {/* Détails vente conditionnelle */}
              {form.is_conditional_sale && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                    Précisions sur les conditions
                  </label>
                  <textarea
                    value={form.conditional_sale_details}
                    onChange={(e) => update('conditional_sale_details', e.target.value)}
                    placeholder="Précisez les conditions de la vente (ex : en attente du permis de construire, vente d'un autre bien en cours...)"
                    rows={3}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Publication...
              </span>
            ) : (
              'Publier mon bien off-market'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
