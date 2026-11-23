import React, { useRef, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutTemplate,
  Megaphone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  AdvertisingStatus,
  AdvertisingType,
  ArtworkStatus,
  CimbajuCity,
  SiteAdBanner,
  SiteAdPosition,
  SiteAdTarget,
} from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';
import { MediaFrame } from '../MediaFrame';
import { SiteAdSlot } from '../public/SiteAdSlot';

const AD_TYPES: AdvertisingType[] = [
  'Apoio',
  'Patrocínio',
  'Cota',
  'Revista',
  'Outdoor',
  'Podcast',
  'Eventos',
  'Outros',
];

const AD_STATUSES: AdvertisingStatus[] = [
  'Em Veiculação',
  'Programada',
  'Em Produção',
  'Encerrada',
];

const ARTWORK_STATUSES: ArtworkStatus[] = [
  'Arte Aprovada',
  'Aguardando Material',
  'Em Criação',
  'Checking Entregue',
];

const POSITION_LABELS: Record<SiteAdPosition, string> = {
  topo: 'Topo do Site (Superbanner)',
  entre_materias: 'Intervalo entre Matérias',
  lateral: 'Lateral / Sidebar',
};

const TARGET_LABELS: Record<SiteAdTarget, string> = {
  ambos: 'FortNews + FortMídia',
  fortnews: 'Somente FortNews',
  fortmidia: 'Somente FortMídia',
};

const INTERVAL_OPTIONS = [1, 2, 3, 4];

