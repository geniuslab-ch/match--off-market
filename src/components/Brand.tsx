// Logo typographique de la plateforme, utilisé dans tous les en-têtes.

export const BRAND_NAME = 'Off Market Suisse Romande';

// Police du logo, réutilisée pour les grands titres
export const DISPLAY_FONT = { fontFamily: "'Fraunces', Georgia, serif" } as const;
const SUB_FONT = { fontFamily: "'Outfit', system-ui, sans-serif" } as const;

export default function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const title = { sm: 'text-xl', md: 'text-2xl', lg: 'text-5xl' }[size];
  const sub = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-xs' }[size];

  return (
    <div className={`inline-flex flex-col ${size === 'lg' ? 'items-center gap-3' : 'items-start gap-1'}`}>
      <p className={`${title} font-medium leading-none tracking-tight`} style={DISPLAY_FONT}>
        <span className="italic text-cyan-400">Off</span> <span className="text-slate-100">Market</span>
      </p>
      <p className={`${sub} uppercase leading-none tracking-[0.42em] text-slate-400`} style={SUB_FONT}>
        Suisse romande
      </p>
    </div>
  );
}
