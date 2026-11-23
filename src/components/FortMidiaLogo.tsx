import React from 'react';
import { MediaFrame } from './MediaFrame';

export const OFFICIAL_FORTMIDIA_LOGO_URL = '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png';
export const OFFICIAL_FORTNEWS_LOGO_URL =
  '/assets/aistudio/Logo_FortNews_Vetorizado_Nova_Marca__Usar_Esse__9741accd.png';

const OFFICIAL_SQUARE_WHITE_LOGOS = new Set<string>([
  '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png',
  '/assets/aistudio/Logo_FortM_dia__3__19c85e10.png',
  '/assets/aistudio/Logo_FortM_dia__2__31ef6d6b.png',
]);

export function isOfficialSquareFortMidiaLogo(url?: string | null): boolean {
  if (!url) return true;
  return OFFICIAL_SQUARE_WHITE_LOGOS.has(url.trim());
}

export const isOfficialFortMidiaLogo = isOfficialSquareFortMidiaLogo;

export function isOfficialFortNewsLogo(url?: string | null): boolean {
  if (!url) return false;
  return url.trim() === OFFICIAL_FORTNEWS_LOGO_URL;
}

interface FortMidiaLogoProps {
  src?: string;
  alt?: string;
  heightPx?: number;
  mobileMaxHeightPx?: number;
  className?: string;
  onLightSurface?: boolean;
  rounded?: 'md' | 'lg' | 'xl';
}

export const FortMidiaLogo: React.FC<FortMidiaLogoProps> = ({
  src,
  alt = 'Grupo FortMídia',
  heightPx,
  mobileMaxHeightPx,
  className = '',
  onLightSurface = false,
  rounded = 'lg',
}) => {
  const resolvedSrc = src && src.trim() ? src : OFFICIAL_FORTMIDIA_LOGO_URL;
  const isOfficialSquare = isOfficialSquareFortMidiaLogo(resolvedSrc);

  const roundedClass =
    rounded === 'xl' ? 'rounded-xl' : rounded === 'md' ? 'rounded-md' : 'rounded-lg';

  const hasResponsiveHeight = typeof heightPx === 'number' && heightPx > 0;
  const desktopH = hasResponsiveHeight ? heightPx : undefined;
  const mobileH =
    hasResponsiveHeight && typeof mobileMaxHeightPx === 'number'
      ? Math.min(heightPx, mobileMaxHeightPx)
      : desktopH;

  const sizeStyle = hasResponsiveHeight
    ? ({
        '--fm-logo-m': `${mobileH}px`,
        '--fm-logo-d': `${desktopH}px`,
      } as React.CSSProperties)
    : undefined;

  const responsiveHeightClass = hasResponsiveHeight
    ? 'h-[var(--fm-logo-m)] sm:h-[var(--fm-logo-d)]'
    : '';

  if (isOfficialSquare) {
    return (
      <span
        style={sizeStyle}
        className={`inline-flex items-center justify-center overflow-hidden aspect-[1.75/1] max-w-full shrink-0 bg-white ${roundedClass} ${
          onLightSurface
            ? 'border border-zinc-200/80'
            : 'ring-1 ring-white/15 shadow-sm'
        } ${responsiveHeightClass} ${className}`}
      >
        <img
          src={resolvedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-[50%_60%] select-none pointer-events-none"
        />
      </span>
    );
  }

  return (
    <MediaFrame
      src={resolvedSrc}
      alt={alt}
      style={sizeStyle}
      className={`w-auto max-w-[60vw] sm:max-w-[360px] object-contain shrink-0 ${responsiveHeightClass} ${className}`}
    />
  );
};

interface FortNewsLogoProps {
  src?: string;
  alt?: string;
  heightPx?: number;
  mobileMaxHeightPx?: number;
  className?: string;
  style?: React.CSSProperties;
  onLightSurface?: boolean;
  rounded?: 'md' | 'lg' | 'xl';
}

export const FortNewsLogo: React.FC<FortNewsLogoProps> = ({
  src,
  alt = 'Jornal FortNews',
  heightPx,
  mobileMaxHeightPx,
  className = '',
  style,
  onLightSurface = false,
  rounded = 'lg',
}) => {
  const resolvedSrc = src && src.trim() ? src : OFFICIAL_FORTNEWS_LOGO_URL;
  const roundedClass =
    rounded === 'xl' ? 'rounded-xl' : rounded === 'md' ? 'rounded-md' : 'rounded-lg';

  const hasResponsiveHeight = typeof heightPx === 'number' && heightPx > 0;
  const desktopH = hasResponsiveHeight ? heightPx : undefined;
  const mobileH =
    hasResponsiveHeight && typeof mobileMaxHeightPx === 'number'
      ? Math.min(heightPx, mobileMaxHeightPx)
      : desktopH;

  const sizeStyle: React.CSSProperties | undefined = hasResponsiveHeight
    ? ({
        '--fn-logo-m': `${mobileH}px`,
        '--fn-logo-d': `${desktopH}px`,
        ...style,
      } as React.CSSProperties)
    : style;

  const responsiveHeightClass = hasResponsiveHeight
    ? 'h-[var(--fn-logo-m)] sm:h-[var(--fn-logo-d)]'
    : '';

  return (
    <span
      style={sizeStyle}
      className={`inline-flex items-center justify-center overflow-hidden max-w-full shrink-0 ${
        onLightSurface
          ? ''
          : `bg-white px-2.5 py-1 ${roundedClass} ring-1 ring-white/20 shadow-sm`
      } ${responsiveHeightClass} ${className}`}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className="h-full w-auto max-w-full object-contain select-none pointer-events-none"
      />
    </span>
  );
};