export const AdvertisingModule: React.FC = () => {
  const {
    advertisingCampaigns,
    addAdvertisingCampaign,
    updateAdvertisingStatus,
    updateArtworkStatus,
    deleteAdvertisingCampaign,
    siteAdBanners,
    siteAdsConfig,
    addSiteAdBanner,
    updateSiteAdBanner,
    deleteSiteAdBanner,
    updateSiteAdsConfig,
  } = useFortMidia();

  const [activeSubTab, setActiveSubTab] = useState<'site_ads' | 'campaigns'>('site_ads');

  /* ==================== ESTADO: PUBLICIDADE NO SITE ==================== */
  const [posFilter, setPosFilter] = useState<'Todas' | SiteAdPosition>('Todas');
  const [siteAdSearch, setSiteAdSearch] = useState('');
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [savedNotice, setSavedNotice] = useState('');

  const [bannerPosition, setBannerPosition] = useState<SiteAdPosition>('topo');
  const [bannerTarget, setBannerTarget] = useState<SiteAdTarget>('ambos');
  const [bannerAdvertiser, setBannerAdvertiser] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerCtaLabel, setBannerCtaLabel] = useState('Saiba Mais');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerBgColor, setBannerBgColor] = useState('#111114');
  const [bannerAccentColor, setBannerAccentColor] = useState('#fa6607');
  const [bannerPriority, setBannerPriority] = useState('1');
  const [bannerStartDate, setBannerStartDate] = useState('2026-11-01');
  const [bannerEndDate, setBannerEndDate] = useState('2027-03-31');
  const [bannerActive, setBannerActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(''), 3000);
  };

  const resetBannerForm = () => {
    setEditingBannerId(null);
    setBannerPosition('topo');
    setBannerTarget('ambos');
    setBannerAdvertiser('');
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerCtaLabel('Saiba Mais');
    setBannerLinkUrl('');
    setBannerImageUrl('');
    setBannerBgColor('#111114');
    setBannerAccentColor('#fa6607');
    setBannerPriority(String(siteAdBanners.length + 1));
    setBannerStartDate('2026-11-01');
    setBannerEndDate('2027-03-31');
    setBannerActive(true);
  };

  const handleOpenNewBanner = (presetPosition?: SiteAdPosition) => {
    resetBannerForm();
    if (presetPosition) setBannerPosition(presetPosition);
    setShowBannerEditor(true);
  };

  const handleEditBanner = (banner: SiteAdBanner) => {
    setEditingBannerId(banner.id);
    setBannerPosition(banner.position);
    setBannerTarget(banner.siteTarget);
    setBannerAdvertiser(banner.advertiser);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle || '');
    setBannerCtaLabel(banner.ctaLabel);
    setBannerLinkUrl(banner.linkUrl || '');
    setBannerImageUrl(banner.imageUrl || '');
    setBannerBgColor(banner.bgColor || '#111114');
    setBannerAccentColor(banner.accentColor || '#fa6607');
    setBannerPriority(String(banner.priority));
    setBannerStartDate(banner.startDate || '');
    setBannerEndDate(banner.endDate || '');
    setBannerActive(banner.active);
    setShowBannerEditor(true);
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerAdvertiser.trim() || !bannerTitle.trim()) return;

    const payload = {
      position: bannerPosition,
      siteTarget: bannerTarget,
      advertiser: bannerAdvertiser.trim(),
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
      ctaLabel: bannerCtaLabel.trim() || 'Saiba Mais',
      linkUrl: bannerLinkUrl.trim(),
      imageUrl: bannerImageUrl.trim() || undefined,
      bgColor: bannerBgColor || '#111114',
      accentColor: bannerAccentColor || '#fa6607',
      priority: Math.max(1, Number(bannerPriority) || 1),
      startDate: bannerStartDate,
      endDate: bannerEndDate,
      active: bannerActive,
    };

    if (editingBannerId) {
      updateSiteAdBanner(editingBannerId, payload);
      triggerSavedNotice('Banner atualizado e publicado imediatamente no site.');
    } else {
      addSiteAdBanner(payload);
      triggerSavedNotice('Novo banner de publicidade adicionado ao site.');
    }

    setShowBannerEditor(false);
    resetBannerForm();
  };

  const previewBannerObject: SiteAdBanner = {
    id: editingBannerId || 'preview-banner',
    position: bannerPosition,
    siteTarget: bannerTarget,
    advertiser: bannerAdvertiser.trim() || 'Nome do Anunciante',
    title: bannerTitle.trim() || 'Título principal da oferta ou patrocínio no portal',
    subtitle:
      bannerSubtitle.trim() ||
      'Descrição curta exibida abaixo da chamada principal do banner.',
    ctaLabel: bannerCtaLabel.trim() || 'Saiba Mais',
    linkUrl: bannerLinkUrl.trim(),
    imageUrl: bannerImageUrl.trim() || undefined,
    bgColor: bannerBgColor || '#111114',
    accentColor: bannerAccentColor || '#fa6607',
    active: bannerActive,
    priority: Number(bannerPriority) || 1,
    startDate: bannerStartDate,
    endDate: bannerEndDate,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  const filteredSiteBanners = siteAdBanners
    .filter((b) => {
      const mPos = posFilter === 'Todas' || b.position === posFilter;
      const q = siteAdSearch.trim().toLowerCase();
      const mQ =
        !q ||
        b.advertiser.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.subtitle || '').toLowerCase().includes(q);
      return mPos && mQ;
    })
    .sort((a, b) => a.priority - b.priority);

  const activeSiteBannersCount = siteAdBanners.filter((b) => b.active).length;
  const activeTopCount = siteAdBanners.filter((b) => b.active && b.position === 'topo').length;
  const activeInFeedCount = siteAdBanners.filter(
    (b) => b.active && b.position === 'entre_materias'
  ).length;
  const activeLateralCount = siteAdBanners.filter(
    (b) => b.active && b.position === 'lateral'
  ).length;

  /* ==================== ESTADO: MAPA DE CAMPANHAS ==================== */
  const [typeFilter, setTypeFilter] = useState<'Todos' | AdvertisingType>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | AdvertisingStatus>('Todos');
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const [advertiser, setAdvertiser] = useState('');
  const [adType, setAdType] = useState<AdvertisingType>('Patrocínio');
  const [title, setTitle] = useState('');
  const [placementSpec, setPlacementSpec] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Regional CIMBAJU');
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2027-01-20');
  const [value, setValue] = useState('3500');
  const [accountManager, setAccountManager] = useState('Emerson Carneiro dos Santos');

  const filtered = advertisingCampaigns.filter((c) => {
    const mType = typeFilter === 'Todos' || c.adType === typeFilter;
    const mStatus = statusFilter === 'Todos' || c.status === statusFilter;
    const q = search.trim().toLowerCase();
    const mQuery =
      !q ||
      c.advertiser.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.placementSpec.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q);
    return mType && mStatus && mQuery;
  });

  const activeCampaigns = advertisingCampaigns.filter((c) => c.status === 'Em Veiculação');
  const totalActiveValue = activeCampaigns.reduce((sum, c) => sum + c.value, 0);
  const pendingMaterialCount = advertisingCampaigns.filter(
    (c) => c.artworkStatus === 'Aguardando Material' || c.artworkStatus === 'Em Criação'
  ).length;

  const countByType = AD_TYPES.map((t) => ({
    type: t,
    count: advertisingCampaigns.filter((c) => c.adType === t).length,
    totalVal: advertisingCampaigns
      .filter((c) => c.adType === t && c.status !== 'Encerrada')
      .reduce((s, c) => s + c.value, 0),
  }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advertiser.trim() || !title.trim()) return;

    addAdvertisingCampaign({
      advertiser: advertiser.trim(),
      adType,
      title: title.trim(),
      placementSpec: placementSpec.trim() || 'Veiculação padrão conforme mídia kit',
      city,
      startDate,
      endDate,
      value: Number(value) || 0,
      status: 'Em Produção',
      artworkStatus: 'Aguardando Material',
      accountManager: accountManager.trim() || 'Emerson Carneiro dos Santos',
    });

    setAdvertiser('');
    setTitle('');
    setPlacementSpec('');
    setShowNewForm(false);
  };

  const handleExportMediaMapCSV = () => {
    const header = [
      'Tipo',
      'Anunciante',
      'Campanha',
      'Especificacao_Ponto',
      'Abrangencia',
      'Inicio',
      'Fim',
      'Valor_BRL',
      'Status_Veiculacao',
      'Status_Arte_Checking',
      'Responsavel',
    ];
    const rows = advertisingCampaigns.map((c) =>
      [
        `"${c.adType}"`,
        `"${c.advertiser}"`,
        `"${c.title}"`,
        `"${c.placementSpec}"`,
        `"${c.city}"`,
        `"${c.startDate}"`,
        `"${c.endDate}"`,
        c.value.toFixed(2),
        `"${c.status}"`,
        `"${c.artworkStatus}"`,
        `"${c.accountManager}"`,
      ].join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'fortmidia_mapa_publicidade.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header + Segmented View Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Publicidade no Site & Mapa de Mídia
          </h2>
          <p className="text-xs text-zinc-400">
            Edite banners do topo, intervalos entre matérias e lateral do FortNews / FortMídia em tempo real ou acompanhe o mapa comercial.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-white/10 bg-[#111114] p-1 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('site_ads')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'site_ads'
                ? 'bg-[#fa6607] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
            Publicidade no Site ({activeSiteBannersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('campaigns')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'campaigns'
                ? 'bg-[#fa6607] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            Campanhas & Mapa ({advertisingCampaigns.length})
          </button>
        </div>
      </div>

      {/* ==================== ABA 1: PUBLICIDADE NO SITE (TOPO, INTERVALO ENTRE MATÉRIAS, LATERAL) ==================== */}
      {activeSubTab === 'site_ads' && (
        <div className="space-y-6">
          {savedNotice && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300">
              {savedNotice}
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Banners Ativos no Site</div>
              <div className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {activeSiteBannersCount}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                De {siteAdBanners.length} banner(s) cadastrado(s)
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Posição Topo (Superbanner)</div>
              <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                {activeTopCount}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {siteAdsConfig.topBannerEnabled ? 'Exibição ativada' : 'Exibição pausada'}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Intervalo entre Matérias</div>
              <div className="mt-2 font-mono text-2xl font-bold text-[#fa6607] tabular-nums">
                {activeInFeedCount}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Aparece a cada {siteAdsConfig.inFeedInterval}{' '}
                {siteAdsConfig.inFeedInterval === 1 ? 'matéria' : 'matérias'}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Posição Lateral / Sidebar</div>
              <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                {activeLateralCount}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {siteAdsConfig.sidebarEnabled ? 'Exibição ativada' : 'Exibição pausada'}
              </div>
            </div>
          </div>

          {/* Configurações Globais de Exibição & Frequência do Intervalo */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Configurações de Exibição no Site
                </h3>
                <p className="text-xs text-zinc-400">
                  Controle quais espaços aparecem no FortNews e no FortMídia e defina o intervalo de inserção entre matérias.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenNewBanner()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Novo Banner no Site
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 pt-3 border-t border-white/10">
              {/* Toggles de Espaços */}
              <div className="lg:col-span-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#16161A] px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-white">Publicidade Ativa (Geral)</div>
                    <div className="text-[11px] text-zinc-500">Liga/desliga todos os banners</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={siteAdsConfig.enabled}
                    onChange={(e) => {
                      updateSiteAdsConfig({ enabled: e.target.checked });
                      triggerSavedNotice('Configuração geral de publicidade atualizada.');
                    }}
                    className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#16161A] px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-white">Banner de Topo</div>
                    <div className="text-[11px] text-zinc-500">Superbanner acima das manchetes</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={siteAdsConfig.topBannerEnabled}
                    onChange={(e) => {
                      updateSiteAdsConfig({ topBannerEnabled: e.target.checked });
                      triggerSavedNotice('Exibição do banner de topo atualizada.');
                    }}
                    className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#16161A] px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-white">Intervalo entre Matérias</div>
                    <div className="text-[11px] text-zinc-500">Banners intercalados no feed</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={siteAdsConfig.inFeedEnabled}
                    onChange={(e) => {
                      updateSiteAdsConfig({ inFeedEnabled: e.target.checked });
                      triggerSavedNotice('Exibição no intervalo entre matérias atualizada.');
                    }}
                    className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#16161A] px-3.5 py-2.5 cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-white">Lateral & Selo "Publicidade"</div>
                    <div className="text-[11px] text-zinc-500">Sidebar e legenda patrocinada</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label="Ativar banner lateral"
                      title="Banner lateral"
                      checked={siteAdsConfig.sidebarEnabled}
                      onChange={(e) => {
                        updateSiteAdsConfig({ sidebarEnabled: e.target.checked });
                        triggerSavedNotice('Exibição do banner lateral atualizada.');
                      }}
                      className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                    />
                    <input
                      type="checkbox"
                      aria-label="Exibir selo Publicidade"
                      title="Exibir selo Publicidade"
                      checked={siteAdsConfig.showSponsoredLabel}
                      onChange={(e) => {
                        updateSiteAdsConfig({ showSponsoredLabel: e.target.checked });
                        triggerSavedNotice('Selo "Publicidade" atualizado.');
                      }}
                      className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                    />
                  </div>
                </label>
              </div>

              {/* Frequência do Intervalo entre Matérias */}
              <div className="lg:col-span-5 rounded-lg border border-white/10 bg-[#16161A] p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Frequência no Intervalo entre Matérias
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Escolha de quantas em quantas notícias um banner publicitário será exibido automaticamente no feed do portal.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {INTERVAL_OPTIONS.map((num) => {
                    const selected = siteAdsConfig.inFeedInterval === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          updateSiteAdsConfig({ inFeedInterval: num });
                          triggerSavedNotice(
                            `Intervalo atualizado: 1 banner a cada ${num} ${num === 1 ? 'matéria' : 'matérias'}.`
                          );
                        }}
                        className={`rounded-lg border px-2 py-2 text-center font-mono text-xs font-semibold transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#fa6607] bg-[#fa6607] text-white'
                            : 'border-white/10 bg-[#0D0D10] text-zinc-300 hover:border-white/25'
                        }`}
                      >
                        A cada {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Formulário de Criação / Edição de Banner + Pré-visualização ao Vivo */}
          {showBannerEditor && (
            <form
              onSubmit={handleSaveBanner}
              className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-5"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {editingBannerId
                      ? 'Editar Banner de Publicidade do Site'
                      : 'Cadastrar Novo Banner de Publicidade no Site'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    As alterações refletem imediatamente no FortNews e no site FortMídia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBannerEditor(false);
                    resetBannerForm();
                  }}
                  aria-label="Fechar editor de banner"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Posição no Site</label>
                  <select
                    value={bannerPosition}
                    onChange={(e) => setBannerPosition(e.target.value as SiteAdPosition)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  >
                    <option value="topo">Topo do Site (Superbanner)</option>
                    <option value="entre_materias">Intervalo entre Matérias</option>
                    <option value="lateral">Lateral / Sidebar</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Onde Exibir</label>
                  <select
                    value={bannerTarget}
                    onChange={(e) => setBannerTarget(e.target.value as SiteAdTarget)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  >
                    <option value="ambos">FortNews + FortMídia</option>
                    <option value="fortnews">Somente Portal FortNews</option>
                    <option value="fortmidia">Somente Site FortMídia</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Anunciante / Marca *</label>
                  <input
                    type="text"
                    required
                    value={bannerAdvertiser}
                    onChange={(e) => setBannerAdvertiser(e.target.value)}
                    placeholder="Ex: Rede Supermercados Caieiras"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Ordem / Prioridade</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={bannerPriority}
                    onChange={(e) => setBannerPriority(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Título Principal *</label>
                  <input
                    type="text"
                    required
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="Chamada principal exibida no banner"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Subtítulo / Oferta Complementar
                  </label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    placeholder="Texto complementar curto (opcional)"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Texto do Botão (CTA)</label>
                  <input
                    type="text"
                    value={bannerCtaLabel}
                    onChange={(e) => setBannerCtaLabel(e.target.value)}
                    placeholder="Ex: Falar no WhatsApp"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Link de Destino (Site ou WhatsApp)
                  </label>
                  <input
                    type="url"
                    value={bannerLinkUrl}
                    onChange={(e) => setBannerLinkUrl(e.target.value)}
                    placeholder="https://wa.me/5511957792424 ou https://site-do-anunciante.com.br"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-zinc-400">Fundo</label>
                    <input
                      type="color"
                      value={bannerBgColor}
                      onChange={(e) => setBannerBgColor(e.target.value)}
                      className="h-9 w-full rounded-lg border border-white/15 bg-[#0A0A0A] p-1 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-zinc-400">Destaque</label>
                    <input
                      type="color"
                      value={bannerAccentColor}
                      onChange={(e) => setBannerAccentColor(e.target.value)}
                      className="h-9 w-full rounded-lg border border-white/15 bg-[#0A0A0A] p-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Imagem / Arte do Banner (Upload ou URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bannerImageUrl}
                      onChange={(e) => setBannerImageUrl(e.target.value)}
                      placeholder="/assets/aistudio/... ou https://..."
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B1B20] px-3 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                      Upload
                    </button>
                    {bannerImageUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerImageUrl('')}
                        aria-label="Remover imagem"
                        className="inline-flex items-center justify-center rounded-lg border border-white/15 px-2.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Início da Veiculação</label>
                  <input
                    type="date"
                    value={bannerStartDate}
                    onChange={(e) => setBannerStartDate(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Fim da Veiculação</label>
                  <input
                    type="date"
                    value={bannerEndDate}
                    onChange={(e) => setBannerEndDate(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
              </div>

              {/* Pré-visualização ao Vivo */}
              <div className="rounded-xl border border-white/10 bg-[#0D0D10] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Pré-visualização em Tempo Real · {POSITION_LABELS[bannerPosition]}
                  </span>
                  <div className="inline-flex rounded-md border border-white/10 bg-[#141417] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPreviewTheme('light')}
                      className={`rounded px-2.5 py-1 cursor-pointer ${
                        previewTheme === 'light'
                          ? 'bg-white text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tema FortNews (Claro)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTheme('dark')}
                      className={`rounded px-2.5 py-1 cursor-pointer ${
                        previewTheme === 'dark'
                          ? 'bg-[#fa6607] text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tema FortMídia (Escuro)
                    </button>
                  </div>
                </div>
                <div
                  className={`rounded-lg p-4 ${
                    previewTheme === 'light' ? 'bg-[#F4F5F7]' : 'bg-[#0A0A0A]'
                  }`}
                >
                  <div className={bannerPosition === 'lateral' ? 'max-w-xs mx-auto' : 'w-full'}>
                    <SiteAdSlot
                      banner={previewBannerObject}
                      variant={bannerPosition}
                      theme={previewTheme}
                      showSponsoredLabel={siteAdsConfig.showSponsoredLabel}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerActive}
                    onChange={(e) => setBannerActive(e.target.checked)}
                    className="h-4 w-4 accent-[#fa6607] cursor-pointer"
                  />
                  Banner ativo e visível imediatamente no site
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBannerEditor(false);
                      resetBannerForm();
                    }}
                    className="rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                  >
                    {editingBannerId ? 'Salvar Alterações do Banner' : 'Publicar Banner no Site'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filtros + Lista de Banners do Site */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['Todas', 'topo', 'entre_materias', 'lateral'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosFilter(pos)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      posFilter === pos
                        ? 'border-[#fa6607] bg-[#fa6607] text-white'
                        : 'border-white/10 bg-[#111114] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos === 'Todas'
                      ? `Todos (${siteAdBanners.length})`
                      : pos === 'topo'
                        ? 'Topo'
                        : pos === 'entre_materias'
                          ? 'Entre Matérias'
                          : 'Lateral'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={siteAdSearch}
                  onChange={(e) => setSiteAdSearch(e.target.value)}
                  placeholder="Buscar anunciante ou título..."
                  className="w-full rounded-lg border border-white/10 bg-[#121215] pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                />
              </div>
            </div>

            <FloatingHorizontalScroll
              label="Rolagem lateral — Banners Publicitários do Site"
              scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
            >
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Banner & Anunciante</th>
                    <th className="px-4 py-3 font-medium">Posição & Site</th>
                    <th className="px-4 py-3 font-medium">Vigência / Ordem</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredSiteBanners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        Nenhum banner encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSiteBanners.map((banner) => (
                      <tr key={banner.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1A1A1E]">
                              {banner.imageUrl ? (
                                <MediaFrame
                                  src={banner.imageUrl}
                                  alt={banner.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white"
                                  style={{ backgroundColor: banner.accentColor || '#fa6607' }}
                                >
                                  AD
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-[#fa6607]">
                                {banner.advertiser}
                              </div>
                              <div className="font-medium text-white line-clamp-1">
                                {banner.title}
                              </div>
                              {banner.subtitle && (
                                <div className="text-[11px] text-zinc-500 line-clamp-1">
                                  {banner.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-zinc-200">
                            {POSITION_LABELS[banner.position]}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {TARGET_LABELS[banner.siteTarget]}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono tabular-nums">
                          <div className="text-zinc-200">
                            {banner.startDate} → {banner.endDate}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Ordem #{banner.priority}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              updateSiteAdBanner(banner.id, { active: !banner.active })
                            }
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                              banner.active
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                : 'border-white/15 bg-white/5 text-zinc-400'
                            }`}
                          >
                            {banner.active ? (
                              <Eye className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                            )}
                            {banner.active ? 'No Ar' : 'Pausado'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditBanner(banner)}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-[#fa6607] hover:text-[#fa6607] cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSiteAdBanner(banner.id)}
                              aria-label={`Excluir banner ${banner.title}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </FloatingHorizontalScroll>
          </div>
        </div>
      )}

      {/* ==================== ABA 2: CAMPANHAS & MAPA DE MÍDIA ==================== */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-8">
          {/* Header Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Mapa Comercial de Campanhas (OOH, Podcast, Revista, Patrocínios & Cotas)
              </h3>
              <p className="text-xs text-zinc-400">
                Controle de veiculações por formato e status de arte/checking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportMediaMapCSV}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#141417] px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Exportar Mapa CSV
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {showNewForm ? 'Fechar Cadastro' : 'Nova Campanha'}
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Campanhas em Veiculação</div>
              <div className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {activeCampaigns.length}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Total de {advertisingCampaigns.length} inserções cadastradas
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Volume em Veiculação Ativa</div>
              <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                R$ {totalActiveValue.toLocaleString('pt-BR')}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">Soma das campanhas ativas</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Pendências de Arte / Material</div>
              <div className="mt-2 font-mono text-2xl font-bold text-amber-400 tabular-nums">
                {pendingMaterialCount}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Aguardando material ou em criação
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
              <div className="text-xs text-zinc-400">Formatos Operados</div>
              <div className="mt-2 font-mono text-2xl font-bold text-[#fa6607] tabular-nums">
                {AD_TYPES.length}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Apoio, Patrocínio, Cota, Revista, OOH, Eventos...
              </div>
            </div>
          </div>

          {/* Breakdown Buttons by Format */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {countByType.map((item) => {
              const isSelected = typeFilter === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setTypeFilter(isSelected ? 'Todos' : item.type)}
                  className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#fa6607] bg-[#fa6607]/15'
                      : 'border-white/10 bg-[#111114] hover:border-white/25'
                  }`}
                >
                  <div className="text-[11px] font-medium text-zinc-300 truncate">{item.type}</div>
                  <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* New Advertising Campaign Form */}
          {showNewForm && (
            <form
              onSubmit={handleCreate}
              className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
            >
              <div className="text-sm font-semibold text-white">
                Cadastrar Nova Campanha / Inserção Publicitária
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={adType}
                  onChange={(e) => setAdType(e.target.value as AdvertisingType)}
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {AD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      Tipo: {t}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  required
                  value={advertiser}
                  onChange={(e) => setAdvertiser(e.target.value)}
                  placeholder="Anunciante / Marca *"
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                />

                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da Campanha *"
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                />

                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as CimbajuCity)}
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {NEWS_TERRITORIES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <input
                  type="text"
                  value={placementSpec}
                  onChange={(e) => setPlacementSpec(e.target.value)}
                  placeholder="Ponto / Página / Posição (ex: Outdoor Km 32)"
                  className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Valor (R$)"
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  placeholder="Executivo / Responsável"
                  className="w-full max-w-xs rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                  >
                    Salvar Publicidade
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar anunciante, campanha ou ponto..."
                className="w-full rounded-lg border border-white/10 bg-[#121215] pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por tipo de publicidade"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'Todos' | AdvertisingType)}
                className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
              >
                <option value="Todos">Todos os Tipos</option>
                {AD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por status de veiculação"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'Todos' | AdvertisingStatus)}
                className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
              >
                <option value="Todos">Todos os Status</option>
                {AD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campaigns Table */}
          <FloatingHorizontalScroll
            label="Rolagem lateral — Campanhas Publicitárias"
            scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
          >
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Tipo & Anunciante</th>
                  <th className="px-4 py-3 font-medium">Campanha & Posição</th>
                  <th className="px-4 py-3 font-medium">Praça / Período</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Arte / Checking</th>
                  <th className="px-4 py-3 font-medium">Veiculação</th>
                  <th className="px-4 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                      Nenhuma campanha publicitária localizada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="text-[11px] font-mono font-semibold text-[#fa6607]">
                          {item.adType}
                        </div>
                        <div className="font-medium text-white">{item.advertiser}</div>
                        <div className="text-[11px] text-zinc-500">
                          Resp.: {item.accountManager}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-medium text-zinc-100">{item.title}</div>
                        <div className="text-[11px] text-zinc-400">{item.placementSpec}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-zinc-200">{item.city}</div>
                        <div className="font-mono text-[11px] text-zinc-500 tabular-nums">
                          {item.startDate} → {item.endDate}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-white tabular-nums whitespace-nowrap">
                        R$ {item.value.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          aria-label={`Status de arte de ${item.title}`}
                          value={item.artworkStatus}
                          onChange={(e) =>
                            updateArtworkStatus(item.id, e.target.value as ArtworkStatus)
                          }
                          className="rounded-md border border-white/15 bg-[#0A0A0A] px-2 py-1 text-[11px] text-zinc-200 focus:border-[#fa6607] focus:outline-none cursor-pointer"
                        >
                          {ARTWORK_STATUSES.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          aria-label={`Status de veiculação de ${item.title}`}
                          value={item.status}
                          onChange={(e) =>
                            updateAdvertisingStatus(item.id, e.target.value as AdvertisingStatus)
                          }
                          className={`rounded-md border bg-[#0A0A0A] px-2 py-1 text-[11px] font-medium focus:outline-none cursor-pointer ${
                            item.status === 'Em Veiculação'
                              ? 'border-emerald-500/40 text-emerald-400'
                              : item.status === 'Programada'
                                ? 'border-[#D4AF37]/40 text-[#D4AF37]'
                                : item.status === 'Em Produção'
                                  ? 'border-[#fa6607]/40 text-[#fa6607]'
                                  : 'border-white/15 text-zinc-400'
                          }`}
                        >
                          {AD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => deleteAdvertisingCampaign(item.id)}
                          aria-label={`Excluir campanha ${item.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </FloatingHorizontalScroll>
        </div>
      )}
    </div>
  );
};
