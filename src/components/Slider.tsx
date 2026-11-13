import { Children, useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================
// Carrousel horizontal, sans bibliothèque
// ============================================================
// - Mobile : glisser au doigt (défilement natif + aimantation), la carte suivante dépasse
//   pour inviter à glisser.
// - Tablette : 2 cartes, ordinateur : 3 cartes ; flèches, glisser-déposer à la souris,
//   flèches du clavier.
// - Barre de progression et compteur ; défilement automatique discret qui s'arrête
//   dès la première interaction, au survol, hors écran, onglet caché ou si la
//   personne a demandé de réduire les animations.

const AUTOPLAY_MS = 5500;

export default function Slider({
  label,
  children,
  autoplay = true,
  header,
}: {
  /** Nom du carrousel pour les lecteurs d'écran */
  label: string;
  children: ReactNode;
  autoplay?: boolean;
  /** Titre affiché à gauche des flèches */
  header?: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [perView, setPerView] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(count <= 1);
  const [progress, setProgress] = useState(0);

  // L'utilisateur a pris la main : le défilement automatique s'arrête pour de bon
  const touched = useRef(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  // Largeur d'un pas (une carte + l'écart)
  const step = useCallback(() => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  // Position courante : carte active, extrémités, progression
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const s = step();
    const max = el.scrollWidth - el.clientWidth;
    const per = Math.max(1, Math.round((el.clientWidth + 1) / s));
    setPerView(per);
    setActive(Math.min(count - 1, Math.round(el.scrollLeft / s)));
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
    setProgress(max > 0 ? el.scrollLeft / max : 1);
  }, [count, step]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [measure]);

  const goTo = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const target = Math.max(0, Math.min(index, count - 1));
      el.scrollTo({ left: target * step(), behavior: reducedMotion.current ? 'auto' : 'smooth' });
    },
    [count, step],
  );

  // Avance d'une « page » (le nombre de cartes visibles)
  const page = (dir: 1 | -1) => {
    touched.current = true;
    goTo(active + dir * perView);
  };

  // Défilement automatique : seulement visible à l'écran, sans survol ni interaction
  useEffect(() => {
    const el = track.current;
    if (!el || !autoplay) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay]);

  useEffect(() => {
    if (!autoplay || reducedMotion.current || touched.current || paused || !visible || count <= perView) return;
    const id = window.setInterval(() => {
      if (document.hidden || touched.current) return;
      const el = track.current;
      if (!el) return;
      // Arrivé au bout : retour au début
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) goTo(0);
      else goTo(Math.round(el.scrollLeft / step()) + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, paused, visible, count, perView, goTo, step]);

  // Glisser-déposer à la souris (le doigt et le pavé tactile défilent déjà nativement)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !track.current) return;
    touched.current = true;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = track.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    // Aimantation sur la carte la plus proche, une fois l'aimantation native rétablie
    requestAnimationFrame(() => goTo(Math.round((track.current?.scrollLeft ?? 0) / step())));
    // Évite qu'un glissement se termine par un clic sur un bouton
    const block = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    window.addEventListener('click', block, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', block, { capture: true }), 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      touched.current = true;
      goTo(active + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      touched.current = true;
      goTo(e.key === 'Home' ? 0 : count - 1);
    }
  };

  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition-colors hover:border-cyan-500 hover:text-cyan-400 disabled:cursor-default disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400';
  const lastShown = Math.min(count, active + perView);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">{header}</div>
        {count > 1 && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button type="button" className={arrow} onClick={() => page(-1)} disabled={atStart} aria-label="Précédent">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" className={arrow} onClick={() => page(1)} disabled={atEnd} aria-label="Suivant">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-6">
        {/* Fondu sur les bords quand il reste des cartes de ce côté (ordinateur) */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-slate-950 to-transparent transition-opacity sm:block ${atStart ? 'opacity-0' : 'opacity-100'}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-slate-950 to-transparent transition-opacity sm:block ${atEnd ? 'opacity-0' : 'opacity-100'}`}
        />

        <div
          ref={track}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchStart={() => (touched.current = true)}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) touched.current = true;
          }}
          className={`no-scrollbar -mx-6 flex gap-5 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 focus-visible:outline-none sm:mx-0 sm:scroll-px-0 sm:px-0 ${
            dragging ? 'cursor-grabbing select-none' : 'snap-x snap-mandatory sm:cursor-grab'
          }`}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="élément"
              aria-label={`${i + 1} sur ${count}`}
              className="flex shrink-0 basis-[85%] snap-start sm:basis-[calc(50%-10px)] lg:basis-[calc((100%-40px)/3)] [&>*]:w-full"
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {count > perView && (
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label="Position dans le carrousel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-full bg-cyan-500 transition-[width] duration-200"
              style={{ width: `${(atEnd ? 1 : lastShown / count) * 100}%` }}
            />
          </div>
          <p className="shrink-0 text-xs tabular-nums text-slate-500" aria-live="polite">
            {perView > 1 ? `${active + 1}–${lastShown}` : active + 1} / {count}
          </p>
        </div>
      )}
    </section>
  );
}
