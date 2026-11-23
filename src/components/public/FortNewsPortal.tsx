import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Facebook,
  Instagram,
  Megaphone,
  MessageCircle,
  Phone,
  Play,
  Radio,
  Search,
  Send,
  Share2,
  X,
  Youtube,
} from 'lucide-react';
import { NEWS_SEALS, NEWS_TERRITORIES, OFFICIAL_PODCASTS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CitizenCategory, CimbajuCity, EditorialPauta, NewsSeal } from '../../types/fortmidia';
import { getVideoEmbedUrl } from '../../utils/videoEmbed';
import { MediaFrame } from '../MediaFrame';
import { FortNewsLogo, isOfficialFortNewsLogo } from '../FortMidiaLogo';
import { SiteAdSlot } from './SiteAdSlot';

interface FortNewsPortalProps {
  onBackToHolding: () => void;
  onOpenFalaCidadao: () => void;
  onOpenAdmin: () => void;
}

export const FortNewsPortal: React.FC<FortNewsPortalProps> = ({
  onBackToHolding,
  onOpenAdmin,
}) => {
  const {
    pautas,
    advertisingCampaigns,
    siteAdBanners,
    siteAdsConfig,
    siteSettings,
    newsPortalSettings,
    submitCitizenReport,
  } = useFortMidia();
  const [selectedSeal, setSelectedSeal] = useState<'Todas' | NewsSeal>('Todas');
  const [selectedCity, setSelectedCity] = useState<'Todas' | CimbajuCity>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [topBannerIndex, setTopBannerIndex] = useState(0);

  // Modal "Fala com a Fort Cidadão" direto no portal fortnews.com.br
  const [cidadaoModalOpen, setCidadaoModalOpen] = useState(false);
  const [fcName, setFcName] = useState('');
  const [fcContact, setFcContact] = useState('');
  const [fcCity, setFcCity] = useState<CimbajuCity>('Franco da Rocha');
  const [fcNeighborhood, setFcNeighborhood] = useState('');
  const [fcCategory, setFcCategory] = useState<CitizenCategory>('Infraestrutura e Vias');
  const [fcUrgency, setFcUrgency] = useState<'Normal' | 'Alta' | 'Crítica'>('Alta');
  const [fcTitle, setFcTitle] = useState('');
  const [fcDescription, setFcDescription] = useState('');
  const [fcError, setFcError] = useState('');
  const [fcLastProtocol, setFcLastProtocol] = useState<string | null>(null);

  const handleSubmitFortCidadao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcName.trim() || !fcContact.trim() || !fcTitle.trim() || !fcDescription.trim()) {
      setFcError('Preencha nome, WhatsApp/telefone, título e relato para enviar sua demanda.');
      return;
    }
    const created = submitCitizenReport({
      citizenName: fcName.trim(),
      contact: fcContact.trim(),
      city: fcCity,
      neighborhood: fcNeighborhood.trim() || 'Centro',
      category: fcCategory,
      urgency: fcUrgency,
      title: fcTitle.trim(),
      description: fcDescription.trim(),
    });
    setFcLastProtocol(created.protocol);
    setFcError('');
    setFcName('');
    setFcContact('');
    setFcNeighborhood('');
    setFcTitle('');
    setFcDescription('');
  };

  // Only articles explicitly approved & published by the Chief Editor appear on FortNews
  const publishedNews = useMemo(
    () => pautas.filter((p) => p.approvalStatus === 'Publicada no Site'),
    [pautas]
  );

  const activeAds = useMemo(
    () => advertisingCampaigns.filter((a) => a.status === 'Em Veiculação'),
    [advertisingCampaigns]
  );

  const portalAdsEnabled = newsPortalSettings.showAds && siteAdsConfig.enabled;

  const fortNewsSiteBanners = useMemo(
    () =>
      siteAdBanners
        .filter((b) => b.active && (b.siteTarget === 'ambos' || b.siteTarget === 'fortnews'))
        .sort((a, b) => a.priority - b.priority),
    [siteAdBanners]
  );

  const activeTopBanners = useMemo(
    () => fortNewsSiteBanners.filter((b) => b.position === 'topo'),
    [fortNewsSiteBanners]
  );
  const activeInFeedBanners = useMemo(
    () => fortNewsSiteBanners.filter((b) => b.position === 'entre_materias'),
    [fortNewsSiteBanners]
  );
  const activeSidebarBanners = useMemo(
    () => fortNewsSiteBanners.filter((b) => b.position === 'lateral'),
    [fortNewsSiteBanners]
  );

  const inFeedInterval = Math.max(1, siteAdsConfig.inFeedInterval || 2);
  const currentTopBanner =
    activeTopBanners.length > 0
      ? activeTopBanners[topBannerIndex % activeTopBanners.length]
      : null;

  const fallbackSidebarAd = portalAdsEnabled ? (activeAds[1] ?? activeAds[0] ?? null) : null;

  const breakingArticle =
    newsPortalSettings.breakingTickerEnabled
      ? (publishedNews.find((n) => n.seal === 'Break News' || n.seal === 'Urgente') ??
          publishedNews[0] ??
          null)
      : null;

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedNews.filter((item) => {
      const mSeal = selectedSeal === 'Todas' || item.seal === selectedSeal;
      const mCity = selectedCity === 'Todas' || item.city === selectedCity;
      const mSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      return mSeal && mCity && mSearch;
    });
  }, [publishedNews, selectedSeal, selectedCity, searchQuery]);

  const readingArticle: EditorialPauta | null =
    publishedNews.find((n) => n.id === activeArticleId) ?? null;

  const leadStory = filteredNews[0] ?? null;
  const rightStackStories = filteredNews.slice(1, 4);
  const feedStories = filteredNews.slice(4);
  const mostReadStories = publishedNews.slice(0, 5);

  const sealAccentClass = (seal: NewsSeal) => {
    if (seal === 'Break News' || seal === 'Urgente') return 'text-[#fa6607]';
    if (seal === 'Esporte') return 'text-emerald-700';
    if (seal === 'Economia & Negócios') return 'text-sky-700';
    if (seal === 'Entretenimento' || seal === 'Fofoca' || seal === 'Humor')
      return 'text-[#D97706]';
    return 'text-zinc-700';
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleCopyArticle = async (art: EditorialPauta) => {
    try {
      await navigator.clipboard.writeText(
        `${art.title} — ${siteSettings.newsPortalUrl} (Portal Jornal FortNews)`
      );
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-zinc-900">
      {/* Top Institutional Utility Bar */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs text-zinc-600 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToHolding}
              className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 hover:text-[#fa6607] cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Grupo FortMídia
            </button>
            <span className="hidden md:inline text-zinc-300">|</span>
            <span className="hidden md:inline capitalize">{todayFormatted}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-2 border-r border-zinc-200 pr-3">
              <a
                href={siteSettings.instagramUrl || 'https://www.instagram.com/grupofortnews'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Grupo FortNews"
                title="Instagram @grupofortnews"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-[#fa6607]/10 hover:text-[#fa6607]"
              >
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={siteSettings.facebookUrl || 'https://www.facebook.com/portalfortnew'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Portal FortNews"
                title="Facebook Portal FortNews"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-[#fa6607]/10 hover:text-[#fa6607]"
              >
                <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={siteSettings.youtubeUrl || 'https://www.youtube.com/@FortnewsPodcast'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube FortNews Podcast"
                title="YouTube @FortnewsPodcast"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-[#fa6607]/10 hover:text-[#fa6607]"
              >
                <Youtube className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setFcLastProtocol(null);
                setCidadaoModalOpen(true);
              }}
              className="font-semibold text-[#fa6607] hover:underline cursor-pointer whitespace-nowrap"
            >
              Fala com a Fort Cidadão
            </button>
            <a
              href={siteSettings.newsPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-950 whitespace-nowrap"
            >
              jornalfortnews.com.br
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Dynamic Editorial Masthead */}
      <header className="text-white shadow-sm" style={{ backgroundColor: newsPortalSettings.primaryColor }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveArticleId(null);
                setSelectedSeal('Todas');
              }}
              className="flex items-center gap-3 text-left cursor-pointer min-w-0"
            >
              {(() => {
                const logoH = Math.min(140, Math.max(28, newsPortalSettings.logoHeightPx || 46));
                const fitMode = newsPortalSettings.logoFitMode || 'wide';
                if (isOfficialFortNewsLogo(newsPortalSettings.logoUrl)) {
                  return (
                    <div className="rounded-xl bg-white px-2.5 py-1 shadow-sm shrink-0 flex items-center justify-center">
                      <FortNewsLogo
                        src={newsPortalSettings.logoUrl}
                        alt={`Logo ${newsPortalSettings.portalName}`}
                        onLightSurface
                        style={{ height: `${logoH}px` }}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    className="overflow-hidden rounded-lg bg-white p-1 shrink-0 flex items-center justify-center"
                    style={{
                      height: `${logoH}px`,
                      width:
                        fitMode === 'wide'
                          ? `${Math.round(logoH * 2.6)}px`
                          : fitMode === 'auto'
                            ? 'auto'
                            : `${logoH}px`,
                      maxWidth: fitMode === 'auto' ? 'min(360px, 60vw)' : undefined,
                    }}
                  >
                    <MediaFrame
                      src={newsPortalSettings.logoUrl}
                      alt={`Logo ${newsPortalSettings.portalName}`}
                      className={fitMode === 'auto' ? 'h-full w-auto object-contain' : 'h-full w-full object-contain'}
                    />
                  </div>
                );
              })()}
              <div className="min-w-0">
                <div className="font-display text-lg sm:text-2xl font-extrabold tracking-tight leading-none truncate">
                  {newsPortalSettings.portalName}
                </div>
                <div className="mt-0.5 text-[11px] text-white/85 truncate">
                  {newsPortalSettings.portalTagline}
                </div>
              </div>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
            <select
              aria-label="Filtrar notícias por cidade ou abrangência"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value as 'Todas' | CimbajuCity);
                setActiveArticleId(null);
              }}
              className="w-full sm:w-auto rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-xs font-medium text-white focus:outline-none"
            >
              <option value="Todas" className="text-zinc-900">
                Todas as Regiões
              </option>
              {NEWS_TERRITORIES.map((loc) => (
                <option key={loc} value={loc} className="text-zinc-900">
                  {loc}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveArticleId(null);
                }}
                placeholder={`Buscar no ${newsPortalSettings.portalName}...`}
                className="w-full rounded-lg border border-white/25 bg-black/20 pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/70 focus:bg-black/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Editorias Sub-Navbar */}
        <nav
          aria-label="Editorias do Portal FortNews"
          className="border-t border-white/15"
          style={{ backgroundColor: newsPortalSettings.secondaryColor }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => {
                setSelectedSeal('Todas');
                setActiveArticleId(null);
              }}
              className={`rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSeal === 'Todas'
                  ? 'bg-white text-zinc-950'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Capa / Todas ({publishedNews.length})
            </button>
            {(newsPortalSettings.enabledSeals.length > 0
              ? newsPortalSettings.enabledSeals
              : NEWS_SEALS
            ).map((seal) => (
              <button
                key={seal}
                type="button"
                onClick={() => {
                  setSelectedSeal(seal);
                  setActiveArticleId(null);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSeal === seal
                    ? 'bg-white text-zinc-950 font-semibold'
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                {seal}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Legenda Circulante de Notícias (Marquee Contínuo IA) */}
      {newsPortalSettings.marqueeTickerEnabled && (
        <div className="border-b border-zinc-200 bg-zinc-950 text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <span className="shrink-0 rounded bg-[#fa6607] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Giro Regional
            </span>
            <div className="fort-marquee-wrapper min-w-0 flex-1 overflow-hidden">
              <div
                className="fort-marquee-track text-xs text-zinc-200"
                style={{
                  animationDuration: `${Math.max(16, newsPortalSettings.marqueeSpeedSeconds || 36)}s`,
                }}
              >
                {[
                  ...(newsPortalSettings.marqueeAiItems && newsPortalSettings.marqueeAiItems.length > 0
                    ? newsPortalSettings.marqueeAiItems
                    : publishedNews.slice(0, 5).map((n) => `${n.city}: ${n.title}`)),
                  ...(newsPortalSettings.marqueeAiItems && newsPortalSettings.marqueeAiItems.length > 0
                    ? newsPortalSettings.marqueeAiItems
                    : publishedNews.slice(0, 5).map((n) => `${n.city}: ${n.title}`)),
                ].map((headline, idx) => (
                  <button
                    key={`fn-mq-${idx}`}
                    type="button"
                    onClick={() => {
                      const match = publishedNews.find((art) =>
                        headline.toLowerCase().includes(art.title.slice(0, 22).toLowerCase())
                      );
                      if (match) {
                        setActiveArticleId(match.id);
                      } else {
                        setActiveArticleId(null);
                      }
                    }}
                    className="inline-flex items-center gap-3 pr-8 hover:text-[#FF6600] cursor-pointer"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF6600]" aria-hidden="true" />
                    <span>{headline}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plantão Breaking News Strip */}
      {breakingArticle && !readingArticle && (
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-xs sm:px-6 lg:px-8 min-w-0">
            <span className="font-bold uppercase tracking-wide text-[#fa6607] shrink-0">
              {breakingArticle.seal}
            </span>
            <span className="text-zinc-300" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setActiveArticleId(breakingArticle.id)}
              className="min-w-0 flex-1 truncate text-left font-medium text-zinc-900 hover:text-[#fa6607] hover:underline cursor-pointer"
            >
              {breakingArticle.title}
            </button>
          </div>
        </div>
      )}

      {/* Main Editorial Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Publicidade de Topo (Editável no Sistema -> Publicidade & Anúncios) */}
        {portalAdsEnabled && siteAdsConfig.topBannerEnabled && currentTopBanner && (
          <div className="space-y-2">
            <SiteAdSlot
              banner={currentTopBanner}
              variant="topo"
              theme="light"
              showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
              onFallbackClick={onBackToHolding}
            />
            {activeTopBanners.length > 1 && (
              <div className="flex items-center justify-end gap-2 text-[11px] text-zinc-500">
                <span className="font-mono tabular-nums">
                  Anúncio {(topBannerIndex % activeTopBanners.length) + 1} de {activeTopBanners.length}
                </span>
                <button
                  type="button"
                  aria-label="Anúncio anterior do topo"
                  onClick={() =>
                    setTopBannerIndex((prev) =>
                      prev === 0 ? activeTopBanners.length - 1 : prev - 1
                    )
                  }
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:border-[#fa6607] hover:text-[#fa6607] cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo anúncio do topo"
                  onClick={() => setTopBannerIndex((prev) => (prev + 1) % activeTopBanners.length)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:border-[#fa6607] hover:text-[#fa6607] cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== LEITOR COMPLETO DE MATÉRIA ==================== */}
        {readingArticle ? (
          <div className="grid gap-8 lg:grid-cols-12">
            <article className="lg:col-span-8 min-w-0 rounded-xl border border-zinc-200 bg-white p-4 sm:p-8 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveArticleId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fa6607] hover:underline cursor-pointer mb-5"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Voltar para a Capa do FortNews
              </button>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-bold ${sealAccentClass(readingArticle.seal)}`}>
                  {readingArticle.seal}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-medium text-zinc-700">{readingArticle.city}</span>
              </div>

              <h1 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold leading-tight text-zinc-950 break-words [text-wrap:balance]">
                {readingArticle.title}
              </h1>

              <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600 break-words">
                {readingArticle.summary}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-zinc-200 py-3 text-xs text-zinc-600">
                <div className="min-w-0">
                  Por <strong className="text-zinc-900">{readingArticle.reporter}</strong>
                  {readingArticle.approvedBy && (
                    <span className="ml-2 text-zinc-500">
                      · Edição: {readingArticle.approvedBy}
                    </span>
                  )}
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-500 tabular-nums">
                    Publicado em {readingArticle.publishedAt || readingArticle.deadline}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${readingArticle.title} — Leia no Jornal FortNews (${siteSettings.newsPortalUrl})`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-[#062010]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyArticle(readingArticle)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              {(() => {
                const isVideo =
                  readingArticle.mediaType === 'video' && Boolean(readingArticle.videoUrl?.trim());
                const embedUrl = isVideo ? getVideoEmbedUrl(readingArticle.videoUrl) : null;

                if (isVideo) {
                  return (
                    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
                      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <Play className="h-3.5 w-3.5 fill-[#fa6607] text-[#fa6607]" aria-hidden="true" />
                          Reportagem em Vídeo · Jornal FortNews
                        </span>
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
                          <video
                            controls
                            playsInline
                            poster={readingArticle.imageUrl}
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
                    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                      <MediaFrame
                        src={readingArticle.imageUrl}
                        alt={readingArticle.title}
                        className="w-full max-h-[420px] object-cover"
                      />
                    </div>
                  );
                }

                return null;
              })()}

              <div className="mt-6 space-y-4 text-sm sm:text-base leading-relaxed text-zinc-800 whitespace-pre-line break-words">
                {readingArticle.body}
              </div>

              {/* Publicidade no Intervalo / Rodapé da Matéria */}
              {portalAdsEnabled && siteAdsConfig.inFeedEnabled && activeInFeedBanners.length > 0 && (
                <div className="mt-8 border-t border-zinc-200 pt-6">
                  <SiteAdSlot
                    banner={activeInFeedBanners[0]}
                    variant="entre_materias"
                    theme="light"
                    showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                    onFallbackClick={onBackToHolding}
                  />
                </div>
              )}
            </article>

            {/* Sidebar Leitor */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <h2 className="font-display text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-2.5">
                  Mais Lidas no FortNews
                </h2>
                <ol className="mt-3 divide-y divide-zinc-100">
                  {mostReadStories.map((item, idx) => (
                    <li key={item.id} className="py-3">
                      <button
                        type="button"
                        onClick={() => setActiveArticleId(item.id)}
                        className="flex items-start gap-3 text-left group cursor-pointer"
                      >
                        <span className="font-display text-xl font-extrabold text-[#fa6607] tabular-nums leading-none">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold leading-snug text-zinc-800 group-hover:text-[#fa6607]">
                          {item.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              {portalAdsEnabled &&
                siteAdsConfig.sidebarEnabled &&
                activeSidebarBanners.length > 0 && (
                  <SiteAdSlot
                    banner={activeSidebarBanners[0]}
                    variant="lateral"
                    theme="light"
                    showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                    onFallbackClick={onBackToHolding}
                  />
                )}
            </aside>
          </div>
        ) : (
          /* ==================== CAPA EDITORIAL FORTNEWS ==================== */
          <>
            {filteredNews.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                <div className="text-base font-bold text-zinc-900">
                  Nenhuma matéria encontrada nesta editoria ou região
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Limpe os filtros ou aprove novas pautas na Mesa do Redator-Chefe no Painel.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeal('Todas');
                    setSelectedCity('Todas');
                    setSearchQuery('');
                  }}
                  className="mt-4 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Mostrar Todas as Notícias
                </button>
              </div>
            ) : (
              <>
                {/* Bloco 1: Manchete Principal + Sub-Manchetes + Tempo */}
                <section className="grid gap-6 lg:grid-cols-12">
                  {leadStory && (
                    <article
                      onClick={() => setActiveArticleId(leadStory.id)}
                      className="lg:col-span-7 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        {leadStory.imageUrl && (
                          <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
                            <MediaFrame
                              src={leadStory.imageUrl}
                              alt={leadStory.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            {leadStory.mediaType === 'video' && (
                              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                                <Play className="h-3 w-3 fill-[#fa6607] text-[#fa6607]" aria-hidden="true" />
                                VÍDEO
                              </span>
                            )}
                          </div>
                        )}
                        <div className="p-4 sm:p-6 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`font-bold ${sealAccentClass(leadStory.seal)}`}>
                              {leadStory.seal}
                            </span>
                            <span className="text-zinc-300">·</span>
                            <span className="text-zinc-600">{leadStory.city}</span>
                          </div>
                          <h1 className="mt-2 font-display text-xl sm:text-3xl font-extrabold leading-tight text-zinc-950 group-hover:text-[#fa6607] break-words">
                            {leadStory.title}
                          </h1>
                          <p className="mt-3 text-sm leading-relaxed text-zinc-600 break-words">
                            {leadStory.summary}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-zinc-100 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                        <span className="truncate">Por {leadStory.reporter}</span>
                        <span className="font-mono tabular-nums shrink-0">
                          {leadStory.publishedAt || leadStory.deadline}
                        </span>
                      </div>
                    </article>
                  )}

                  {/* Coluna Direita: Sub-Manchetes + Previsão do Tempo */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {rightStackStories.map((story) => (
                      <article
                        key={story.id}
                        onClick={() => setActiveArticleId(story.id)}
                        className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 cursor-pointer group"
                      >
                        {story.imageUrl && (
                          <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                            <MediaFrame
                              src={story.imageUrl}
                              alt={story.title}
                              className="h-full w-full object-cover"
                            />
                            {story.mediaType === 'video' && (
                              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                <Play className="h-2.5 w-2.5 fill-[#fa6607] text-[#fa6607]" aria-hidden="true" />
                                VÍDEO
                              </span>
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className={`font-bold ${sealAccentClass(story.seal)}`}>
                                {story.seal}
                              </span>
                              <span className="text-zinc-300">·</span>
                              <span className="text-zinc-500 truncate">{story.city}</span>
                            </div>
                            <h2 className="mt-1 font-display text-sm sm:text-base font-bold leading-snug text-zinc-900 group-hover:text-[#fa6607] line-clamp-2">
                              {story.title}
                            </h2>
                          </div>
                          <div className="mt-2 text-[11px] font-mono text-zinc-500 tabular-nums">
                            {story.publishedAt || story.deadline}
                          </div>
                        </div>
                      </article>
                    ))}

                    {/* Widget Tempo Regional CIMBAJU */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
                          <CloudSun className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900">
                            {newsPortalSettings.weatherCity}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {newsPortalSettings.weatherSummary}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <div className="text-lg font-bold text-zinc-950">
                          {newsPortalSettings.weatherTemp}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {newsPortalSettings.weatherMinMax}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bloco 2: Feed de Notícias + Mais Lidas & Publicidade ERP */}
                <section className="grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-[#fa6607] pb-2">
                      <h2 className="font-display text-lg font-bold text-zinc-950">
                        Últimas Notícias & Reportagens
                      </h2>
                      <span className="text-xs text-zinc-500 tabular-nums">
                        {filteredNews.length} matéria(s) no ar
                      </span>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const list = feedStories.length > 0 ? feedStories : filteredNews;
                        return list.map((art, index) => {
                          const shouldInjectAd =
                            portalAdsEnabled &&
                            siteAdsConfig.inFeedEnabled &&
                            activeInFeedBanners.length > 0 &&
                            ((index + 1) % inFeedInterval === 0 ||
                              (index === list.length - 1 && list.length < inFeedInterval));
                          const adIndex =
                            Math.floor(index / inFeedInterval) %
                            Math.max(1, activeInFeedBanners.length);
                          const inFeedBanner = shouldInjectAd ? activeInFeedBanners[adIndex] : null;

                          return (
                            <React.Fragment key={`feed-${art.id}`}>
                              <article
                                onClick={() => setActiveArticleId(art.id)}
                                className="flex flex-col sm:flex-row gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 cursor-pointer group"
                              >
                                {art.imageUrl && (
                                  <div className="relative h-44 sm:h-32 sm:w-48 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                    <MediaFrame
                                      src={art.imageUrl}
                                      alt={art.title}
                                      className="h-full w-full object-cover"
                                    />
                                    {art.mediaType === 'video' && (
                                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/85 px-2 py-0.5 text-[10px] font-bold text-white">
                                        <Play className="h-3 w-3 fill-[#fa6607] text-[#fa6607]" aria-hidden="true" />
                                        VÍDEO
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 flex flex-col justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className={`font-bold ${sealAccentClass(art.seal)}`}>
                                        {art.seal}
                                      </span>
                                      <span className="text-zinc-300">·</span>
                                      <span className="text-zinc-600">{art.city}</span>
                                    </div>
                                    <h3 className="mt-1 font-display text-base sm:text-lg font-bold leading-snug text-zinc-950 group-hover:text-[#fa6607]">
                                      {art.title}
                                    </h3>
                                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 line-clamp-2">
                                      {art.summary}
                                    </p>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                                    <span>Por {art.reporter}</span>
                                    <span className="font-mono tabular-nums">
                                      {art.publishedAt || art.deadline}
                                    </span>
                                  </div>
                                </div>
                              </article>

                              {inFeedBanner && (
                                <SiteAdSlot
                                  banner={inFeedBanner}
                                  variant="entre_materias"
                                  theme="light"
                                  showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                                  onFallbackClick={onBackToHolding}
                                />
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Sidebar Editorial & Comercial */}
                  <aside className="lg:col-span-4 space-y-6">
                    {/* Mais Lidas */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <h2 className="font-display text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-2.5">
                        Mais Lidas na Região
                      </h2>
                      <ol className="mt-2 divide-y divide-zinc-100">
                        {mostReadStories.map((item, idx) => (
                          <li key={`mr-${item.id}`} className="py-3">
                            <button
                              type="button"
                              onClick={() => setActiveArticleId(item.id)}
                              className="flex items-start gap-3 text-left group cursor-pointer"
                            >
                              <span className="font-display text-xl font-extrabold text-[#fa6607] tabular-nums leading-none">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-500">
                                  {item.seal} · {item.city}
                                </div>
                                <div className="text-xs font-semibold leading-snug text-zinc-900 group-hover:text-[#fa6607]">
                                  {item.title}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Publicidade Lateral (Editável no Sistema) */}
                    {portalAdsEnabled && siteAdsConfig.sidebarEnabled && (
                      <>
                        {activeSidebarBanners.length > 0 ? (
                          activeSidebarBanners.map((b) => (
                            <SiteAdSlot
                              key={b.id}
                              banner={b}
                              variant="lateral"
                              theme="light"
                              showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                              onFallbackClick={onBackToHolding}
                            />
                          ))
                        ) : fallbackSidebarAd ? (
                          <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-5 text-white">
                            <div className="text-[10px] font-semibold tracking-wider text-zinc-400">
                              ESPAÇO PATROCINADO · {fallbackSidebarAd.adType.toUpperCase()}
                            </div>
                            <div className="mt-2 font-display text-base font-bold text-white">
                              {fallbackSidebarAd.advertiser}
                            </div>
                            <div className="mt-1 text-xs text-[#fa6607] font-semibold">
                              {fallbackSidebarAd.title}
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                              {fallbackSidebarAd.placementSpec} ({fallbackSidebarAd.city})
                            </p>
                            <button
                              type="button"
                              onClick={onBackToHolding}
                              className="mt-4 w-full rounded-lg bg-[#fa6607] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                            >
                              Contratar Mídia no Portal
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* Grade Podcast 16h-20h */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
                        <div className="flex items-center gap-2 font-display text-sm font-bold text-zinc-950">
                          <Radio className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                          FortNews Podcast (16h–20h)
                        </div>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        {OFFICIAL_PODCASTS.slice(0, 4).map((show) => (
                          <div key={show.id} className="border-b border-zinc-100 pb-2 last:border-0">
                            <div className="font-semibold text-zinc-900">{show.title}</div>
                            <div className="text-[11px] text-zinc-500">
                              {show.daySlot} · {show.schedule} · {show.host}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </section>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer Portal FortNews */}
      <footer className="mt-12 border-t border-zinc-200 bg-white py-8 text-xs text-zinc-600">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {newsPortalSettings.logoUrl && (
                <MediaFrame
                  src={newsPortalSettings.logoUrl}
                  alt={`Logo ${newsPortalSettings.portalName}`}
                  style={{
                    height: `${Math.min(72, Math.max(28, Math.round((newsPortalSettings.logoHeightPx || 46) * 0.75)))}px`,
                  }}
                  className="w-auto max-w-[160px] object-contain shrink-0"
                />
              )}
              <div className="min-w-0 break-words">
                {newsPortalSettings.footerText}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={siteSettings.instagramUrl || 'https://www.instagram.com/grupofortnews'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-700 hover:border-[#fa6607] hover:text-[#fa6607]"
              >
                <Instagram className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                Instagram
              </a>
              <a
                href={siteSettings.facebookUrl || 'https://www.facebook.com/portalfortnew'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-700 hover:border-[#fa6607] hover:text-[#fa6607]"
              >
                <Facebook className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                Facebook
              </a>
              <a
                href={siteSettings.youtubeUrl || 'https://www.youtube.com/@FortnewsPodcast'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-medium text-zinc-700 hover:border-[#fa6607] hover:text-[#fa6607]"
              >
                <Youtube className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                YouTube
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
            <a
              href={`https://wa.me/${(siteSettings.whatsappNumber || '5511957792424').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-zinc-800 hover:text-[#fa6607]"
            >
              <Phone className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
              <span className="font-mono tabular-nums">(11) 95779-2424</span>
              <span className="font-normal text-zinc-500">· Comercial &amp; Redação</span>
            </a>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onBackToHolding}
                className="font-medium text-zinc-800 hover:text-[#fa6607] cursor-pointer"
              >
                Grupo FortMídia
              </button>
              <a
                href={siteSettings.newsPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-950 break-all"
              >
                {siteSettings.newsPortalUrl}
              </a>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                Painel
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Balão Flutuante em Destaque — Fala com a Fort Cidadão */}
      <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => {
            setFcLastProtocol(null);
            setCidadaoModalOpen(true);
          }}
          aria-label="Abrir canal Fala com a Fort Cidadão para enviar sua demanda"
          className="group relative flex items-center gap-3 rounded-2xl rounded-br-sm border-2 border-white bg-[#fa6607] px-4 py-3 text-left text-white shadow-2xl shadow-[#fa6607]/40 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#e55a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 cursor-pointer"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950/20 text-white">
            <Megaphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold tracking-tight whitespace-nowrap">
              Fala com a Fort Cidadão
            </span>
            <span className="hidden sm:block text-[11px] font-medium text-white/90 whitespace-nowrap">
              Envie sua demanda ou denúncia
            </span>
          </span>
        </button>
      </div>

      {/* Modal Integrado — Fala com a Fort Cidadão */}
      {cidadaoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fortnews-fala-cidadao-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 text-zinc-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fa6607] text-white">
                  <Megaphone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="fortnews-fala-cidadao-title"
                    className="font-display text-lg font-extrabold text-zinc-950"
                  >
                    Fala com a Fort Cidadão
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Envie sua demanda, reclamação ou sugestão de pauta direto para a Redação FortNews.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCidadaoModalOpen(false)}
                aria-label="Fechar janela Fala com a Fort Cidadão"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {fcLastProtocol ? (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" aria-hidden="true" />
                <div>
                  <div className="font-mono text-xs font-bold text-[#fa6607] tabular-nums">
                    Protocolo {fcLastProtocol}
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold text-zinc-950">
                    Demanda recebida com sucesso
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 max-w-md mx-auto">
                    Seu relato entrou na fila do canal Fala com a Fort Cidadão. Nossa equipe fará a triagem, encaminhamento e retornará a nota devolutiva pelo contato informado.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <a
                    href={`https://wa.me/${(siteSettings.whatsappNumber || '5511957792424').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá Redação FortNews! Acabei de registrar a demanda ${fcLastProtocol} no Fala com a Fort Cidadão e quero enviar fotos/vídeos complementares.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Enviar fotos no WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setFcLastProtocol(null)}
                    className="rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                  >
                    Nova Demanda
                  </button>
                  <button
                    type="button"
                    onClick={() => setCidadaoModalOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitFortCidadao} className="mt-4 space-y-3.5">
                {fcError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                    {fcError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Seu Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={fcName}
                      onChange={(e) => setFcName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      WhatsApp para Retorno *
                    </label>
                    <input
                      type="text"
                      required
                      value={fcContact}
                      onChange={(e) => setFcContact(e.target.value)}
                      placeholder="(11) 99999-0000"
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Cidade
                    </label>
                    <select
                      value={fcCity}
                      onChange={(e) => setFcCity(e.target.value as CimbajuCity)}
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                    >
                      {NEWS_TERRITORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Bairro / Local
                    </label>
                    <input
                      type="text"
                      value={fcNeighborhood}
                      onChange={(e) => setFcNeighborhood(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Urgência
                    </label>
                    <select
                      value={fcUrgency}
                      onChange={(e) =>
                        setFcUrgency(e.target.value as 'Normal' | 'Alta' | 'Crítica')
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Tema da Demanda
                  </label>
                  <select
                    value={fcCategory}
                    onChange={(e) => setFcCategory(e.target.value as CitizenCategory)}
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                  >
                    <option value="Infraestrutura e Vias">Infraestrutura e Vias</option>
                    <option value="Segurança Pública">Segurança Pública</option>
                    <option value="Saúde e Educação">Saúde e Educação</option>
                    <option value="Transporte e Mobilidade">Transporte e Mobilidade</option>
                    <option value="Pauta Comunitária">Pauta Comunitária</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Título / Assunto *
                  </label>
                  <input
                    type="text"
                    required
                    value={fcTitle}
                    onChange={(e) => setFcTitle(e.target.value)}
                    placeholder="Resumo direto da demanda ou problema"
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={fcDescription}
                    onChange={(e) => setFcDescription(e.target.value)}
                    placeholder="Conte o endereço aproximado, desde quando ocorre e o impacto para os moradores..."
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#fa6607] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3.5">
                  <span className="text-[11px] text-zinc-500">
                    Sigilo garantido · Retorno via WhatsApp
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCidadaoModalOpen(false)}
                      className="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Enviar Demanda
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
