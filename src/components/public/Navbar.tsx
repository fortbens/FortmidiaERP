import React, { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { FortMidiaLogo } from '../FortMidiaLogo';

interface NavbarProps {
  onOpenProposal: (defaultQuota?: string) => void;
  onOpenFortNews: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenProposal,
  onOpenFortNews,
  theme = 'dark',
  onToggleTheme,
}) => {
  const { siteSettings } = useFortMidia();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLight = theme === 'light';

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const logoHeightPx = Math.min(140, Math.max(28, siteSettings.logoHeightPx || 52));

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 ${
        isLight
          ? 'border-zinc-200/90 bg-white/95 text-zinc-900 shadow-xs'
          : 'border-white/10 bg-[#0A0A0A]/90 text-white'
      }`}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 sm:gap-4 lg:gap-8 px-4 py-2 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark or Official FortMídia Logo */}
        <a
          href="#inicio"
          className={`font-display text-base sm:text-lg font-bold tracking-tight whitespace-nowrap min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600] rounded-lg inline-flex items-center gap-2 shrink-0 ${
            isLight ? 'text-zinc-900' : 'text-white'
          }`}
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

        {/* Zone 2: Concise single-line public navigation links */}
        <nav
          aria-label="Navegação principal"
          className={`hidden lg:flex items-center gap-6 text-sm font-medium ${
            isLight ? 'text-zinc-700' : 'text-zinc-300'
          }`}
        >
          <a
            href="#noticias"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Notícias
          </a>
          <a
            href="#cotas"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Cotas & Planos
          </a>
          <a
            href="#mapa-outdoors"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Mapa Outdoors
          </a>
          <a
            href="#galeria"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Galeria
          </a>
          <button
            type="button"
            onClick={onOpenFortNews}
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 cursor-pointer ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Portal FortNews
          </button>
          <a
            href="#fala-cidadao"
            className={`whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4 ${
              isLight ? 'hover:text-zinc-950' : 'hover:text-white'
            }`}
          >
            Fala Cidadão
          </a>
        </nav>

        {/* Zone 3: Theme Toggle + Primary CTA */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
              aria-pressed={isLight}
              title={isLight ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa6607] ${
                isLight
                  ? 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                  : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                  <span>Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                  <span>Claro</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenProposal('Cota Master FortNews Podcast')}
            style={{ backgroundColor: siteSettings.primaryColor }}
            className="whitespace-nowrap shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            Anunciar Agora
          </button>
        </div>

        {/* Mobile Controls: Theme Toggle + Menu Button */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
              aria-pressed={isLight}
              title={isLight ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                  : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/10'
              }`}
            >
              {isLight ? (
                <Moon className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                : 'border-white/10 text-zinc-200 hover:bg-white/5'
            }`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer — fixed overlay para sempre abrir em qualquer posição de rolagem */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col">
          <div
            className={`relative z-10 border-t border-b px-4 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl ${
              isLight
                ? 'border-zinc-200 bg-white text-zinc-800'
                : 'border-white/10 bg-[#0F0F11] text-zinc-200'
            }`}
          >
            <a
              href="#noticias"
              onClick={handleLinkClick}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Notícias & Editorias
            </a>
            <a
              href="#cotas"
              onClick={handleLinkClick}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Cotas & Planos
            </a>
            <a
              href="#mapa-outdoors"
              onClick={handleLinkClick}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Mapa dos Outdoors
            </a>
            <a
              href="#galeria"
              onClick={handleLinkClick}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Galeria de Fotos & Serviços
            </a>
            <button
              type="button"
              onClick={() => {
                handleLinkClick();
                onOpenFortNews();
              }}
              className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Portal de Notícias FortNews
            </button>
            <a
              href="#fala-cidadao"
              onClick={handleLinkClick}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              Fala Cidadão
            </a>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium cursor-pointer ${
                  isLight
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
                    : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/5'
                }`}
              >
                <span>Tema da Interface</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  {isLight ? (
                    <>
                      <Sun className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                      Claro
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                      Escuro
                    </>
                  )}
                </span>
              </button>
            )}

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

