import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Film, Play, Tv, X } from 'lucide-react';
import { NEWS_SEALS, NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CimbajuCity, EditorialPauta, NewsSeal } from '../../types/fortmidia';
import {
  getArticlePosterUrl,
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isSafeMediaUrl,
  isVideoArticle,
} from '../../utils/videoEmbed';
import { MediaFrame } from '../MediaFrame';
import { ResolvedVideo } from '../ResolvedVideo';
import { SiteAdSlot } from './SiteAdSlot';

interface NewsSectionProps {
  onOpenFortNews: () => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ onOpenFortNews }) => {
  const { pautas, siteSettings, newsPortalSettings, siteAdBanners, siteAdsConfig } = useFortMidia();
  const [sealFilter, setSealFilter] = useState<'Todas' | NewsSeal>('Todas');
  const [cityFilter, setCityFilter] = useState<'Todas' | CimbajuCity>('Todas');
  const [readingArticle, setReadingArticle] = useState<EditorialPauta | null>(null);
  const [activeShowcaseVideoId, setActiveShowcaseVideoId] = useState<string | null>(null);

  const fortMidiaSiteBanners = siteAdBanners
    .filter((b) => b.active && (b.siteTarget === 'ambos' || b.siteTarget === 'fortmidia'))
    .sort((a, b) => a.priority - b.priority);
  const topAdBanner =
    siteAdsConfig.enabled && siteAdsConfig.topBannerEnabled
      ? (fortMidiaSiteBanners.find((b) => b.position === 'topo') ?? null)
      : null;
  const inFeedBanners =
    siteAdsConfig.enabled && siteAdsConfig.inFeedEnabled
      ? fortMidiaSiteBanners.filter((b) => b.position === 'entre_materias')
      : [];
  const inFeedInterval = Math.max(1, siteAdsConfig.inFeedInterval || 2);

  // Only articles explicitly approved & published by the Chief Editor appear on the public site
  const publishedNews = pautas.filter((p) => p.approvalStatus === 'Publicada no Site');

  const tickerItems =
    newsPortalSettings.marqueeAiItems && newsPortalSettings.marqueeAiItems.length > 0
      ? newsPortalSettings.marqueeAiItems
      : publishedNews.slice(0, 5).map((n) => `${n.seal.toUpperCase()}: ${n.title}`);

  const availableSeals = NEWS_SEALS.filter((seal) =>
    publishedNews.some((n) => n.seal === seal)
  );

  const filtered = publishedNews.filter((item) => {
    const mSeal = sealFilter === 'Todas' || item.seal === sealFilter;
    const mCity = cityFilter === 'Todas' || item.city === cityFilter;
    return mSeal && mCity;
  });

  const leadArticle = filtered[0];
  const secondaryArticles = filtered.slice(1);

  const siteVideoShowcase = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description?: string;
      videoUrl: string;
      posterUrl?: string;
      badge: string;
      meta: string;
      article?: EditorialPauta;
    }> = [];

    publishedNews
      .filter((p) => isVideoArticle(p))
      .forEach((art) => {
        items.push({
          id: `art-${art.id}`,
          title: art.title,
          description: art.summary,
          videoUrl: art.videoUrl!.trim(),
          posterUrl: getArticlePosterUrl(art),
          badge: art.seal,
          meta: `${art.city} · ${art.publishedAt || art.deadline}`,
          article: art,
        });
      });

    (siteSettings.siteVideos || [])
      .filter((v) => v.active && isSafeMediaUrl(v.videoUrl))
      .forEach((vid) => {
        items.push({
          id: `site-${vid.id}`,
          title: vid.title,
          description: vid.description,
          videoUrl: vid.videoUrl.trim(),
          posterUrl: vid.posterUrl || getYouTubeThumbnailUrl(vid.videoUrl) || undefined,
          badge: vid.category || 'FortMídia TV',
          meta: vid.createdAt || 'Vídeo Oficial',
        });
      });

    return items;
  }, [publishedNews, siteSettings.siteVideos]);

  const activeShowcaseVideo =
    siteVideoShowcase.find((v) => v.id === activeShowcaseVideoId) ?? siteVideoShowcase[0] ?? null;

  const sealTone = (seal: NewsSeal) => {
    if (seal === 'Break News' || seal === 'Urgente') return 'text-[#FF6600]';
    if (seal === 'Tempo' || seal === 'Esporte' || seal === 'Entretenimento') return 'text-[#D4AF37]';
    return 'text-zinc-300';
  };

  return (
    <section id="noticias" className="border-b border-white/10 bg-[#0A0A0A] py-14 sm:py-16 lg:py-24">
      {/* Legenda Circulante de Últimas Notícias */}
      {newsPortalSettings.marqueeTickerEnabled && tickerItems.length > 0 && (
        <div className="mb-10 border-y border-white/10 bg-[#121215]">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8 overflow-hidden">
            <span
              className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: newsPortalSettings.primaryColor || '#fa6607' }}
            >
              Últimas Notícias
            </span>
            <div
              className="fort-marquee-wrapper min-w-0 flex-1 overflow-hidden"
              style={
                {
                  '--fort-marquee-duration': `${newsPortalSettings.marqueeSpeedSeconds || 36}s`,
                } as React.CSSProperties
              }
            >
              <div className="fort-marquee-track items-center gap-8">
                {[...tickerItems, ...tickerItems].map((headline, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={onOpenFortNews}
                    className="inline-flex items-center gap-3 text-xs text-zinc-200 hover:text-[#FF6600] whitespace-nowrap cursor-pointer"
                  >
                    <span>{headline}</span>
                    <span className="text-zinc-600" aria-hidden="true">
                      •
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl min-w-0">
            <p className="text-xs font-medium" style={{ color: siteSettings.primaryColor }}>
              Redação FortNews · Matérias Aprovadas
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance] break-words">
              Notícias & Editorias em Destaque
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
              Cobertura local do CIMBAJU, São Paulo, Brasil e Mundo com selo editorial verificado pela chefia de redação.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
            <select
              aria-label="Filtrar notícias por cidade ou região"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value as 'Todas' | CimbajuCity)}
              className="w-full sm:w-auto rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-xs text-zinc-200 focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Todas">Todas as Cidades / Regiões</option>
              {NEWS_TERRITORIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenFortNews}
              style={{ backgroundColor: siteSettings.primaryColor }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 sm:whitespace-nowrap cursor-pointer"
            >
              <span>Abrir Jornal FortNews Completo</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>

            <a
              href={siteSettings.newsPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 sm:whitespace-nowrap"
            >
              <span>jornalfortnews.com.br</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Interactive Editorial Seal Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filtrar matérias por selo editorial"
          className="mt-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-[#141416] p-1 max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sealFilter === 'Todas'}
            onClick={() => setSealFilter('Todas')}
            style={
              sealFilter === 'Todas'
                ? { backgroundColor: siteSettings.primaryColor }
                : undefined
            }
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
              sealFilter === 'Todas' ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({publishedNews.length})
          </button>
          {availableSeals.map((seal) => (
            <button
              key={seal}
              type="button"
              role="tab"
              aria-selected={sealFilter === seal}
              onClick={() => setSealFilter(seal)}
              style={
                sealFilter === seal
                  ? { backgroundColor: siteSettings.primaryColor }
                  : undefined
              }
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                sealFilter === seal ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {seal}
            </button>
          ))}
        </div>

        {/* Banner Publicitário de Topo (Editável no Sistema) */}
        {topAdBanner && (
          <div className="mt-6">
            <SiteAdSlot
              banner={topAdBanner}
              variant="topo"
              theme="dark"
              showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
              onFallbackClick={onOpenFortNews}
            />
          </div>
        )}

        {/* Published News Feed */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-[#121215] p-10 text-center text-sm text-zinc-400">
            Nenhuma matéria publicada com os filtros selecionados.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Lead Story */}
            {leadArticle && (
              <article className="glass-surface lg:col-span-7 overflow-hidden rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                  {(() => {
                    const leadIsVideo = isVideoArticle(leadArticle);
                    const leadPoster = getArticlePosterUrl(leadArticle);
                    if (!leadPoster && !leadIsVideo) return null;
                    return (
                      <div
                        onClick={() => setReadingArticle(leadArticle)}
                        className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-[#141416] cursor-pointer"
                      >
                        {leadPoster ? (
                          <MediaFrame
                            src={leadPoster}
                            alt={leadArticle.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-black text-white">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6600] text-white shadow-lg">
                              <Play className="h-6 w-6 fill-white ml-0.5" aria-hidden="true" />
                            </span>
                            <span className="text-xs font-semibold text-zinc-300">
                              Reportagem em Vídeo · Clique para assistir
                            </span>
                          </div>
                        )}
                        {leadIsVideo && (
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/80 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                            <Play className="h-3 w-3 fill-[#FF6600] text-[#FF6600]" aria-hidden="true" />
                            VÍDEO
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`font-semibold ${sealTone(leadArticle.seal)}`}>
                        {leadArticle.seal}
                      </span>
                      <span className="text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-zinc-300">{leadArticle.city}</span>
                      <span className="text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-zinc-400 tabular-nums">
                        {leadArticle.publishedAt || leadArticle.deadline}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-xl sm:text-2xl font-bold leading-snug text-white [text-wrap:balance] break-words">
                      {leadArticle.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300 break-words">
                      {leadArticle.summary}
                    </p>
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-6 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 mt-2">
                  <span className="text-xs text-zinc-400 truncate max-w-full">
                    Por {leadArticle.reporter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReadingArticle(leadArticle)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                    style={{ color: siteSettings.primaryColor }}
                  >
                    {isVideoArticle(leadArticle) ? (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        Assistir e ler matéria
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        Ler matéria completa
                      </>
                    )}
                  </button>
                </div>
              </article>
            )}

            {/* Secondary Stories + Intervalo entre Matérias */}
            <div className="lg:col-span-5 flex flex-col gap-4 min-w-0">
              {secondaryArticles.map((art, idx) => {
                const shouldShowAd =
                  inFeedBanners.length > 0 &&
                  ((idx + 1) % inFeedInterval === 0 ||
                    (idx === secondaryArticles.length - 1 &&
                      secondaryArticles.length < inFeedInterval));
                const adBanner = shouldShowAd
                  ? inFeedBanners[Math.floor(idx / inFeedInterval) % inFeedBanners.length]
                  : null;

                return (
                  <React.Fragment key={art.id}>
                    <article
                      onClick={() => setReadingArticle(art)}
                      className="glass-surface flex gap-3 sm:gap-4 rounded-xl border border-white/10 p-3.5 sm:p-4 transition-colors hover:border-white/25 cursor-pointer min-w-0"
                    >
                      {(() => {
                        const artIsVideo = isVideoArticle(art);
                        const artPoster = getArticlePosterUrl(art);
                        if (!artPoster && !artIsVideo) return null;
                        return (
                          <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                            {artPoster ? (
                              <MediaFrame
                                src={artPoster}
                                alt={art.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-[#FF6600]">
                                <Play className="h-6 w-6 fill-[#FF6600]" aria-hidden="true" />
                              </div>
                            )}
                            {artIsVideo && (
                              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                <Play className="h-2.5 w-2.5 fill-[#FF6600] text-[#FF6600]" aria-hidden="true" />
                                VÍDEO
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className={`font-semibold ${sealTone(art.seal)}`}>{art.seal}</span>
                            <span className="text-zinc-600" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-zinc-400 truncate">{art.city}</span>
                          </div>
                          <h4 className="mt-1 font-display text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 break-words">
                            {art.title}
                          </h4>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                          <span className="truncate">{art.reporter}</span>
                          <span className="font-mono tabular-nums shrink-0">
                            {art.publishedAt || art.deadline}
                          </span>
                        </div>
                      </div>
                    </article>

                    {adBanner && (
                      <SiteAdSlot
                        banner={adBanner}
                        variant="entre_materias"
                        theme="dark"
                        showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                        onFallbackClick={onOpenFortNews}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Vídeos em Destaque · FortMídia & Matérias em Vídeo */}
        {activeShowcaseVideo && (
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#121215] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white shrink-0"
                  style={{ backgroundColor: siteSettings.primaryColor }}
                >
                  <Tv className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    Vídeos em Destaque · FortMídia &amp; Matérias em Vídeo
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Reportagens em vídeo publicadas pela redação e vídeos institucionais do Grupo FortMídia
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                {siteVideoShowcase.length} vídeo(s)
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-3">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black aspect-video">
                  {getVideoEmbedUrl(activeShowcaseVideo.videoUrl) ? (
                    <iframe
                      key={activeShowcaseVideo.id}
                      src={getVideoEmbedUrl(activeShowcaseVideo.videoUrl) || undefined}
                      title={activeShowcaseVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <ResolvedVideo
                      key={activeShowcaseVideo.id}
                      controls
                      playsInline
                      poster={activeShowcaseVideo.posterUrl}
                      src={activeShowcaseVideo.videoUrl}
                      className="h-full w-full bg-black object-contain"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className="font-semibold"
                        style={{ color: siteSettings.primaryColor }}
                      >
                        {activeShowcaseVideo.badge}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">{activeShowcaseVideo.meta}</span>
                    </div>
                    <h4 className="mt-1 font-display text-lg font-bold text-white leading-snug">
                      {activeShowcaseVideo.title}
                    </h4>
                    {activeShowcaseVideo.description && (
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                        {activeShowcaseVideo.description}
                      </p>
                    )}
                  </div>
                  {activeShowcaseVideo.article && (
                    <button
                      type="button"
                      onClick={() => setReadingArticle(activeShowcaseVideo.article!)}
                      style={{ backgroundColor: siteSettings.primaryColor }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer shrink-0"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Abrir matéria completa
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {siteVideoShowcase.map((vid) => {
                  const isCurrent = vid.id === activeShowcaseVideo.id;
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => setActiveShowcaseVideoId(vid.id)}
                      className={`w-full flex gap-3 rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'border-[#FF6600] bg-[#FF6600]/15'
                          : 'border-white/10 bg-[#0A0A0A] hover:border-white/25'
                      }`}
                    >
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                        {vid.posterUrl ? (
                          <MediaFrame
                            src={vid.posterUrl}
                            alt={vid.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#FF6600]">
                            <Film className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold text-white">
                          ▶
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold text-[#FF6600] truncate">
                          {vid.badge}
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-white line-clamp-2 leading-snug">
                          {vid.title}
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-400 truncate">
                          {vid.meta}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Article Reader Modal */}
      {readingArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] shadow-2xl">
            {(() => {
              const isVideo = isVideoArticle(readingArticle);
              const embedUrl = isVideo ? getVideoEmbedUrl(readingArticle.videoUrl) : null;
              const posterUrl = getArticlePosterUrl(readingArticle);

              if (isVideo) {
                return (
                  <div className="border-b border-white/10 bg-black">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#16161A] border-b border-white/10">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#FF6600]">
                        <Play className="h-3.5 w-3.5 fill-[#FF6600]" aria-hidden="true" />
                        Matéria em Vídeo · FortNews TV
                      </span>
                      <button
                        type="button"
                        onClick={() => setReadingArticle(null)}
                        aria-label="Fechar leitura"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/50 text-zinc-200 hover:bg-black hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="aspect-video w-full bg-black">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={readingArticle.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0"
                        />
                      ) : (
                        <ResolvedVideo
                          controls
                          playsInline
                          poster={posterUrl}
                          src={readingArticle.videoUrl}
                          className="h-full w-full bg-black object-contain"
                        />
                      )}
                    </div>
                  </div>
                );
              }

              if (readingArticle.imageUrl) {
                return (
                  <div className="relative h-60 w-full overflow-hidden border-b border-white/10">
                    <MediaFrame
                      src={readingArticle.imageUrl}
                      alt={readingArticle.title}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setReadingArticle(null)}
                      aria-label="Fechar leitura"
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/75 border border-white/15 text-white hover:bg-black cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              }

              return null;
            })()}

            <div className="p-6 sm:p-8">
              {!isVideoArticle(readingArticle) && !readingArticle.imageUrl && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setReadingArticle(null)}
                    aria-label="Fechar leitura"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-semibold ${sealTone(readingArticle.seal)}`}>
                  {readingArticle.seal}
                </span>
                <span className="text-zinc-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-zinc-300">{readingArticle.city}</span>
                <span className="text-zinc-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {readingArticle.publishedAt || readingArticle.deadline}
                </span>
              </div>

              <h3
                id="article-reader-title"
                className="mt-3 font-display text-2xl sm:text-3xl font-bold leading-tight text-white"
              >
                {readingArticle.title}
              </h3>

              <p className="mt-3 text-sm font-medium text-zinc-300 border-b border-white/10 pb-4">
                {readingArticle.summary}
              </p>

              <div className="mt-5 space-y-4 text-sm leading-relaxed text-zinc-200 whitespace-pre-line">
                {readingArticle.body}
              </div>

              {inFeedBanners.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <SiteAdSlot
                    banner={inFeedBanners[0]}
                    variant="entre_materias"
                    theme="dark"
                    showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                    onFallbackClick={onOpenFortNews}
                  />
                </div>
              )}

              <div className="mt-8 border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
                <span>Reportagem: {readingArticle.reporter}</span>
                {readingArticle.approvedBy && (
                  <span className="text-[#D4AF37]">
                    Aprovação Editorial: {readingArticle.approvedBy}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
