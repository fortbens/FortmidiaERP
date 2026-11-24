import React, { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Film,
  Globe,
  Newspaper,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Tv,
  Upload,
} from 'lucide-react';
import {
  INITIAL_NEWS_PORTAL_SETTINGS,
  INITIAL_SITE_SETTINGS,
} from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { SiteVideoItem } from '../../types/fortmidia';
import {
  getArticlePosterUrl,
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isSafeMediaUrl,
  isVideoArticle,
} from '../../utils/videoEmbed';
import { MediaFrame } from '../MediaFrame';

interface CmsFaviconVideosTabProps {
  onNotice: (msg: string) => void;
  onPreviewFortMidia?: () => void;
  onPreviewFortNews?: () => void;
}

const VideoPreviewPlayer: React.FC<{
  videoUrl?: string;
  posterUrl?: string;
  title: string;
}> = ({ videoUrl, posterUrl, title }) => {
  const cleanUrl = (videoUrl || '').trim();
  if (!cleanUrl || !isSafeMediaUrl(cleanUrl)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-[#08080A] text-xs text-zinc-500">
        Informe uma URL de vídeo (YouTube, Vimeo ou MP4) ou faça upload de um arquivo.
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(cleanUrl);
  const resolvedPoster = posterUrl?.trim() || getYouTubeThumbnailUrl(cleanUrl) || undefined;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : (
        <video
          src={cleanUrl}
          poster={resolvedPoster}
          controls
          playsInline
          className="h-full w-full object-contain bg-black"
        />
      )}
    </div>
  );
};

