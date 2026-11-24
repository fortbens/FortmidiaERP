import React, { useState } from 'react';
import {
  Bot,
  Check,
  Download,
  Eye,
  EyeOff,
  Film,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Newspaper,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { INITIAL_NEWS_PORTAL_SETTINGS, NEWS_SEALS, OFFICIAL_BRAND_LOGOS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { aiApi } from '../../services/api';
import { GalleryCategory, NewsSeal, QuotaCategory, SiteCmsPreset } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';
import { FortMidiaLogo } from '../FortMidiaLogo';
import { CmsFaviconVideosTab } from './CmsFaviconVideosTab';

type CmsSubTab =
  | 'identidade'
  | 'portal_noticias'
  | 'favicon_videos'
  | 'servicos'
  | 'galeria'
  | 'popup'
  | 'deploy_sites';

interface CmsModuleProps {
  onPreviewPortal: () => void;
  onOpenFortNewsPortal?: () => void;
}

export const CmsModule: React.FC<CmsModuleProps> = ({
  onPreviewPortal,
  onOpenFortNewsPortal,
}) => {
  const {
    siteSettings,
    updateSiteSettings,
    newsPortalSettings,
    updateNewsPortalSettings,
    quotas,
    addQuota,
    updateQuota,
    deleteQuota,
    galleryItems,
    addGalleryItem,
    deleteGalleryItem,
    popupConfig,
    updatePopupConfig,
    setPopupPreviewOpen,
    siteCmsPresets,
    siteCmsPresetsLocked,
    saveSiteCmsPreset,
    deleteSiteCmsPreset,
    setSiteCmsPresetsLocked,
    teamMembers,
    activeAdminUserId,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;
  const brandLockedForOperator = siteCmsPresetsLocked && !isSuperAdmin;

  const [subTab, setSubTab] = useState<CmsSubTab>('identidade');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [selectedCmsPresetId, setSelectedCmsPresetId] = useState<string>(
    siteCmsPresets[0]?.id || ''
  );
  const [newCmsPresetName, setNewCmsPresetName] = useState('');
  const [showNewCmsPresetForm, setShowNewCmsPresetForm] = useState(false);
  const [tickerRegion, setTickerRegion] = useState('CIMBAJU (Franco da Rocha, Caieiras, Morato, Cajamar, Mairiporã)');
  const [generatingTicker, setGeneratingTicker] = useState(false);
  const [tickerError, setTickerError] = useState('');

  // New Service/Quota form
  const [qTitle, setQTitle] = useState('');
  const [qCategory, setQCategory] = useState<QuotaCategory>('agencia');
  const [qPrice, setQPrice] = useState('R$ 2.500');
  const [qCycle, setQCycle] = useState('/ mês');
  const [qSummary, setQSummary] = useState('');
  const [qDeliverables, setQDeliverables] = useState('Produção audiovisual\nRelatório mensal');
  const [qImage, setQImage] = useState('/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png');

  // New Gallery Item form
  const [gTitle, setGTitle] = useState('');
  const [gCategory, setGCategory] = useState<GalleryCategory>('Estúdio & Podcast');
  const [gServiceTag, setGServiceTag] = useState('');
  const [gDescription, setGDescription] = useState('');
  const [gImageUrl, setGImageUrl] = useState('/assets/aistudio/Microfone_dc305011.jpg');

  const handleGenerateAiTicker = async () => {
    setGeneratingTicker(true);
    setTickerError('');
    try {
      const res = await aiApi.generateTicker<{ items?: string[]; generatedAt?: string }>({
        region: tickerRegion,
      });
      if (!res.ok || !res.data) {
        setTickerError(res.error || 'Erro ao gerar legenda circulante por IA.');
        return;
      }
      if (Array.isArray(res.data.items) && res.data.items.length > 0) {
        updateNewsPortalSettings({
          marqueeAiItems: res.data.items,
          marqueeTickerEnabled: true,
          marqueeUpdatedAt:
            res.data.generatedAt ||
            new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
        flashNotice(
          `${res.data.items.length} manchetes geradas por IA aplicadas na Legenda Circulante.`
        );
      }
    } catch {
      setTickerError('Falha de conexão com a IA ao buscar notícias para a legenda circulante.');
    } finally {
      setGeneratingTicker(false);
    }
  };

  const flashNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  const applyCmsPreset = (preset: SiteCmsPreset) => {
    setSelectedCmsPresetId(preset.id);
    updateSiteSettings({
      logoUrl: preset.siteLogoUrl,
      logoMode: preset.siteLogoMode,
      logoHeightPx: preset.siteLogoHeightPx,
      primaryColor: preset.sitePrimaryColor,
      goldColor: preset.siteGoldColor,
      backgroundColor: preset.siteBackgroundColor,
    });
    updateNewsPortalSettings({
      logoUrl: preset.newsLogoUrl,
      logoHeightPx: preset.newsLogoHeightPx,
      logoFitMode: preset.newsLogoFitMode,
      primaryColor: preset.newsPrimaryColor,
      secondaryColor: preset.newsSecondaryColor,
    });
    flashNotice(`Preset "${preset.name}" aplicado aos portais.`);
  };

  const handleSaveCurrentCmsPreset = (asNew = false) => {
    if (!isSuperAdmin) return;
    const existing = siteCmsPresets.find((p) => p.id === selectedCmsPresetId);
    const presetName = asNew
      ? newCmsPresetName.trim() || `Preset Portais ${siteCmsPresets.length + 1}`
      : existing?.name || 'Padrão Oficial FortMídia & FortNews';
    const id = asNew || !existing ? `cms-preset-${Date.now()}` : existing.id;

    const payload: SiteCmsPreset = {
      id,
      name: presetName,
      siteLogoUrl: siteSettings.logoUrl,
      siteLogoMode: siteSettings.logoMode,
      siteLogoHeightPx: siteSettings.logoHeightPx || 48,
      sitePrimaryColor: siteSettings.primaryColor,
      siteGoldColor: siteSettings.goldColor,
      siteBackgroundColor: siteSettings.backgroundColor,
      newsLogoUrl: newsPortalSettings.logoUrl,
      newsLogoHeightPx: newsPortalSettings.logoHeightPx || 46,
      newsLogoFitMode: newsPortalSettings.logoFitMode || 'square',
      newsPrimaryColor: newsPortalSettings.primaryColor,
      newsSecondaryColor: newsPortalSettings.secondaryColor,
      lockedBySuperAdmin: siteCmsPresetsLocked,
      updatedBy: activeOperator?.name || 'Super Admin',
      updatedAt: `${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };

    if (saveSiteCmsPreset(payload)) {
      setSelectedCmsPresetId(payload.id);
      setNewCmsPresetName('');
      setShowNewCmsPresetForm(false);
      flashNotice(`Preset "${payload.name}" salvo pelo Super Admin.`);
    }
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
        flashNotice('Imagem carregada e aplicada em tempo real.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qSummary.trim()) return;

    const categoryLabelMap: Record<QuotaCategory, string> = {
      podcast: 'Podcast · Grade 16h–20h',
      ooh: 'Mídia Exterior · Outdoors 9x3m',
      editorial: 'Editorial · Impresso & Digital',
      agencia: 'Agência 360° · Serviços',
    };

    addQuota({
      category: qCategory,
      categoryLabel: categoryLabelMap[qCategory],
      title: qTitle.trim(),
      audience: 'Empresas e Lideranças do CIMBAJU',
      priceLabel: qPrice.trim() || 'Sob consulta',
      billingCycle: qCycle.trim(),
      summary: qSummary.trim(),
      deliverables: qDeliverables
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      specs: [
        { label: 'Região', value: 'CIMBAJU' },
        { label: 'Atendimento', value: 'Dedicado' },
        { label: 'Publicação', value: 'Imediata' },
      ],
      image: qImage,
    });

    setQTitle('');
    setQSummary('');
    flashNotice('Novo serviço/cota adicionado à vitrine do site.');
  };

  const handleAddGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gTitle.trim()) return;

    addGalleryItem({
      title: gTitle.trim(),
      category: gCategory,
      serviceTag: gServiceTag.trim() || gCategory,
      description: gDescription.trim() || 'Serviço oficial Grupo FortMídia no CIMBAJU.',
      imageUrl: gImageUrl,
    });

    setGTitle('');
    setGServiceTag('');
    setGDescription('');
    flashNotice('Foto/serviço publicado na Galeria do site.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            CMS Completo — Gerenciador do Site Público
          </h2>
          <p className="text-xs text-zinc-400">
            Altere logotipo, paleta de cores, textos, serviços/cotas, galeria de fotos, balão de WhatsApp, link do jornal e pop-up promocional em tempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={onPreviewPortal}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#141417] px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Eye className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
          Visualizar Alterações no Site
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#121215] p-1.5">
        <button
          type="button"
          onClick={() => setSubTab('identidade')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'identidade'
              ? 'bg-[#FF6600] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          Site FortMídia
        </button>
        <button
          type="button"
          onClick={() => setSubTab('portal_noticias')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'portal_noticias'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
          Portal Jornal FortNews
        </button>
        <button
          type="button"
          onClick={() => setSubTab('favicon_videos')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'favicon_videos'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="h-3.5 w-3.5" aria-hidden="true" />
          Favicon &amp; Vídeos (Sites)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('servicos')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'servicos'
              ? 'bg-[#FF6600] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Serviços & Cotas ({quotas.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('galeria')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'galeria'
              ? 'bg-[#FF6600] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Galeria ({galleryItems.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('popup')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'popup'
              ? 'bg-[#FF6600] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Pop-up ({popupConfig.enabled ? 'Ativo' : 'Inativo'})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('deploy_sites')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium cursor-pointer ${
            subTab === 'deploy_sites'
              ? 'bg-[#FF6600] text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
          Publicar Sites Separados
        </button>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Super Admin Preset & Lock Toolbar for Portals */}
      {(subTab === 'identidade' || subTab === 'portal_noticias') && (
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                {siteCmsPresetsLocked ? (
                  <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                )}
                Presets Salvos de Identidade &amp; Tamanhos de Logos
              </div>
              <p className="text-[11px] text-zinc-400">
                {brandLockedForOperator
                  ? 'Presets travados pelo Super Admin. Você pode aplicar os presets oficiais, mas não alterá-los.'
                  : 'Salve a configuração de logomarcas, tamanhos e cores como Preset e trave para impedir alterações por outros perfis.'}
              </p>
            </div>

            {isSuperAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCurrentCmsPreset(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar Preset
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCmsPresetForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !siteCmsPresetsLocked;
                    setSiteCmsPresetsLocked(next);
                    flashNotice(
                      next
                        ? 'Presets dos sites travados pelo Super Admin.'
                        : 'Edição de presets desbloqueada pelo Super Admin.'
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    siteCmsPresetsLocked
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/15 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {siteCmsPresetsLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  {siteCmsPresetsLocked ? 'Travado (Só Super Admin)' : 'Travar Presets'}
                </button>
              </div>
            )}
          </div>

          {isSuperAdmin && showNewCmsPresetForm && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <input
                type="text"
                value={newCmsPresetName}
                onChange={(e) => setNewCmsPresetName(e.target.value)}
                placeholder="Nome do novo preset (ex: Campanha Verão CIMBAJU)"
                className="flex-1 min-w-[220px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => handleSaveCurrentCmsPreset(true)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Confirmar &amp; Salvar
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {siteCmsPresets.map((preset) => (
              <div
                key={preset.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                  selectedCmsPresetId === preset.id
                    ? 'border-[#FF6600] bg-[#FF6600]/15 text-white'
                    : 'border-white/10 bg-[#0A0A0A] text-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => applyCmsPreset(preset)}
                  className="inline-flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  {preset.lockedBySuperAdmin && <Lock className="h-3 w-3 text-[#D4AF37]" />}
                  <span>{preset.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ({preset.siteLogoHeightPx}px / {preset.newsLogoHeightPx}px)
                  </span>
                </button>
                {isSuperAdmin && siteCmsPresets.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Excluir preset ${preset.name}`}
                    onClick={() => {
                      deleteSiteCmsPreset(preset.id);
                      flashNotice(`Preset "${preset.name}" removido.`);
                    }}
                    className="ml-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'favicon_videos' && (
        <CmsFaviconVideosTab
          onNotice={flashNotice}
          onPreviewFortMidia={onPreviewPortal}
          onPreviewFortNews={onOpenFortNewsPortal}
        />
      )}

      {/* TAB 1: IDENTIDADE, LOGO, CORES, CONTATO & WHATSAPP */}
      {subTab === 'identidade' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Logo & Brand Colors */}
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-5">
            <h3 className="font-display text-base font-bold text-white border-b border-white/10 pb-3">
              Identidade Visual, Logotipo & Paleta
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Prefixo da Marca
                </label>
                <input
                  type="text"
                  value={siteSettings.brandName}
                  onChange={(e) => updateSiteSettings({ brandName: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Destaque da Marca
                </label>
                <input
                  type="text"
                  value={siteSettings.brandHighlight}
                  onChange={(e) => updateSiteSettings({ brandHighlight: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Exibição do Logo no Topo
              </label>
              <div className="inline-flex rounded-lg border border-white/10 bg-[#0A0A0A] p-1">
                <button
                  type="button"
                  disabled={brandLockedForOperator}
                  onClick={() => updateSiteSettings({ logoMode: 'wordmark' })}
                  className={`rounded-md px-3 py-1.5 text-xs cursor-pointer disabled:opacity-50 ${
                    siteSettings.logoMode === 'wordmark'
                      ? 'bg-[#FF6600] text-white'
                      : 'text-zinc-400'
                  }`}
                >
                  Tipografia Corporativa
                </button>
                <button
                  type="button"
                  disabled={brandLockedForOperator}
                  onClick={() => updateSiteSettings({ logoMode: 'image' })}
                  className={`rounded-md px-3 py-1.5 text-xs cursor-pointer disabled:opacity-50 ${
                    siteSettings.logoMode === 'image'
                      ? 'bg-[#FF6600] text-white'
                      : 'text-zinc-400'
                  }`}
                >
                  Imagem / Logotipo Oficial
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-2">
                Selecionar Logotipo Oficial ou Enviar Novo
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {OFFICIAL_BRAND_LOGOS.map((logo) => (
                  <button
                    key={logo.url}
                    type="button"
                    disabled={brandLockedForOperator}
                    onClick={() => {
                      updateSiteSettings({ logoUrl: logo.url, logoMode: 'image' });
                      flashNotice(`Logo alterado para: ${logo.label}`);
                    }}
                    className={`rounded-lg border p-2 text-left transition-colors cursor-pointer disabled:opacity-50 ${
                      siteSettings.logoUrl === logo.url
                        ? 'border-[#FF6600] bg-[#FF6600]/10'
                        : 'border-white/10 bg-[#0A0A0A] hover:border-white/25'
                    }`}
                  >
                    <MediaFrame
                      src={logo.url}
                      alt={logo.label}
                      className="h-12 w-full object-contain rounded"
                    />
                    <div className="mt-1 text-[10px] text-zinc-300 truncate">{logo.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 ${
                    brandLockedForOperator ? 'opacity-50 pointer-events-none' : 'hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                  Fazer Upload de Novo Logo
                  <input
                    type="file"
                    accept="image/*"
                    disabled={brandLockedForOperator}
                    className="hidden"
                    onChange={(e) =>
                      handleImageFileUpload(e, (url) =>
                        updateSiteSettings({ logoUrl: url, logoMode: 'image' })
                      )
                    }
                  />
                </label>
                <input
                  type="text"
                  disabled={brandLockedForOperator}
                  value={siteSettings.logoUrl}
                  onChange={(e) => updateSiteSettings({ logoUrl: e.target.value })}
                  placeholder="Ou cole a URL da imagem do logo..."
                  className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* FortMídia Logo Size Slider + Live Header Preview */}
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-200">
                  Tamanho da Logomarca no Site FortMídia (Topo &amp; Rodapé)
                </span>
                <span className="font-mono text-xs font-bold text-[#FF6600] tabular-nums">
                  {siteSettings.logoHeightPx || 48}px altura
                </span>
              </div>
              <input
                type="range"
                aria-label="Tamanho da logomarca do Site FortMídia em pixels"
                min={28}
                max={140}
                step={2}
                disabled={brandLockedForOperator}
                value={siteSettings.logoHeightPx || 48}
                onChange={(e) =>
                  updateSiteSettings({ logoHeightPx: Number(e.target.value), logoMode: 'image' })
                }
                className="w-full accent-[#FF6600] cursor-pointer disabled:opacity-50"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Compacto (40px)', val: 40 },
                  { label: 'Padrão (56px)', val: 56 },
                  { label: 'Destaque (84px)', val: 84 },
                  { label: 'Grande (112px)', val: 112 },
                  { label: 'Máximo (136px)', val: 136 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    disabled={brandLockedForOperator}
                    onClick={() =>
                      updateSiteSettings({ logoHeightPx: opt.val, logoMode: 'image' })
                    }
                    className={`rounded-md border px-2 py-1 text-[10px] font-medium cursor-pointer disabled:opacity-50 ${
                      (siteSettings.logoHeightPx || 48) === opt.val
                        ? 'border-[#FF6600] bg-[#FF6600]/15 text-[#FF6600]'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#121215] px-4 py-2.5">
                {siteSettings.logoMode === 'image' && siteSettings.logoUrl ? (
                  <FortMidiaLogo
                    src={siteSettings.logoUrl}
                    alt="Prévia Logo FortMídia"
                    heightPx={Math.min(140, Math.max(28, siteSettings.logoHeightPx || 52))}
                    mobileMaxHeightPx={44}
                  />
                ) : (
                  <span className="font-display text-sm font-bold text-white">
                    {siteSettings.brandName}{' '}
                    <span style={{ color: siteSettings.primaryColor }}>
                      {siteSettings.brandHighlight}
                    </span>
                  </span>
                )}
                <span className="text-[10px] text-zinc-400">Prévia no cabeçalho</span>
              </div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Cor Primária (CTAs)
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] p-1.5">
                  <input
                    type="color"
                    disabled={brandLockedForOperator}
                    value={siteSettings.primaryColor}
                    onChange={(e) => updateSiteSettings({ primaryColor: e.target.value })}
                    className="h-7 w-9 rounded border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-mono text-[11px] text-zinc-200">
                    {siteSettings.primaryColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Dourado / Detalhes
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] p-1.5">
                  <input
                    type="color"
                    disabled={brandLockedForOperator}
                    value={siteSettings.goldColor}
                    onChange={(e) => updateSiteSettings({ goldColor: e.target.value })}
                    className="h-7 w-9 rounded border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-mono text-[11px] text-zinc-200">
                    {siteSettings.goldColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Fundo Principal
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] p-1.5">
                  <input
                    type="color"
                    disabled={brandLockedForOperator}
                    value={siteSettings.backgroundColor}
                    onChange={(e) => updateSiteSettings({ backgroundColor: e.target.value })}
                    className="h-7 w-9 rounded border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-mono text-[11px] text-zinc-200">
                    {siteSettings.backgroundColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Texts, Links & WhatsApp Bubble Settings */}
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-5">
            <h3 className="font-display text-base font-bold text-white border-b border-white/10 pb-3">
              Textos da Home, Portal de Notícias & Balão WhatsApp
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Slogan / Título Principal (Hero)
              </label>
              <input
                type="text"
                value={siteSettings.heroHeadline}
                onChange={(e) => updateSiteSettings({ heroHeadline: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Texto Institucional da Capa
              </label>
              <textarea
                rows={3}
                value={siteSettings.heroSubheadline}
                onChange={(e) => updateSiteSettings({ heroSubheadline: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Link Portal de Notícias
                </label>
                <input
                  type="url"
                  value={siteSettings.newsPortalUrl}
                  onChange={(e) => updateSiteSettings({ newsPortalUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  value={siteSettings.contactEmail}
                  onChange={(e) => updateSiteSettings({ contactEmail: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Bubble Controls */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Balão Flutuante de WhatsApp no Site
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Botão de atendimento direto no canto inferior direito do portal
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteSettings.whatsappEnabled}
                    onChange={(e) => updateSiteSettings({ whatsappEnabled: e.target.checked })}
                    className="h-4 w-4 accent-[#FF6600]"
                  />
                  <span className="text-zinc-200">
                    {siteSettings.whatsappEnabled ? 'Ativo' : 'Oculto'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Número WhatsApp (DDI+DDD+Número)
                  </label>
                  <input
                    type="text"
                    value={siteSettings.whatsappNumber}
                    onChange={(e) => updateSiteSettings({ whatsappNumber: e.target.value })}
                    placeholder="5511999990000"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#FF6600] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Rótulo do Balão
                  </label>
                  <input
                    type="text"
                    value={siteSettings.whatsappLabel}
                    onChange={(e) => updateSiteSettings({ whatsappLabel: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Mensagem Automática ao Abrir WhatsApp
                </label>
                <input
                  type="text"
                  value={siteSettings.whatsappMessage}
                  onChange={(e) => updateSiteSettings({ whatsappMessage: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            </div>

            {/* Price Visibility Switch (Anti-Concorrência) */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    {siteSettings.showPublicPrices ? (
                      <Eye className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                    )}
                    Exibir Valores na Vitrine Pública (Anti-Concorrência)
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Desative para ocultar os preços no site e mostrar "{siteSettings.consultPriceLabel || 'Consulte'}" aos visitantes.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteSettings.showPublicPrices}
                    onChange={(e) => updateSiteSettings({ showPublicPrices: e.target.checked })}
                    className="h-4 w-4 accent-[#FF6600]"
                  />
                  <span className={siteSettings.showPublicPrices ? 'text-emerald-300' : 'text-[#FF6600]'}>
                    {siteSettings.showPublicPrices ? 'Valores Visíveis' : `Modo "${siteSettings.consultPriceLabel || 'Consulte'}"`}
                  </span>
                </label>
              </div>

              {!siteSettings.showPublicPrices && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Texto Substituto na Vitrine Pública
                  </label>
                  <input
                    type="text"
                    value={siteSettings.consultPriceLabel}
                    onChange={(e) => updateSiteSettings({ consultPriceLabel: e.target.value })}
                    placeholder="Consulte"
                    className="w-full sm:w-64 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVIÇOS & COTAS COMERCIAIS */}
      {subTab === 'servicos' && (
        <div className="space-y-6">
          {/* Quick Price Visibility Banner inside Services Tab */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                {siteSettings.showPublicPrices ? (
                  <Eye className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#FF6600] shrink-0" aria-hidden="true" />
                )}
                Chave de Exibição de Preços na Vitrine Pública
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Quando desligado, a vitrine pública de Cotas & Estúdio substitui os valores por{' '}
                <strong className="text-white">"{siteSettings.consultPriceLabel || 'Consulte'}"</strong> para proteger sua tabela da concorrência.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <input
                type="text"
                aria-label="Rótulo quando preço oculto"
                value={siteSettings.consultPriceLabel}
                onChange={(e) => updateSiteSettings({ consultPriceLabel: e.target.value })}
                placeholder="Consulte"
                className="w-32 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() =>
                  updateSiteSettings({ showPublicPrices: !siteSettings.showPublicPrices })
                }
                className={`rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  siteSettings.showPublicPrices
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-[#FF6600] text-white hover:bg-[#FF5500]'
                }`}
              >
                {siteSettings.showPublicPrices ? 'Preços Públicos: ATIVOS' : `Preços Ocultos (${siteSettings.consultPriceLabel || 'Consulte'})`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddQuota}
            className="lg:col-span-5 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4 self-start"
          >
            <h3 className="font-display text-base font-bold text-white border-b border-white/10 pb-3">
              Adicionar Novo Serviço / Cota ao Site
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Título do Serviço / Cota *
              </label>
              <input
                type="text"
                required
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
                placeholder="Ex: Cota Trio Elétrico CIMBAJU"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Categoria
                </label>
                <select
                  value={qCategory}
                  onChange={(e) => setQCategory(e.target.value as QuotaCategory)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                >
                  <option value="podcast">Podcast</option>
                  <option value="ooh">Mídia OOH</option>
                  <option value="editorial">Editorial</option>
                  <option value="agencia">Agência 360°</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Preço</label>
                <input
                  type="text"
                  value={qPrice}
                  onChange={(e) => setQPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ciclo</label>
                <input
                  type="text"
                  value={qCycle}
                  onChange={(e) => setQCycle(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Resumo *</label>
              <textarea
                rows={2}
                required
                value={qSummary}
                onChange={(e) => setQSummary(e.target.value)}
                placeholder="Descreva o benefício comercial deste plano..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Entregas (1 por linha)
              </label>
              <textarea
                rows={3}
                value={qDeliverables}
                onChange={(e) => setQDeliverables(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                URL da Imagem ou Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qImage}
                  onChange={(e) => setQImage(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e, setQImage)}
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              Publicar Serviço na Vitrine
            </button>
          </form>

          {/* Existing Services List (Editable inline price/title + delete) */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-display text-base font-bold text-white">
              Serviços e Cotas Ativas no Site ({quotas.length})
            </h3>
            {quotas.map((q) => (
              <div
                key={q.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111114] p-4"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <MediaFrame
                    src={q.image}
                    alt={q.title}
                    className="h-16 w-20 rounded-lg object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[11px] text-[#D4AF37]">{q.categoryLabel}</div>
                    <input
                      type="text"
                      aria-label={`Editar título ${q.title}`}
                      value={q.title}
                      onChange={(e) => updateQuota(q.id, { title: e.target.value })}
                      className="w-full rounded border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-xs font-semibold text-white focus:border-[#FF6600] focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label={`Editar valor ${q.title}`}
                        value={q.priceLabel}
                        onChange={(e) => updateQuota(q.id, { priceLabel: e.target.value })}
                        className="w-28 rounded border border-white/10 bg-[#0A0A0A] px-2.5 py-1 font-mono text-xs text-[#FF6600] focus:border-[#FF6600] focus:outline-none"
                      />
                      <span className="text-[11px] text-zinc-400 truncate">{q.billingCycle}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    deleteQuota(q.id);
                    flashNotice(`Serviço "${q.title}" removido da vitrine.`);
                  }}
                  aria-label={`Remover ${q.title}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer self-end sm:self-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* TAB 3: GALERIA DE FOTOS & SERVIÇOS */}
      {subTab === 'galeria' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddGallery}
            className="lg:col-span-4 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4 self-start"
          >
            <h3 className="font-display text-base font-bold text-white border-b border-white/10 pb-3">
              Publicar Foto na Galeria
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Título da Foto / Case *
              </label>
              <input
                type="text"
                required
                value={gTitle}
                onChange={(e) => setGTitle(e.target.value)}
                placeholder="Ex: Instalação Outdoor Caieiras Centro"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Categoria da Galeria
              </label>
              <select
                value={gCategory}
                onChange={(e) => setGCategory(e.target.value as GalleryCategory)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              >
                <option value="Estúdio & Podcast">Estúdio & Podcast</option>
                <option value="Mídia OOH">Mídia OOH</option>
                <option value="Impressos & Eventos">Impressos & Eventos</option>
                <option value="Agência & Corporativo">Agência & Corporativo</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Serviço Associado
              </label>
              <input
                type="text"
                value={gServiceTag}
                onChange={(e) => setGServiceTag(e.target.value)}
                placeholder="Ex: FortMídia OOH · 9x3m"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Descrição</label>
              <textarea
                rows={2}
                value={gDescription}
                onChange={(e) => setGDescription(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Imagem (Upload ou URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gImageUrl}
                  onChange={(e) => setGImageUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e, setGImageUrl)}
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              Adicionar à Galeria
            </button>
          </form>

          <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#111114] flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video w-full overflow-hidden border-b border-white/10">
                    <MediaFrame
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] text-[#D4AF37]">
                      {item.category} · {item.serviceTag}
                    </div>
                    <h4 className="mt-1 font-display text-sm font-bold text-white">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <div className="px-4 pb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      deleteGalleryItem(item.id);
                      flashNotice(`Item "${item.title}" excluído da galeria.`);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir foto
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: POP-UP PROMOCIONAL DO CMS */}
      {subTab === 'popup' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Configurar Pop-up do Portal
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Exibe avisos comerciais, campanhas sazonais ou convites ao vivo aos visitantes.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={popupConfig.enabled}
                  onChange={(e) => updatePopupConfig({ enabled: e.target.checked })}
                  className="h-4 w-4 accent-[#FF6600]"
                />
                <span className="text-white">
                  {popupConfig.enabled ? 'Pop-up Ativado' : 'Pop-up Desativado'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Etiqueta Superior
                </label>
                <input
                  type="text"
                  value={popupConfig.eyebrow}
                  onChange={(e) => updatePopupConfig({ eyebrow: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Atraso de Exibição (segundos)
                </label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={popupConfig.delaySeconds}
                  onChange={(e) =>
                    updatePopupConfig({ delaySeconds: Math.max(10, Number(e.target.value) || 12) })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Título do Pop-up
              </label>
              <input
                type="text"
                value={popupConfig.title}
                onChange={(e) => updatePopupConfig({ title: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Mensagem Principal
              </label>
              <textarea
                rows={3}
                value={popupConfig.message}
                onChange={(e) => updatePopupConfig({ message: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Texto do Botão CTA
                </label>
                <input
                  type="text"
                  value={popupConfig.ctaLabel}
                  onChange={(e) => updatePopupConfig({ ctaLabel: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Ação ao Clicar
                </label>
                <select
                  value={popupConfig.ctaAction}
                  onChange={(e) =>
                    updatePopupConfig({
                      ctaAction: e.target.value as 'proposal' | 'whatsapp' | 'news' | 'custom_url',
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                >
                  <option value="proposal">Abrir Formulário de Proposta</option>
                  <option value="whatsapp">Abrir Conversa no WhatsApp</option>
                  <option value="news">Abrir jornalfortnews.com.br</option>
                  <option value="custom_url">URL Personalizada</option>
                </select>
              </div>
            </div>

            {popupConfig.ctaAction === 'custom_url' && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  URL de Destino
                </label>
                <input
                  type="url"
                  value={popupConfig.customUrl}
                  onChange={(e) => updatePopupConfig({ customUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Imagem Ilustrativa do Pop-up
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={popupConfig.imageUrl}
                  onChange={(e) => updatePopupConfig({ imageUrl: e.target.value })}
                  className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageFileUpload(e, (url) => updatePopupConfig({ imageUrl: url }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setPopupPreviewOpen(true);
                  onPreviewPortal();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                Testar Pop-up no Site Agora
              </button>
            </div>
          </div>

          {/* Live Card Preview inside CMS */}
          <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#111114] p-6">
            <div className="text-xs font-medium text-zinc-400 mb-3">
              Prévia em Tempo Real do Pop-up
            </div>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-[#0C0C0E]">
              {popupConfig.imageUrl && (
                <div className="h-44 w-full overflow-hidden border-b border-white/10">
                  <MediaFrame
                    src={popupConfig.imageUrl}
                    alt={popupConfig.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="text-[11px] font-medium text-[#D4AF37]">
                  {popupConfig.eyebrow}
                </div>
                <h4 className="mt-1 font-display text-lg font-bold text-white">
                  {popupConfig.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                  {popupConfig.message}
                </p>
                <div className="mt-4">
                  <span className="inline-flex rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white">
                    {popupConfig.ctaLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PORTAL DE NOTÍCIAS (JORNAL FORTNEWS) */}
      {subTab === 'portal_noticias' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Configuração Visual do Jornal FortNews
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Administre nome, cores editoriais, logotipo, domínio e widgets do portal de notícias.
                </p>
              </div>
              {onOpenFortNewsPortal && (
                <button
                  type="button"
                  onClick={onOpenFortNewsPortal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Abrir Jornal
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nome do Portal
                </label>
                <input
                  type="text"
                  value={newsPortalSettings.portalName}
                  onChange={(e) => updateNewsPortalSettings({ portalName: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Domínio Exclusivo
                </label>
                <input
                  type="text"
                  value={newsPortalSettings.domain}
                  onChange={(e) => updateNewsPortalSettings({ domain: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Subtítulo / Tagline do Cabeçalho
              </label>
              <input
                type="text"
                value={newsPortalSettings.portalTagline}
                onChange={(e) => updateNewsPortalSettings({ portalTagline: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Cor Principal (Masthead)
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] p-1.5">
                  <input
                    type="color"
                    disabled={brandLockedForOperator}
                    value={newsPortalSettings.primaryColor}
                    onChange={(e) => updateNewsPortalSettings({ primaryColor: e.target.value })}
                    className="h-7 w-9 rounded border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-mono text-[11px] text-zinc-200">
                    {newsPortalSettings.primaryColor}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Cor Barra de Editorias
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] p-1.5">
                  <input
                    type="color"
                    disabled={brandLockedForOperator}
                    value={newsPortalSettings.secondaryColor}
                    onChange={(e) => updateNewsPortalSettings({ secondaryColor: e.target.value })}
                    className="h-7 w-9 rounded border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-mono text-[11px] text-zinc-200">
                    {newsPortalSettings.secondaryColor}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Logo do Jornal FortNews (Upload ou URL)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={brandLockedForOperator}
                  value={newsPortalSettings.logoUrl}
                  onChange={(e) => updateNewsPortalSettings({ logoUrl: e.target.value })}
                  className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white disabled:opacity-50"
                />
                <label
                  className={`inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 ${
                    brandLockedForOperator ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={brandLockedForOperator}
                    className="hidden"
                    onChange={(e) =>
                      handleImageFileUpload(e, (url) => updateNewsPortalSettings({ logoUrl: url }))
                    }
                  />
                </label>
              </div>
            </div>

            {/* Logo Size & Format Controls + Live Masthead Preview */}
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-200">
                  Tamanho & Proporção da Logomarca no Cabeçalho (FortNews)
                </span>
                <span className="font-mono text-xs font-bold text-[#FF6600] tabular-nums">
                  {newsPortalSettings.logoHeightPx || 46}px altura
                </span>
              </div>
              <input
                type="range"
                aria-label="Tamanho da logomarca do Jornal FortNews em pixels"
                min={28}
                max={140}
                step={2}
                disabled={brandLockedForOperator}
                value={newsPortalSettings.logoHeightPx || 46}
                onChange={(e) =>
                  updateNewsPortalSettings({ logoHeightPx: Number(e.target.value) })
                }
                className="w-full accent-[#fa6607] cursor-pointer disabled:opacity-50"
              />
              <div className="flex flex-wrap gap-1.5">
                {[42, 60, 84, 112, 136].map((px) => (
                  <button
                    key={px}
                    type="button"
                    disabled={brandLockedForOperator}
                    onClick={() => updateNewsPortalSettings({ logoHeightPx: px })}
                    className={`rounded-md border px-2 py-1 text-[10px] font-medium cursor-pointer disabled:opacity-50 ${
                      (newsPortalSettings.logoHeightPx || 46) === px
                        ? 'border-[#fa6607] bg-[#fa6607]/20 text-white'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {px}px
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={brandLockedForOperator}
                  onClick={() => updateNewsPortalSettings({ logoFitMode: 'square' })}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:opacity-50 ${
                    (newsPortalSettings.logoFitMode || 'square') === 'square'
                      ? 'bg-[#fa6607] text-white'
                      : 'border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  Formato Quadrado (1:1)
                </button>
                <button
                  type="button"
                  disabled={brandLockedForOperator}
                  onClick={() => updateNewsPortalSettings({ logoFitMode: 'wide' })}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:opacity-50 ${
                    newsPortalSettings.logoFitMode === 'wide'
                      ? 'bg-[#fa6607] text-white'
                      : 'border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  Formato Horizontal (2.6:1)
                </button>
                <button
                  type="button"
                  disabled={brandLockedForOperator}
                  onClick={() => updateNewsPortalSettings({ logoFitMode: 'auto' })}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:opacity-50 ${
                    newsPortalSettings.logoFitMode === 'auto'
                      ? 'bg-[#fa6607] text-white'
                      : 'border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  Proporcional Livre (Auto)
                </button>
              </div>
              <div
                className="mt-2 flex items-center gap-3 rounded-lg p-3 text-white overflow-hidden"
                style={{ backgroundColor: newsPortalSettings.primaryColor }}
              >
                <div
                  className="overflow-hidden rounded bg-white p-1 shrink-0 flex items-center justify-center"
                  style={{
                    height: `${Math.min(140, Math.max(28, newsPortalSettings.logoHeightPx || 46))}px`,
                    width:
                      newsPortalSettings.logoFitMode === 'wide'
                        ? `${Math.round((newsPortalSettings.logoHeightPx || 46) * 2.6)}px`
                        : newsPortalSettings.logoFitMode === 'auto'
                          ? 'auto'
                          : `${newsPortalSettings.logoHeightPx || 46}px`,
                    maxWidth: newsPortalSettings.logoFitMode === 'auto' ? '260px' : undefined,
                  }}
                >
                  <MediaFrame
                    src={newsPortalSettings.logoUrl}
                    alt="Prévia Logo FortNews"
                    className={
                      newsPortalSettings.logoFitMode === 'auto'
                        ? 'h-full w-auto object-contain'
                        : 'h-full w-full object-contain'
                    }
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-none truncate">
                    {newsPortalSettings.portalName}
                  </div>
                  <div className="text-[10px] text-white/80 truncate mt-0.5">
                    Prévia em tempo real no topo do portal
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsPortalSettings.breakingTickerEnabled}
                  onChange={(e) =>
                    updateNewsPortalSettings({ breakingTickerEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#fa6607]"
                />
                Faixa de Plantão (Break News)
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsPortalSettings.showAds}
                  onChange={(e) => updateNewsPortalSettings({ showAds: e.target.checked })}
                  className="h-4 w-4 accent-[#fa6607]"
                />
                Banners Publicitários do ERP
              </label>
            </div>
          </div>

          {/* Right Column: Circulating AI Ticker + Weather Widget + Active Seals + Footer */}
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-5">
            {/* Circulating AI Ticker Settings */}
            <div className="rounded-xl border border-[#FF6600]/30 bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
                  <h4 className="font-display text-sm font-bold text-white">
                    Legenda Circulante de Notícias (Ticker IA)
                  </h4>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsPortalSettings.marqueeTickerEnabled}
                    onChange={(e) =>
                      updateNewsPortalSettings({ marqueeTickerEnabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#FF6600]"
                  />
                  <span>{newsPortalSettings.marqueeTickerEnabled ? 'Ativo no Site' : 'Oculto'}</span>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Foco / Região da Varredura IA
                  </label>
                  <input
                    type="text"
                    value={tickerRegion}
                    onChange={(e) => setTickerRegion(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Velocidade</label>
                  <select
                    value={newsPortalSettings.marqueeSpeedSeconds || 36}
                    onChange={(e) =>
                      updateNewsPortalSettings({ marqueeSpeedSeconds: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={22}>Rápida (22s)</option>
                    <option value={36}>Normal (36s)</option>
                    <option value={52}>Lenta (52s)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={generatingTicker}
                  onClick={handleGenerateAiTicker}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] disabled:opacity-60 cursor-pointer"
                >
                  {generatingTicker ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {generatingTicker ? 'Buscando Manchetes na Web...' : 'Gerar Legendas Circulantes por IA'}
                </button>
                {newsPortalSettings.marqueeUpdatedAt && (
                  <span className="text-[11px] text-zinc-500">
                    Atualizado: {newsPortalSettings.marqueeUpdatedAt}
                  </span>
                )}
              </div>

              {tickerError && (
                <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                  {tickerError}
                </div>
              )}

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Manchetes da Legenda Circulante (1 por linha — 100% editável)
                </label>
                <textarea
                  rows={4}
                  value={(
                    newsPortalSettings.marqueeAiItems ||
                    INITIAL_NEWS_PORTAL_SETTINGS.marqueeAiItems
                  ).join('\n')}
                  onChange={(e) =>
                    updateNewsPortalSettings({
                      marqueeAiItems: e.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white leading-relaxed"
                />
              </div>
            </div>

            <h3 className="font-display text-base font-bold text-white border-b border-white/10 pb-3">
              Widget Previsão do Tempo, Editorias & Rodapé
            </h3>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Cidade / Região Tempo</label>
                <input
                  type="text"
                  value={newsPortalSettings.weatherCity}
                  onChange={(e) => updateNewsPortalSettings({ weatherCity: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Temp. Atual</label>
                <input
                  type="text"
                  value={newsPortalSettings.weatherTemp}
                  onChange={(e) => updateNewsPortalSettings({ weatherTemp: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Condição Climática</label>
                <input
                  type="text"
                  value={newsPortalSettings.weatherSummary}
                  onChange={(e) => updateNewsPortalSettings({ weatherSummary: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Mín / Máx</label>
                <input
                  type="text"
                  value={newsPortalSettings.weatherMinMax}
                  onChange={(e) => updateNewsPortalSettings({ weatherMinMax: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-2">
                Editorias / Selos Exibidos na Barra Superior do Portal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NEWS_SEALS.map((seal: NewsSeal) => {
                  const checked = newsPortalSettings.enabledSeals.includes(seal);
                  return (
                    <label
                      key={seal}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] text-zinc-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...newsPortalSettings.enabledSeals, seal]
                            : newsPortalSettings.enabledSeals.filter((s) => s !== seal);
                          updateNewsPortalSettings({ enabledSeals: next });
                        }}
                        className="accent-[#fa6607]"
                      />
                      <span className="truncate">{seal}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Texto do Rodapé</label>
              <input
                type="text"
                value={newsPortalSettings.footerText}
                onChange={(e) => updateNewsPortalSettings({ footerText: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PUBLICAÇÃO SEPARADA DOS SITES + GITHUB ACTIONS */}
      {subTab === 'deploy_sites' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Site 1: FortMídia */}
            <div className="rounded-xl border border-[#FF6600]/30 bg-[#111114] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#FF6600]">SITE 01 · HOLDING & AGÊNCIA</div>
                <span className="rounded bg-[#FF6600]/15 px-2 py-0.5 font-mono text-[11px] text-[#FF6600]">
                  VITE_APP_TARGET=fortmidia
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                {siteSettings.siteDomain} (Portal Institucional)
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Build isolado focado na vitrine comercial, cotas de mídia, estúdio de podcast, galeria e área do cliente (`#/cliente`) e acesso ao painel (`#/dashboard`).
              </p>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 font-mono text-[11px] text-zinc-300 space-y-1">
                <div>Comando Build: <span className="text-white">npm run build:fortmidia</span></div>
                <div>Pasta Gerada: <span className="text-emerald-400">./dist-fortmidia/</span></div>
                <div>URL de Produção: <span className="text-sky-400">https://{siteSettings.siteDomain}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onPreviewPortal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Visualizar Site FortMídia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify({ siteSettings, quotas, galleryItems, popupConfig }, null, 2)],
                      { type: 'application/json' }
                    );
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'cms-fortmidia.json';
                    a.click();
                    flashNotice('Arquivo cms-fortmidia.json exportado.');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Exportar Config JSON
                </button>
              </div>
            </div>

            {/* Site 2: Jornal FortNews */}
            <div className="rounded-xl border border-[#fa6607]/40 bg-[#111114] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#fa6607]">SITE 02 · PORTAL DE NOTÍCIAS</div>
                <span className="rounded bg-[#fa6607]/20 px-2 py-0.5 font-mono text-[11px] text-[#fa6607]">
                  VITE_APP_TARGET=fortnews
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                {newsPortalSettings.domain} (Jornal FortNews)
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Build independente que abre diretamente na capa do Jornal FortNews, com editorias, selos, banners do ERP e link discreto para o painel.
              </p>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 font-mono text-[11px] text-zinc-300 space-y-1">
                <div>Comando Build: <span className="text-white">npm run build:fortnews</span></div>
                <div>Pasta Gerada: <span className="text-emerald-400">./dist-fortnews/</span></div>
                <div>URL de Produção: <span className="text-sky-400">https://{newsPortalSettings.domain}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {onOpenFortNewsPortal && (
                  <button
                    type="button"
                    onClick={onOpenFortNewsPortal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    Visualizar Portal FortNews
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify({ newsPortalSettings }, null, 2)],
                      { type: 'application/json' }
                    );
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'cms-fortnews.json';
                    a.click();
                    flashNotice('Arquivo cms-fortnews.json exportado.');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Exportar Config JSON
                </button>
              </div>
            </div>
          </div>

          {/* Direct System Access URLs */}
          <div className="rounded-xl border border-[#fa6607]/30 bg-[#111114] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-white">
                URLs de Acesso Direto ao Sistema, Apresentação e Portais
              </div>
              <span className="font-mono text-[11px] text-emerald-400">
                Roteamento Multi-Domínio + SPA (.htaccess Apache)
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-xs">
              {[
                {
                  label: 'CRM / Painel Administrativo',
                  route: '/crm',
                  hash: '#/crm',
                },
                {
                  label: 'Apresentação Institucional',
                  route: '/apresentacao',
                  hash: '#/apresentacao',
                },
                {
                  label: 'Área do Cliente (Pipeline)',
                  route: '/cliente',
                  hash: '#/cliente',
                },
                {
                  label: 'Portal Jornal FortNews',
                  route: '/fortnews',
                  hash: '#/fortnews',
                },
              ].map((item) => {
                const liveUrl =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/${item.hash}`
                    : `https://${siteSettings.siteDomain}${item.route}`;
                const prodUrl = `https://${siteSettings.siteDomain}${item.route}`;
                return (
                  <div
                    key={item.route}
                    className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-2"
                  >
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="font-mono text-[11px] text-[#fa6607] truncate">{prodUrl}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(liveUrl);
                          flashNotice(`URL ativa copiada: ${liveUrl}`);
                        }}
                        className="rounded border border-white/15 px-2 py-1 text-[10px] text-zinc-200 hover:bg-white/10 cursor-pointer"
                      >
                        Copiar URL Ativa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(prodUrl);
                          flashNotice(`URL de produção copiada: ${prodUrl}`);
                        }}
                        className="rounded border border-[#fa6607]/40 bg-[#fa6607]/10 px-2 py-1 text-[10px] text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
                      >
                        Copiar Produção
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GitHub Actions + cPanel HomeHost + MySQL PHP REST API Guide */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <GitBranch className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              Automação GitHub Actions · cPanel HomeHost &amp; API PHP/MySQL
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              O workflow <code className="text-zinc-200">.github/workflows/deploy.yml</code> gera o build único multi-domínio em <code className="text-zinc-200">dist/</code> e sincroniza automaticamente via FTPS para <code className="text-zinc-200">fortmidia.com.br</code> e <code className="text-zinc-200">fortnews.com.br</code>, preservando a pasta <code className="text-zinc-200">/api/</code> (PHP + MySQL).
            </p>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1.5">
                <div className="font-semibold text-[#fa6607]">Secrets FTP · fortmidia.com.br</div>
                <div className="font-mono text-[11px] text-zinc-300">
                  FTP_SERVER / FTP_USERNAME / FTP_PASSWORD
                </div>
                <div className="text-[11px] text-zinc-500">
                  Destino padrão: /fortmidia.com.br/ (ou FTP_DIR_FORTMIDIA)
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1.5">
                <div className="font-semibold text-[#fa6607]">Secrets FTP · fortnews.com.br</div>
                <div className="font-mono text-[11px] text-zinc-300">
                  FTP_SERVER_FORTNEWS / FTP_USERNAME_FORTNEWS / FTP_PASSWORD_FORTNEWS
                </div>
                <div className="text-[11px] text-zinc-500">
                  Destino padrão: /fortnews.com.br/ (ou FTP_DIR_FORTNEWS)
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-[#0A0A0A] p-4 space-y-1.5">
                <div className="font-semibold text-emerald-400">Backend PHP + MySQL (/api)</div>
                <div className="font-mono text-[11px] text-zinc-300">
                  backend-php-example/schema.sql + api/index.php
                </div>
                <div className="text-[11px] text-zinc-500">
                  Importe schema.sql no phpMyAdmin e configure config.php no servidor.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

