import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FloatingHorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  label?: string;
}

/**
 * Wraps horizontally scrollable tables/boards with a large, sticky floating
 * horizontal scrollbar at the bottom of the viewport so users never need to
 * scroll to the bottom of a long page to pan sideways.
 */
export const FloatingHorizontalScroll: React.FC<FloatingHorizontalScrollProps> = ({
  children,
  className = '',
  scrollClassName = '',
  label,
}) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef<'content' | 'rail' | null>(null);

  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const measure = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    setScrollWidth(el.scrollWidth);
    setClientWidth(el.clientWidth);
  }, []);

  useEffect(() => {
    measure();
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, children]);

  const hasOverflow = scrollWidth > clientWidth + 4;

  const handleContentScroll = () => {
    if (syncingRef.current === 'rail') return;
    syncingRef.current = 'content';
    if (railRef.current && contentRef.current) {
      railRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
    window.requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const handleRailScroll = () => {
    if (syncingRef.current === 'content') return;
    syncingRef.current = 'rail';
    if (contentRef.current && railRef.current) {
      contentRef.current.scrollLeft = railRef.current.scrollLeft;
    }
    window.requestAnimationFrame(() => {
      syncingRef.current = null;
    });
  };

  const nudgeScroll = (delta: number) => {
    const el = contentRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        onScroll={handleContentScroll}
        className={`overflow-x-auto ${scrollClassName}`}
      >
        {children}
      </div>

      {hasOverflow && (
        <div
          aria-label={label || 'Barra de rolagem lateral flutuante'}
          className="no-print sticky bottom-2 z-20 mt-2 flex items-center gap-2 rounded-xl border border-[#fa6607]/45 bg-[#121216]/95 px-2.5 py-2 shadow-xl backdrop-blur-md"
        >
          {label && (
            <span className="hidden md:inline-block shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pr-1">
              {label}
            </span>
          )}
          <button
            type="button"
            onClick={() => nudgeScroll(-280)}
            aria-label="Rolar para a esquerda"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0A] text-zinc-200 hover:border-[#fa6607] hover:text-[#fa6607] cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div
            ref={railRef}
            onScroll={handleRailScroll}
            className="floating-hscroll-rail flex-1 overflow-x-auto overflow-y-hidden"
          >
            <div style={{ width: `${scrollWidth}px`, height: '2px' }} />
          </div>

          <button
            type="button"
            onClick={() => nudgeScroll(280)}
            aria-label="Rolar para a direita"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0A] text-zinc-200 hover:border-[#fa6607] hover:text-[#fa6607] cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
