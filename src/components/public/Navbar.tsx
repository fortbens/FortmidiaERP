import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { FortMidiaLogo } from '../FortMidiaLogo';

interface NavbarProps {
  onOpenProposal: (defaultQuota?: string) => void;
  onOpenFortNews: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProposal, onOpenFortNews }) => {
  const { siteSettings } = useFortMidia();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const logoHeightPx = Math.min(140, Math.max(28, siteSettings.logoHeightPx || 52));

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 lg:gap-8 px-4 py-2 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark or Official FortMídia Logo */}
        <a
          href="#inicio"
          className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600] rounded-lg inline-flex items-center gap-2 shrink-0"
        >
          {siteSettings.logoMode === 'image' && siteSettings.logoUrl ? (
            <FortMidiaLogo
              src={siteSettings.logoUrl}
              alt={`${siteSettings.brandName} ${siteSettings.brandHighlight}`}
              heightPx={logoHeightPx}
              mobileMaxHeightPx={44}
            />
          ) : (
            <span className="truncate">
              {siteSettings.brandName}{' '}
              <span style={{ color: siteSettings.primaryColor }}>
                {siteSettings.brandHighlight}
              </span>
            </span>
          )}
        </a>

        {/* Zone 2: 5 concise single-line public navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-300"
        >
          <a
            href="#noticias"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            Notícias
          </a>
          <a
            href="#cotas"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            Cotas & Planos
          </a>
          <a
            href="#mapa-outdoors"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            Mapa Outdoors
          </a>
          <a
            href="#galeria"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            Galeria
          </a>
          <button
            type="button"
            onClick={onOpenFortNews}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4 cursor-pointer"
          >
            Portal FortNews
          </button>
          <a
            href="#fala-cidadao"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            Fala Cidadão
          </a>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="hidden lg:flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onOpenProposal('Cota Master FortNews Podcast')}
            style={{ backgroundColor: siteSettings.primaryColor }}
            className="whitespace-nowrap shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            Anunciar Agora
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
          className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-zinc-200 hover:bg-white/5"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer — fixed overlay para sempre abrir em qualquer posição de rolagem */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col">
          <div className="relative z-10 border-t border-b border-white/10 bg-[#0F0F11] px-4 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl">
            <a
              href="#noticias"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Notícias & Editorias
            </a>
            <a
              href="#cotas"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Cotas & Planos
            </a>
            <a
              href="#mapa-outdoors"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Mapa dos Outdoors
            </a>
            <a
              href="#galeria"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Galeria de Fotos & Serviços
            </a>
            <button
              type="button"
              onClick={() => {
                handleLinkClick();
                onOpenFortNews();
              }}
              className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              Portal de Notícias FortNews
            </button>
            <a
              href="#fala-cidadao"
              onClick={handleLinkClick}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Fala Cidadão
            </a>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenProposal('Cota Master FortNews Podcast');
                }}
                style={{ backgroundColor: siteSettings.primaryColor }}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                Anunciar Agora
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="flex-1 bg-black/70 backdrop-blur-xs"
          />
        </div>
      )}
    </header>
  );
};
