import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SiteAdBanner } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

interface SiteAdSlotProps {
  banner: SiteAdBanner;
  variant: 'topo' | 'entre_materias' | 'lateral';
  theme?: 'light' | 'dark';
  showSponsoredLabel?: boolean;
  onFallbackClick?: () => void;
}

export const SiteAdSlot: React.FC<SiteAdSlotProps> = ({
  banner,
  variant,
  theme = 'light',
  showSponsoredLabel = true,
  onFallbackClick,
}) => {
  const accent = banner.accentColor || '#fa6607';
  const darkSurface = banner.bgColor || '#111114';
  const hasExternalLink = Boolean(banner.linkUrl && banner.linkUrl.trim());

  const renderCta = (className: string) => {
    if (hasExternalLink) {
      return (
        <a
          href={banner.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ backgroundColor: accent }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 ${className}`}
        >
          <span>{banner.ctaLabel || 'Saiba Mais'}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={onFallbackClick}
        style={{ backgroundColor: accent }}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer ${className}`}
      >
        <span>{banner.ctaLabel || 'Anuncie Aqui'}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  };

  /* -------------------- TOPO (SUPERBANNER) -------------------- */
  if (variant === 'topo') {
    const isLight = theme === 'light';
    return (
      <aside
        aria-label={`Publicidade de topo: ${banner.advertiser}`}
        style={!isLight ? { backgroundColor: darkSurface } : undefined}
        className={`overflow-hidden rounded-xl border transition-colors ${
          isLight
            ? 'border-zinc-200 bg-white shadow-sm'
            : 'border-white/10 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {banner.imageUrl && (
              <div className="h-14 w-24 sm:h-16 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                <MediaFrame
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {showSponsoredLabel && (
                  <span
                    className={`font-semibold tracking-wider uppercase ${
                      isLight ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    Publicidade
                  </span>
                )}
                {showSponsoredLabel && (
                  <span className={isLight ? 'text-zinc-300' : 'text-zinc-700'} aria-hidden="true">
                    ·
                  </span>
                )}
                <span className="font-bold" style={{ color: accent }}>
                  {banner.advertiser}
                </span>
              </div>
              <div
                className={`mt-0.5 font-display text-sm sm:text-base font-bold leading-snug truncate ${
                  isLight ? 'text-zinc-950' : 'text-white'
                }`}
              >
                {banner.title}
              </div>
              {banner.subtitle && (
                <p
                  className={`mt-0.5 text-xs line-clamp-1 ${
                    isLight ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {banner.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="self-start sm:self-center">
            {renderCta('px-4 py-2 text-xs')}
          </div>
        </div>
      </aside>
    );
  }

  /* -------------------- INTERVALO ENTRE MATÉRIAS -------------------- */
  if (variant === 'entre_materias') {
    const isLight = theme === 'light';
    return (
      <aside
        aria-label={`Publicidade entre matérias: ${banner.advertiser}`}
        style={{ backgroundColor: darkSurface }}
        className={`overflow-hidden rounded-xl border ${
          isLight ? 'border-zinc-200 shadow-sm' : 'border-white/15'
        } text-white`}
      >
        <div className="flex flex-col sm:flex-row items-stretch">
          {banner.imageUrl && (
            <div className="relative h-40 sm:h-auto sm:w-52 shrink-0 overflow-hidden bg-zinc-900">
              <MediaFrame
                src={banner.imageUrl}
                alt={banner.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {showSponsoredLabel && (
                  <span className="font-semibold uppercase tracking-wider text-zinc-400">
                    Publicidade
                  </span>
                )}
                {showSponsoredLabel && (
                  <span className="text-zinc-600" aria-hidden="true">
                    ·
                  </span>
                )}
                <span className="font-bold" style={{ color: accent }}>
                  {banner.advertiser}
                </span>
              </div>
              <h3 className="mt-1 font-display text-base sm:text-lg font-bold leading-snug text-white">
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300 line-clamp-2">
                  {banner.subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-zinc-400">
                Espaço comercial oficial · Grupo FortMídia
              </span>
              {renderCta('px-4 py-2 text-xs')}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* -------------------- LATERAL / SIDEBAR -------------------- */
  return (
    <aside
      aria-label={`Publicidade lateral: ${banner.advertiser}`}
      style={{ backgroundColor: darkSurface }}
      className="overflow-hidden rounded-xl border border-zinc-200 text-white shadow-sm"
    >
      {banner.imageUrl && (
        <div className="h-36 w-full overflow-hidden bg-zinc-900">
          <MediaFrame
            src={banner.imageUrl}
            alt={banner.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-[10px]">
          {showSponsoredLabel && (
            <span className="font-semibold uppercase tracking-wider text-zinc-400">
              Publicidade
            </span>
          )}
          {showSponsoredLabel && (
            <span className="text-zinc-600" aria-hidden="true">
              ·
            </span>
          )}
          <span className="font-bold" style={{ color: accent }}>
            {banner.advertiser}
          </span>
        </div>
        <div className="font-display text-base font-bold leading-snug text-white">
          {banner.title}
        </div>
        {banner.subtitle && (
          <p className="text-xs leading-relaxed text-zinc-300">{banner.subtitle}</p>
        )}
        <div className="pt-1.5">{renderCta('w-full px-3.5 py-2 text-xs')}</div>
      </div>
    </aside>
  );
};
