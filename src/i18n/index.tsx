// ============================================================
// Traductions : français (langue source), allemand, italien, anglais
// ============================================================
// Le texte français sert de clé : t('Je vends') renvoie la traduction de la langue
// choisie, ou le français s'il n'y en a pas. Les variables s'écrivent {0}, {1}...
// La langue est détectée depuis le navigateur à la première visite, puis retenue.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import de from './de';
import en from './en';
import it from './it';

export type Lang = 'fr' | 'de' | 'it' | 'en';

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'en', label: 'EN', name: 'English' },
];

const DICTS: Record<Exclude<Lang, 'fr'>, Record<string, string>> = { de, it, en };
export const ALL_DICTS = DICTS;

/** Format suisse de chaque langue pour les nombres et les dates */
const LOCALES: Record<Lang, string> = { fr: 'fr-CH', de: 'de-CH', it: 'it-CH', en: 'en-CH' };

const STORAGE_KEY = 'om_lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS.some((l) => l.code === saved)) return saved as Lang;
  } catch {
    /* stockage indisponible : on continue avec le navigateur */
  }
  if (typeof navigator !== 'undefined') {
    for (const l of navigator.languages ?? [navigator.language]) {
      const code = String(l).slice(0, 2).toLowerCase();
      if (LANGS.some((x) => x.code === code)) return code as Lang;
    }
  }
  return 'fr';
}

let current: Lang = detect();

export const getLang = () => current;
/** Locale pour toLocaleString / toLocaleDateString */
export const loc = () => LOCALES[current];

/** Traduit un texte français ; {0}, {1}... sont remplacés par les valeurs données */
export function t(fr: string, ...values: (string | number | null | undefined)[]): string {
  const text = current === 'fr' ? fr : DICTS[current][fr] ?? fr;
  if (values.length === 0) return text;
  return text.replace(/\{(\d+)\}/g, (m, i) => {
    const v = values[Number(i)];
    return v === null || v === undefined ? '' : String(v);
  });
}

/**
 * Traduction avec contexte, pour un même texte français qui se traduit différemment
 * selon l'usage (« {0} à {1} » : un lieu ou une fourchette). Clé du dictionnaire : « contexte|texte ».
 */
export function tc(context: string, fr: string, ...values: (string | number | null | undefined)[]): string {
  if (current === 'fr') return t(fr, ...values);
  const key = `${context}|${fr}`;
  return DICTS[current][key] !== undefined ? t(key, ...values) : t(fr, ...values);
}

/** Zone affichée : les cantons sont traduits (« Kanton Waadt »), les communes gardent leur nom */
export const zoneLabel = (zone: string | null | undefined): string =>
  zone && /^Canton (de |du )/.test(zone) ? t(zone) : zone ?? '';

/** Toutes les traductions d'un texte (pour reconnaître les titres de colonnes Excel dans chaque langue) */
export function allTranslations(fr: string): string[] {
  return [fr, ...Object.values(DICTS).map((d) => d[fr]).filter((x): x is string => Boolean(x))];
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: current,
  setLang: () => undefined,
});

export const useLang = () => useContext(LangContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    current = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* préférence non retenue, sans conséquence */
    }
    setLangState(l);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  // La clé force un nouveau rendu complet : tous les textes passent dans la nouvelle langue
  return (
    <LangContext.Provider value={value}>
      <div key={lang} className="contents">
        {children}
      </div>
    </LangContext.Provider>
  );
}

/** Sélecteur de langue compact (FR · DE · IT · EN) */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Langue / Sprache / Lingua / Language" className={`flex items-center gap-0.5 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.name}
          lang={l.code}
          className={`rounded-md px-1.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
            lang === l.code ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