export const CmsFaviconVideosTab: React.FC<CmsFaviconVideosTabProps> = ({
  onNotice,
  onPreviewFortMidia,
  onPreviewFortNews,
}) => {
  const {
    siteSettings,
    updateSiteSettings,
    newsPortalSettings,
    updateNewsPortalSettings,
    pautas,
    publishPautaToSite,
    unpublishPauta,
  } = useFortMidia();

  // New FortMídia site video form
  const [fmTitle, setFmTitle] = useState('');
  const [fmCategory, setFmCategory] = useState('Institucional');
  const [fmVideoUrl, setFmVideoUrl] = useState('');
  const [fmPosterUrl, setFmPosterUrl] = useState('');
  const [fmDescription, setFmDescription] = useState('');

  // New FortNews portal video form
  const [fnTitle, setFnTitle] = useState('');
  const [fnCategory, setFnCategory] = useState('FortNews TV');
  const [fnVideoUrl, setFnVideoUrl] = useState('');
  const [fnPosterUrl, setFnPosterUrl] = useState('');
  const [fnDescription, setFnDescription] = useState('');

  const handleReadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    maxMb: number,
    onLoad: (dataUrl: string) => void,
    successMsg: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      onNotice(
        `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Para vídeos acima de ${maxMb} MB, recomenda-se colar o link do YouTube, Vimeo ou MP4 hospedado.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoad(reader.result);
        onNotice(successMsg);
      }
    };
    reader.readAsDataURL(file);
  };

  const siteVideos = siteSettings.siteVideos || [];
  const portalVideos = newsPortalSettings.portalVideos || [];
  const videoArticles = pautas.filter((p) => isVideoArticle(p));

  const handleAddSiteVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fmTitle.trim() || !fmVideoUrl.trim()) return;
    if (!isSafeMediaUrl(fmVideoUrl)) {
      onNotice('URL de vídeo inválida. Utilize link https:// (YouTube, Vimeo, MP4) ou upload.');
      return;
    }
    const item: SiteVideoItem = {
      id: `fm-vid-${Date.now()}`,
      title: fmTitle.trim(),
      category: fmCategory.trim() || 'Institucional',
      description: fmDescription.trim() || undefined,
      videoUrl: fmVideoUrl.trim(),
      posterUrl:
        fmPosterUrl.trim() || getYouTubeThumbnailUrl(fmVideoUrl.trim()) || undefined,
      active: true,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    updateSiteSettings({ siteVideos: [item, ...siteVideos] });
    setFmTitle('');
    setFmVideoUrl('');
    setFmPosterUrl('');
    setFmDescription('');
    onNotice(`Vídeo "${item.title}" publicado no site FortMídia.`);
  };

  const handleAddPortalVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fnTitle.trim() || !fnVideoUrl.trim()) return;
    if (!isSafeMediaUrl(fnVideoUrl)) {
      onNotice('URL de vídeo inválida. Utilize link https:// (YouTube, Vimeo, MP4) ou upload.');
      return;
    }
    const item: SiteVideoItem = {
      id: `fn-vid-${Date.now()}`,
      title: fnTitle.trim(),
      category: fnCategory.trim() || 'FortNews TV',
      description: fnDescription.trim() || undefined,
      videoUrl: fnVideoUrl.trim(),
      posterUrl:
        fnPosterUrl.trim() || getYouTubeThumbnailUrl(fnVideoUrl.trim()) || undefined,
      active: true,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    updateNewsPortalSettings({ portalVideos: [item, ...portalVideos] });
    setFnTitle('');
    setFnVideoUrl('');
    setFnPosterUrl('');
    setFnDescription('');
    onNotice(`Vídeo "${item.title}" publicado na FortNews TV (Portal FortNews).`);
  };

  const toggleSiteVideo = (id: string) => {
    updateSiteSettings({
      siteVideos: siteVideos.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
    });
  };

  const deleteSiteVideo = (id: string) => {
    updateSiteSettings({
      siteVideos: siteVideos.filter((v) => v.id !== id),
    });
    onNotice('Vídeo removido do site FortMídia.');
  };

  const togglePortalVideo = (id: string) => {
    updateNewsPortalSettings({
      portalVideos: portalVideos.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
    });
  };

  const deletePortalVideo = (id: string) => {
    updateNewsPortalSettings({
      portalVideos: portalVideos.filter((v) => v.id !== id),
    });
    onNotice('Vídeo removido do Portal FortNews.');
  };

  const fmFavicon = siteSettings.faviconUrl || siteSettings.logoUrl;
  const fnFavicon = newsPortalSettings.faviconUrl || newsPortalSettings.logoUrl;

  return (
    <div className="space-y-8">
      {/* SECTION 1: FAVICONS (FORTMÍDIA & FORTNEWS) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Favicon FortMídia */}
        <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Favicon — Site FortMídia
              </h3>
              <p className="text-[11px] text-zinc-400">
                Ícone exibido na aba do navegador em {siteSettings.siteDomain || 'fortmidia.com.br'} e no painel
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateSiteSettings({
                  faviconUrl:
                    siteSettings.logoUrl || INITIAL_SITE_SETTINGS.faviconUrl,
                });
                onNotice('Favicon do Site FortMídia restaurado para o logotipo oficial.');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Usar Logo
            </button>
          </div>

          {/* Browser Tab Preview */}
          <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Prévia na aba do navegador
            </div>
            <div className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-white/15 bg-[#1C1C21] px-3 py-1.5 max-w-full">
              <div className="h-4 w-4 shrink-0 overflow-hidden rounded-xs bg-white flex items-center justify-center">
                {fmFavicon ? (
                  <img
                    src={fmFavicon}
                    alt="Favicon FortMídia"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Globe className="h-3 w-3 text-zinc-800" />
                )}
              </div>
              <span className="truncate text-xs font-medium text-white max-w-[200px]">
                {siteSettings.brandName} {siteSettings.brandHighlight}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={siteSettings.faviconUrl || ''}
              onChange={(e) => updateSiteSettings({ faviconUrl: e.target.value })}
              placeholder="URL do favicon (PNG, ICO, SVG ou WEBP)"
              className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            />
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 px-3 py-2 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer shrink-0">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Enviar Favicon
              <input
                type="file"
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) =>
                  handleReadFile(
                    e,
                    2,
                    (dataUrl) => updateSiteSettings({ faviconUrl: dataUrl }),
                    'Favicon do Site FortMídia atualizado em tempo real.'
                  )
                }
              />
            </label>
          </div>
        </div>

        {/* Favicon FortNews */}
        <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Favicon — Portal Jornal FortNews
              </h3>
              <p className="text-[11px] text-zinc-400">
                Ícone exibido na aba do navegador em {newsPortalSettings.domain || 'jornalfortnews.com.br'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateNewsPortalSettings({
                  faviconUrl:
                    newsPortalSettings.logoUrl || INITIAL_NEWS_PORTAL_SETTINGS.faviconUrl,
                });
                onNotice('Favicon do Portal FortNews restaurado para o logotipo oficial.');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Usar Logo
            </button>
          </div>

          {/* Browser Tab Preview */}
          <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Prévia na aba do navegador
            </div>
            <div className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-white/15 bg-[#1C1C21] px-3 py-1.5 max-w-full">
              <div className="h-4 w-4 shrink-0 overflow-hidden rounded-xs bg-white flex items-center justify-center">
                {fnFavicon ? (
                  <img
                    src={fnFavicon}
                    alt="Favicon FortNews"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Newspaper className="h-3 w-3 text-zinc-800" />
                )}
              </div>
              <span className="truncate text-xs font-medium text-white max-w-[200px]">
                {newsPortalSettings.portalName} · CIMBAJU
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newsPortalSettings.faviconUrl || ''}
              onChange={(e) => updateNewsPortalSettings({ faviconUrl: e.target.value })}
              placeholder="URL do favicon (PNG, ICO, SVG ou WEBP)"
              className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            />
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 px-3 py-2 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer shrink-0">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Enviar Favicon
              <input
                type="file"
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) =>
                  handleReadFile(
                    e,
                    2,
                    (dataUrl) => updateNewsPortalSettings({ faviconUrl: dataUrl }),
                    'Favicon do Portal FortNews atualizado em tempo real.'
                  )
                }
              />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: VÍDEOS DO SITE FORTMÍDIA */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              Vídeos do Site FortMídia ({siteSettings.siteDomain || 'fortmidia.com.br'})
            </h3>
            <p className="text-xs text-zinc-400">
              Gerencie o filme institucional da capa (Hero) e os vídeos adicionais exibidos no site da FortMídia.
            </p>
          </div>
          {onPreviewFortMidia && (
            <button
              type="button"
              onClick={onPreviewFortMidia}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
              Ver no Site FortMídia
            </button>
          )}
        </div>

        {/* Hero Video Editor */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Vídeo Principal da Capa (Hero Institucional)
              </span>
              <button
                type="button"
                onClick={() => {
                  updateSiteSettings({
                    heroVideoUrl: INITIAL_SITE_SETTINGS.heroVideoUrl,
                    heroVideoPosterUrl: INITIAL_SITE_SETTINGS.heroVideoPosterUrl,
                    heroVideoTitle: INITIAL_SITE_SETTINGS.heroVideoTitle,
                  });
                  onNotice('Vídeo institucional padrão da capa restaurado.');
                }}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar Padrão
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Legenda / Título do Vídeo da Capa
              </label>
              <input
                type="text"
                value={siteSettings.heroVideoTitle || ''}
                onChange={(e) => updateSiteSettings({ heroVideoTitle: e.target.value })}
                placeholder="FortMídia & Grupo FortNews · Estúdio Central CIMBAJU"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                URL do Vídeo (YouTube, Vimeo ou MP4/WebM) ou Upload
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={siteSettings.heroVideoUrl || ''}
                  onChange={(e) => updateSiteSettings({ heroVideoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... ou /assets/...mp4"
                  className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 px-3 py-2 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Subir MP4
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) =>
                      handleReadFile(
                        e,
                        15,
                        (dataUrl) => updateSiteSettings({ heroVideoUrl: dataUrl }),
                        'Vídeo principal do Site FortMídia atualizado.'
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Imagem de Capa / Poster do Vídeo (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={siteSettings.heroVideoPosterUrl || ''}
                  onChange={(e) => updateSiteSettings({ heroVideoPosterUrl: e.target.value })}
                  placeholder="URL da imagem de capa do vídeo"
                  className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                  Capa
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleReadFile(
                        e,
                        4,
                        (dataUrl) => updateSiteSettings({ heroVideoPosterUrl: dataUrl }),
                        'Capa do vídeo principal atualizada.'
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="text-[11px] font-medium text-zinc-400 mb-1.5">
              Prévia ao Vivo (Hero FortMídia)
            </div>
            <VideoPreviewPlayer
              videoUrl={siteSettings.heroVideoUrl}
              posterUrl={siteSettings.heroVideoPosterUrl}
              title={siteSettings.heroVideoTitle || 'Vídeo Institucional FortMídia'}
            />
          </div>
        </div>

        {/* FortMídia Additional Videos Playlist */}
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="text-xs font-semibold text-white">
            Vídeos Adicionais do Site FortMídia ({siteVideos.length})
          </div>

          <form
            onSubmit={handleAddSiteVideo}
            className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-[#0A0A0A] p-4 md:grid-cols-12"
          >
            <input
              type="text"
              required
              value={fmTitle}
              onChange={(e) => setFmTitle(e.target.value)}
              placeholder="Título do vídeo (ex: Comercial Outdoor CIMBAJU) *"
              className="md:col-span-4 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={fmCategory}
              onChange={(e) => setFmCategory(e.target.value)}
              placeholder="Categoria (ex: Institucional, Podcast, OOH)"
              className="md:col-span-3 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <div className="md:col-span-5 flex gap-2">
              <input
                type="text"
                required
                value={fmVideoUrl}
                onChange={(e) => setFmVideoUrl(e.target.value)}
                placeholder="Link YouTube, Vimeo, Reels ou MP4 *"
                className="flex-1 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
              />
              <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#121215] px-2.5 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer shrink-0">
                <Upload className="h-3.5 w-3.5 text-[#fa6607]" />
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) =>
                    handleReadFile(e, 15, setFmVideoUrl, 'Arquivo de vídeo carregado no formulário.')
                  }
                />
              </label>
            </div>
            <input
              type="text"
              value={fmDescription}
              onChange={(e) => setFmDescription(e.target.value)}
              placeholder="Descrição curta (opcional)"
              className="md:col-span-6 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={fmPosterUrl}
              onChange={(e) => setFmPosterUrl(e.target.value)}
              placeholder="URL da capa / poster (automático para YouTube)"
              className="md:col-span-4 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="md:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Publicar Vídeo
            </button>
          </form>

          {siteVideos.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {siteVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <VideoPreviewPlayer
                      videoUrl={vid.videoUrl}
                      posterUrl={vid.posterUrl}
                      title={vid.title}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#fa6607]">
                          {vid.category || 'Institucional'} · {vid.createdAt}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{vid.title}</div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                          vid.active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {vid.active ? 'No Ar' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleSiteVideo(vid.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {vid.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {vid.active ? 'Ocultar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSiteVideo(vid.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: VÍDEOS DO PORTAL FORTNEWS (FORTNEWS TV) */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Tv className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              Vídeos do Portal Jornal FortNews ({newsPortalSettings.domain || 'jornalfortnews.com.br'})
            </h3>
            <p className="text-xs text-zinc-400">
              Controle o player da seção FortNews TV na capa do portal e gerencie a playlist de vídeos. Matérias em vídeo publicadas aparecem automaticamente aqui e na capa!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newsPortalSettings.featuredVideoEnabled !== false}
                onChange={(e) =>
                  updateNewsPortalSettings({ featuredVideoEnabled: e.target.checked })
                }
                className="h-4 w-4 accent-[#fa6607]"
              />
              <span>Exibir Bloco FortNews TV</span>
            </label>
            {onPreviewFortNews && (
              <button
                type="button"
                onClick={onPreviewFortNews}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                Abrir Portal FortNews
              </button>
            )}
          </div>
        </div>

        {/* FortNews Featured Video */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 space-y-3">
            <span className="block text-xs font-semibold text-white">
              Vídeo Principal / Chamada Fixa da FortNews TV
            </span>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Título do Destaque FortNews TV
              </label>
              <input
                type="text"
                value={newsPortalSettings.featuredVideoTitle || ''}
                onChange={(e) =>
                  updateNewsPortalSettings({ featuredVideoTitle: e.target.value })
                }
                placeholder="FortNews TV · Jornalismo & Estúdio CIMBAJU"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                URL do Vídeo (YouTube, Vimeo, Live ou MP4) ou Upload
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newsPortalSettings.featuredVideoUrl || ''}
                  onChange={(e) =>
                    updateNewsPortalSettings({ featuredVideoUrl: e.target.value })
                  }
                  placeholder="https://youtube.com/watch?v=... ou arquivo MP4"
                  className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 px-3 py-2 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Subir MP4
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) =>
                      handleReadFile(
                        e,
                        15,
                        (dataUrl) =>
                          updateNewsPortalSettings({ featuredVideoUrl: dataUrl }),
                        'Vídeo em destaque do Portal FortNews atualizado.'
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Imagem de Capa / Poster (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newsPortalSettings.featuredVideoPosterUrl || ''}
                  onChange={(e) =>
                    updateNewsPortalSettings({ featuredVideoPosterUrl: e.target.value })
                  }
                  placeholder="URL da imagem de capa"
                  className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer shrink-0">
                  <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                  Capa
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleReadFile(
                        e,
                        4,
                        (dataUrl) =>
                          updateNewsPortalSettings({ featuredVideoPosterUrl: dataUrl }),
                        'Poster do vídeo destaque FortNews atualizado.'
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="text-[11px] font-medium text-zinc-400 mb-1.5">
              Prévia ao Vivo (FortNews TV)
            </div>
            <VideoPreviewPlayer
              videoUrl={newsPortalSettings.featuredVideoUrl}
              posterUrl={newsPortalSettings.featuredVideoPosterUrl}
              title={newsPortalSettings.featuredVideoTitle || 'FortNews TV'}
            />
          </div>
        </div>

        {/* FortNews Additional Playlist */}
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="text-xs font-semibold text-white">
            Playlist de Vídeos do Portal FortNews ({portalVideos.length})
          </div>

          <form
            onSubmit={handleAddPortalVideo}
            className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-[#0A0A0A] p-4 md:grid-cols-12"
          >
            <input
              type="text"
              required
              value={fnTitle}
              onChange={(e) => setFnTitle(e.target.value)}
              placeholder="Título do vídeo no Portal FortNews *"
              className="md:col-span-4 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={fnCategory}
              onChange={(e) => setFnCategory(e.target.value)}
              placeholder="Selo / Programa (ex: FortNews TV, Podcast)"
              className="md:col-span-3 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <div className="md:col-span-5 flex gap-2">
              <input
                type="text"
                required
                value={fnVideoUrl}
                onChange={(e) => setFnVideoUrl(e.target.value)}
                placeholder="Link YouTube, Vimeo, Reels ou MP4 *"
                className="flex-1 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
              />
              <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#121215] px-2.5 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer shrink-0">
                <Upload className="h-3.5 w-3.5 text-[#fa6607]" />
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) =>
                    handleReadFile(e, 15, setFnVideoUrl, 'Arquivo de vídeo carregado no formulário.')
                  }
                />
              </label>
            </div>
            <input
              type="text"
              value={fnDescription}
              onChange={(e) => setFnDescription(e.target.value)}
              placeholder="Descrição curta (opcional)"
              className="md:col-span-6 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={fnPosterUrl}
              onChange={(e) => setFnPosterUrl(e.target.value)}
              placeholder="URL da capa / poster (automático para YouTube)"
              className="md:col-span-4 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="md:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Publicar Vídeo
            </button>
          </form>

          {portalVideos.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {portalVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <VideoPreviewPlayer
                      videoUrl={vid.videoUrl}
                      posterUrl={vid.posterUrl}
                      title={vid.title}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#fa6607]">
                          {vid.category || 'FortNews TV'} · {vid.createdAt}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{vid.title}</div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                          vid.active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {vid.active ? 'No Ar' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      onClick={() => togglePortalVideo(vid.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {vid.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {vid.active ? 'Ocultar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePortalVideo(vid.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: MATÉRIAS EM VÍDEO (PUBLICAÇÃO INTEGRADA NOS SITES) */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Play className="h-4 w-4 text-[#fa6607] fill-[#fa6607]" aria-hidden="true" />
              Matérias em Vídeo da Redação ({videoArticles.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Todas as matérias cadastradas com vídeo em Jornalismo ou Editor do Portal aparecem automaticamente com player nos sites FortNews e FortMídia quando publicadas.
            </p>
          </div>
        </div>

        {videoArticles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#0A0A0A] p-5 text-xs text-zinc-400">
            Nenhuma matéria em vídeo cadastrada ainda. Crie uma matéria marcando o formato{' '}
            <strong className="text-white">Matéria em Vídeo</strong> em{' '}
            <strong className="text-white">Editor Portal FortNews</strong> ou{' '}
            <strong className="text-white">Redação &amp; Jornalismo</strong> para publicar diretamente nos sites.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {videoArticles.map((art) => {
              const isPublished = art.approvalStatus === 'Publicada no Site';
              const poster = getArticlePosterUrl(art);
              return (
                <div
                  key={art.id}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0A0A0A] p-3"
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-zinc-900 border border-white/10 flex items-center justify-center">
                    {poster ? (
                      <MediaFrame
                        src={poster}
                        alt={art.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="h-6 w-6 text-zinc-500" />
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold text-[#fa6607]">
                      VÍDEO
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-zinc-400">
                      {art.seal} · {art.city}
                    </div>
                    <div className="truncate text-xs font-semibold text-white">{art.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isPublished
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {isPublished && <Check className="h-3 w-3" />}
                        {art.approvalStatus}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isPublished ? (
                      <button
                        type="button"
                        onClick={() => {
                          unpublishPauta(art.id);
                          onNotice(`Matéria em vídeo "${art.title}" retirada do ar.`);
                        }}
                        className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        Ocultar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          publishPautaToSite(art.id);
                          onNotice(`Matéria em vídeo "${art.title}" publicada nos sites FortNews e FortMídia!`);
                        }}
                        className="rounded-lg bg-[#fa6607] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                      >
                        Publicar no Site
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
