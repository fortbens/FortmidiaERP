import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Layers, Play } from 'lucide-react';
import { GROUP_PILLARS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { MediaFrame } from '../MediaFrame';
import {
  isOfficialSquareFortMidiaLogo,
  OFFICIAL_FORTMIDIA_LOGO_URL,
} from '../FortMidiaLogo';
import {
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isSafeMediaUrl,
} from '../../utils/videoEmbed';

interface HeroSectionProps {
  onOpenProposal: (defaultQuota?: string) => void;
  onOpenFortNews: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenProposal, onOpenFortNews }) => {
  const { siteSettings } = useFortMidia();
  const [mediaMode, setMediaMode] = useState<'video' | 'brand3d'>('video');

  return (
    <section
      id="inicio"
      className="relative border-b border-white/10 pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-16 lg:pb-24 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Split Layout */}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-12">
          {/* Left Proposition Column */}
          <div className="flex flex-col justify-between lg:col-span-6 min-w-0">
            <div className="min-w-0">
              <p
                className="text-xs font-medium tracking-wide break-words"
                style={{ color: siteSettings.goldColor }}
              >
                {siteSettings.heroEyebrow}
              </p>

              <h1 className="mt-3 sm:mt-4 font-display text-[clamp(1.75rem,6vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white [text-wrap:balance] break-words">
                {siteSettings.heroHeadline}
              </h1>

              <p className="mt-4 sm:mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-300 break-words">
                {siteSettings.heroSubheadline}
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <a
                  href="#cotas"
                  style={{ backgroundColor: siteSettings.primaryColor }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-5 sm:px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:whitespace-nowrap text-center"
                >
                  <span>{siteSettings.heroPrimaryCta}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={onOpenFortNews}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 sm:px-5 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.08] sm:whitespace-nowrap cursor-pointer text-center"
                >
                  <span>Abrir Portal FortNews</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Proof Adjacency Strip */}
            <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-6 border-t border-white/10 pt-5 sm:pt-6">
              <div className="min-w-0">
                <div className="font-mono text-xl sm:text-2xl font-semibold text-white tabular-nums">5</div>
                <div className="mt-1 text-[11px] sm:text-xs text-zinc-400 leading-snug break-words">
                  Cidades do CIMBAJU
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-mono text-xl sm:text-2xl font-semibold text-white tabular-nums">7</div>
                <div className="mt-1 text-[11px] sm:text-xs text-zinc-400 leading-snug break-words">
                  Podcasts 16h–20h
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="font-mono text-xl sm:text-2xl font-semibold tabular-nums"
                  style={{ color: siteSettings.primaryColor }}
                >
                  360°
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-zinc-400 leading-snug break-words">
                  Digital, OOH & Impresso
                </div>
              </div>
            </div>
          </div>

          {/* Right Media Showcase Column */}
          <div className="lg:col-span-6 flex flex-col min-w-0">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#121214]">
              <div className="aspect-video w-full h-full min-h-[210px] sm:min-h-[280px] relative">
                {mediaMode === 'video' ? (
                  (() => {
                    const heroVideoSrc =
                      siteSettings.heroVideoUrl?.trim() && isSafeMediaUrl(siteSettings.heroVideoUrl)
                        ? siteSettings.heroVideoUrl.trim()
                        : '/assets/aistudio/Create_animation_video_for_logo_27da8ac9_1080p_0c3f73f9.mp4';
                    const heroEmbedUrl = getVideoEmbedUrl(heroVideoSrc);
                    const heroPosterSrc =
                      siteSettings.heroVideoPosterUrl?.trim() &&
                      isSafeMediaUrl(siteSettings.heroVideoPosterUrl)
                        ? siteSettings.heroVideoPosterUrl.trim()
                        : getYouTubeThumbnailUrl(heroVideoSrc) ||
                          '/assets/aistudio/Gemini_Generated_Image_ov5owov5owov5owo_7f33ef20.jpg';

                    if (heroEmbedUrl) {
                      return (
                        <iframe
                          src={heroEmbedUrl}
                          title={siteSettings.heroVideoTitle || 'Filme Institucional FortMídia'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0"
                        />
                      );
                    }
                    return (
                      <video
                        key={heroVideoSrc}
                        src={heroVideoSrc}
                        poster={heroPosterSrc}
                        controls
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    );
                  })()
                ) : isOfficialSquareFortMidiaLogo(siteSettings.logoUrl) ? (
                  <div className="h-full w-full bg-white flex items-center justify-center p-6 sm:p-10">
                    <img
                      src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
                      alt="Identidade visual oficial do Grupo FortMídia"
                      referrerPolicy="no-referrer"
                      className="h-full w-full max-w-[82%] object-contain"
                    />
                  </div>
                ) : (
                  <MediaFrame
                    src={siteSettings.logoUrl}
                    alt="Identidade visual do Grupo FortMídia"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Clean Segmented Switch below visual */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <span className="text-xs text-zinc-400 truncate">
                {siteSettings.heroVideoTitle || 'FortMídia & Grupo FortNews · Estúdio Central CIMBAJU'}
              </span>
              <div className="inline-flex w-full sm:w-auto items-center gap-1 rounded-lg border border-white/10 bg-[#141416] p-1">
                <button
                  type="button"
                  onClick={() => setMediaMode('video')}
                  style={mediaMode === 'video' ? { backgroundColor: siteSettings.primaryColor } : undefined}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mediaMode === 'video' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Play className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Filme Institucional
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('brand3d')}
                  style={mediaMode === 'brand3d' ? { backgroundColor: siteSettings.primaryColor } : undefined}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mediaMode === 'brand3d' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Identidade Oficial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars of the Group (Full-width row below hero split) */}
        <div id="pilares" className="mt-14 sm:mt-16 pt-10 sm:pt-12 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: siteSettings.primaryColor }}>
                Arquitetura de Comunicação
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance] break-words">
                Os 4 pilares do Grupo FortMídia
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenProposal('Pacote Integrado 4 Pilares')}
              className="text-sm font-medium text-zinc-300 hover:text-white underline underline-offset-4 self-start sm:self-auto cursor-pointer"
            >
              Solicitar plano integrado 360°
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {GROUP_PILLARS.map((pillar) => (
              <article
                key={pillar.id}
                className="glass-surface flex flex-col justify-between rounded-xl border border-white/10 p-6 transition-colors hover:border-white/25"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-mono text-xs font-semibold tabular-nums"
                      style={{ color: siteSettings.primaryColor }}
                    >
                      {pillar.index}.
                    </span>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: siteSettings.goldColor }}
                    >
                      {pillar.targetReach}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-bold text-white">{pillar.name}</h3>
                  <p className="mt-1 text-xs font-medium text-zinc-400">{pillar.subtitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">{pillar.description}</p>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
                  <ul className="space-y-2 text-xs text-zinc-400">
                    {pillar.deliverables.map((item) => (
                      <li key={item} className="leading-snug">
                        — {item}
                      </li>
                    ))}
                  </ul>
                  {pillar.externalUrl && (
                    <a
                      href={siteSettings.newsPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-4"
                      style={{ color: siteSettings.primaryColor }}
                    >
                      Acessar jornalfortnews.com.br
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
