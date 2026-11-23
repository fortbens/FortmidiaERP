import React from 'react';
import { ArrowUpRight, Facebook, Globe, Instagram, Mail, Phone, Youtube } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { FortMidiaLogo } from '../FortMidiaLogo';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenFortNews: () => void;
  onOpenClientPortal?: () => void;
  onOpenPresentation?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  onOpenFortNews,
  onOpenClientPortal,
  onOpenPresentation,
}) => {
  const { siteSettings } = useFortMidia();
  const footerLogoH = Math.min(128, Math.max(36, siteSettings.logoHeightPx || 52));
  const whatsappDigits = (siteSettings.whatsappNumber || '5511957792424').replace(/\D/g, '');
  const instagramUrl = siteSettings.instagramUrl || 'https://www.instagram.com/grupofortnews';
  const facebookUrl = siteSettings.facebookUrl || 'https://www.facebook.com/portalfortnew';
  const youtubeUrl = siteSettings.youtubeUrl || 'https://www.youtube.com/@FortnewsPodcast';

  return (
    <footer className="border-t border-white/10 bg-[#08080A] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-5">
            {siteSettings.logoMode === 'image' && siteSettings.logoUrl ? (
              <div className="mb-3">
                <FortMidiaLogo
                  src={siteSettings.logoUrl}
                  alt={`${siteSettings.brandName} ${siteSettings.brandHighlight}`}
                  heightPx={footerLogoH}
                  mobileMaxHeightPx={48}
                />
              </div>
            ) : (
              <div className="font-display text-lg font-bold text-white">
                {siteSettings.brandName}{' '}
                <span style={{ color: siteSettings.primaryColor }}>
                  {siteSettings.brandHighlight}
                </span>
              </div>
            )}
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
              Holding de mídia e agência de publicidade 360° na região do CIMBAJU (Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã). Informação que conecta você.
            </p>

            {/* Redes Sociais Oficiais */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Grupo FortNews"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#fa6607]/60 hover:text-white"
              >
                <Instagram className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                Instagram
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Portal FortNews"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#fa6607]/60 hover:text-white"
              >
                <Facebook className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                Facebook
              </a>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube FortNews Podcast"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#fa6607]/60 hover:text-white"
              >
                <Youtube className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                YouTube
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2 text-xs text-zinc-400">
            <div className="font-semibold text-white">Navegação</div>
            <a href="#pilares" className="block hover:text-white">
              Pilares do Grupo
            </a>
            <a href="#cotas" className="block hover:text-white">
              Cotas & Planos Comerciais
            </a>
            <a href="#galeria" className="block hover:text-white">
              Galeria de Fotos & Serviços
            </a>
            <a href="#podcasts" className="block hover:text-white">
              FortNews Podcast (16h–20h)
            </a>
            <a href="#fala-cidadao" className="block hover:text-white">
              Canal Fala Cidadão
            </a>
          </div>

          <div className="md:col-span-4 space-y-2.5 text-xs text-zinc-400 min-w-0">
            <div className="font-semibold text-white">Contato, Portais & Governança</div>
            <button
              type="button"
              onClick={onOpenFortNews}
              className="flex items-start gap-2 font-semibold hover:underline cursor-pointer text-left break-words"
              style={{ color: siteSettings.primaryColor }}
            >
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Abrir Jornal FortNews</span>
            </button>
            <a
              href={siteSettings.newsPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium hover:text-white break-all"
            >
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Portal Externo: jornalfortnews.com.br</span>
            </a>
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium text-zinc-200 hover:text-white"
            >
              <Phone
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: siteSettings.primaryColor }}
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums">(11) 95779-2424</span>
              <span className="text-[11px] text-zinc-500">· WhatsApp Comercial</span>
            </a>
            <a
              href={`mailto:${siteSettings.contactEmail}`}
              className="flex items-center gap-2 hover:text-white break-all"
            >
              <Mail
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: siteSettings.primaryColor }}
                aria-hidden="true"
              />
              <span>{siteSettings.contactEmail}</span>
            </a>
            <a
              href={`https://${siteSettings.siteDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white break-words"
            >
              <Globe
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: siteSettings.primaryColor }}
                aria-hidden="true"
              />
              <span>{siteSettings.siteDomain}</span>
            </a>
            <p className="text-zinc-500 break-words">
              Diretoria Executiva: {siteSettings.governanceNames}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500">
          <span>
            © {new Date().getFullYear()} Grupo FortMídia & Grupo FortNews. Todos os direitos reservados.
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span>CIMBAJU · São Paulo</span>
            {onOpenPresentation && (
              <button
                type="button"
                onClick={onOpenPresentation}
                className="text-zinc-400 transition-colors hover:text-[#D4AF37] cursor-pointer"
              >
                Apresentação 360°
              </button>
            )}
            {onOpenClientPortal && (
              <button
                type="button"
                onClick={onOpenClientPortal}
                className="text-zinc-400 transition-colors hover:text-[#fa6607] cursor-pointer"
              >
                Área do Cliente
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-zinc-400 transition-colors hover:text-zinc-100 cursor-pointer"
            >
              Sistema (/sistema)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
