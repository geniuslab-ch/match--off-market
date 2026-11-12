// Logo de la plateforme, utilisé dans tous les en-têtes.

export const BRAND_NAME = 'Offly';
export const SLOGAN = 'The right property. The right buyer. Before the market.';

// Police du logo, réutilisée pour les grands titres
export const DISPLAY_FONT = { fontFamily: "'Fraunces', Georgia, serif" } as const;
const SUB_FONT = { fontFamily: "'Outfit', system-ui, sans-serif" } as const;

export default function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const title = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-6xl' }[size];

  return (
    <div className={`inline-flex flex-col ${size === 'lg' ? 'items-center gap-3' : 'items-start'}`}>
      <p className={`${title} font-medium leading-none tracking-tight`} style={DISPLAY_FONT}>
        <span className="mr-[0.06em] italic text-cyan-400">Off</span>
        <span className="text-slate-100">ly</span>
      </p>
      {/* Le slogan n'apparaît qu'en grand format : trop long pour un en-tête */}
      {size === 'lg' && (
        <p className="text-[10px] uppercase leading-relaxed tracking-[0.24em] text-slate-400 sm:text-xs" style={SUB_FONT}>
          <span className="whitespace-nowrap">The right property. The right buyer.</span>{' '}
          <span className="whitespace-nowrap">Before the market.</span>
        </p>
      )}
    </div>
  );
}
