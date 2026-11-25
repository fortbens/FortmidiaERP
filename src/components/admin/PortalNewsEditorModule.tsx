import React, { useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  Film,
  Globe,
  Image as ImageIcon,
  Loader2,
  Newspaper,
  Palette,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { NEWS_SEALS, NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { aiApi } from '../../services/api';
import {
  ChiefApprovalStatus,
  CimbajuCity,
  EditorialPauta,
  NewsSeal,
  SocialCreativeDraft,
} from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';
import { ResolvedVideo } from '../ResolvedVideo';
import { FortNewsLogo, OFFICIAL_FORTNEWS_LOGO_URL } from '../FortMidiaLogo';
import {
  getArticlePosterUrl,
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  isVideoArticle,
} from '../../utils/videoEmbed';
import { processUploadedPhoto } from '../../utils/imageUpload';
import { isLocalVideoUri, uploadVideoFile } from '../../utils/videoUpload';

interface PortalNewsEditorModuleProps {
  onOpenFortNewsPortal: () => void;
  onOpenMarketingStudio: (pautaId?: string) => void;
}

interface ExtractedDraft {
  title: string;
  summary: string;
  body: string;
  suggestedSeal: NewsSeal;
  city: CimbajuCity;
  sources: { title: string; uri: string }[];
  socialCreative: SocialCreativeDraft;
}

const IMAGE_PRESETS = [
  { label: 'Estúdio Podcast', url: '/assets/aistudio/Microfone_dc305011.jpg' },
  { label: 'Outdoor Rodovia', url: '/assets/aistudio/outdoor_6fc8fbe7.jpg' },
  { label: 'Revista FortNews', url: '/assets/aistudio/Mockup_Revista_4c06e73a.jpg' },
  { label: 'Logo FortNews Oficial', url: OFFICIAL_FORTNEWS_LOGO_URL },
];

export const PortalNewsEditorModule: React.FC<PortalNewsEditorModuleProps> = ({
  onOpenFortNewsPortal,
  onOpenMarketingStudio,
}) => {
  const {
    pautas,
    teamMembers,
    activeAdminUserId,
    newsPortalSettings,
    updateNewsPortalSettings,
    addPauta,
    updatePautaContent,
    updatePautaSeal,
    deletePauta,
    chiefEditorApprovePauta,
    publishPautaToSite,
    unpublishPauta,
    apiSyncError,
  } = useFortMidia();

  const activeUser =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    activeUser?.role === 'Super Admin / Diretoria' || activeUser?.hierarchyLevel === 1;
  const canDelete = isSuperAdmin || activeUser?.permissions?.canDelete === true;

  // AI Regional News Extractor state
  const [extractRegion, setExtractRegion] = useState<CimbajuCity>('Franco da Rocha');
  const [extractTopic, setExtractTopic] = useState(
    'Infraestrutura, obras, mobilidade, saúde ou segurança regional'
  );
  const [sourceHint, setSourceHint] = useState('');
  const [extractCount, setExtractCount] = useState(3);
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedDrafts, setExtractedDrafts] = useState<ExtractedDraft[]>([]);

  // Ticker AI quick refresh state
  const [tickerLoading, setTickerLoading] = useState(false);

  // Full Article Editor state (for creating new OR editing existing OR editing an AI-extracted draft)
  const [editingPautaId, setEditingPautaId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [seal, setSeal] = useState<NewsSeal>('Cidade & Política');
  const [reporter, setReporter] = useState('Redação Portal FortNews');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('/assets/aistudio/Microfone_dc305011.jpg');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoUrl, setVideoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{
    fileName: string;
    width: number;
    height: number;
    sizeKb: number;
  } | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{
    fileName: string;
    sizeMb: number;
    storage: 'server' | 'local';
  } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSources, setPendingSources] = useState<{ title: string; uri: string }[]>([]);
  const [pendingSocial, setPendingSocial] = useState<SocialCreativeDraft | undefined>(undefined);
  const [isAiOrigin, setIsAiOrigin] = useState(false);

  // List filters
  const [statusFilter, setStatusFilter] = useState<'Todas' | ChiefApprovalStatus>('Todas');
  const [cityFilter, setCityFilter] = useState<'Todas' | CimbajuCity>('Todas');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const chiefCandidates = teamMembers.filter(
    (m) =>
      m.active &&
      (m.role === 'Redator-Chefe' ||
        m.role === 'Super Admin / Diretoria' ||
        m.role === 'Administrador')
  );
  const defaultChief =
    chiefCandidates.find((m) => m.role === 'Redator-Chefe') || chiefCandidates[0];
  const [chiefName, setChiefName] = useState(defaultChief?.name || 'Emerson Carneiro');

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const publishedCount = useMemo(
    () => pautas.filter((p) => p.approvalStatus === 'Publicada no Site').length,
    [pautas]
  );
  const awaitingCount = useMemo(
    () =>
      pautas.filter(
        (p) =>
          p.approvalStatus === 'Aguardando Redator-Chefe' ||
          p.approvalStatus === 'Em Apuração'
      ).length,
    [pautas]
  );

  const filteredArticles = useMemo(
    () =>
      pautas.filter((p) => {
        const mStatus = statusFilter === 'Todas' || p.approvalStatus === statusFilter;
        const mCity = cityFilter === 'Todas' || p.city === cityFilter;
        return mStatus && mCity;
      }),
    [pautas, statusFilter, cityFilter]
  );

  const resetEditor = () => {
    setEditingPautaId(null);
    setTitle('');
    setCity('Franco da Rocha');
    setSeal('Cidade & Política');
    setReporter('Redação Portal FortNews');
    setSummary('');
    setBody('');
    setImageUrl('/assets/aistudio/Microfone_dc305011.jpg');
    setMediaType('image');
    setVideoUrl('');
    setPhotoMeta(null);
    setPhotoError(null);
    setVideoMeta(null);
    setVideoError(null);
    setEditorError(null);
    setPendingSources([]);
    setPendingSocial(undefined);
    setIsAiOrigin(false);
  };

  const loadExistingIntoEditor = (art: EditorialPauta) => {
    setEditingPautaId(art.id);
    setTitle(art.title);
    setCity(art.city);
    setSeal(art.seal);
    setReporter(art.reporter);
    setSummary(art.summary);
    setBody(art.body);
    setImageUrl(art.imageUrl || getArticlePosterUrl(art) || '/assets/aistudio/Microfone_dc305011.jpg');
    setMediaType(isVideoArticle(art) ? 'video' : art.mediaType || 'image');
    setVideoUrl(art.videoUrl || '');
    setPhotoMeta(null);
    setPhotoError(null);
    setVideoMeta(null);
    setVideoError(null);
    setEditorError(null);
    setPendingSources(art.sourceUrls || []);
    setPendingSocial(art.socialCreative);
    setIsAiOrigin(Boolean(art.aiGenerated));
    flash(`Matéria "${art.title.slice(0, 42)}..." carregada no editor.`);
  };

  const loadExtractedDraftIntoEditor = (draft: ExtractedDraft) => {
    setEditingPautaId(null);
    setTitle(draft.title);
    setCity(draft.city);
    setSeal(draft.suggestedSeal);
    setReporter('Apuração Web IA · Revisão Editorial');
    setSummary(draft.summary);
    setBody(draft.body);
    setImageUrl('/assets/aistudio/Microfone_dc305011.jpg');
    setMediaType('image');
    setVideoUrl('');
    setPhotoMeta(null);
    setPhotoError(null);
    setVideoMeta(null);
    setVideoError(null);
    setEditorError(null);
    setPendingSources(draft.sources || []);
    setPendingSocial(draft.socialCreative);
    setIsAiOrigin(true);
    flash('Notícia regional extraída carregada no editor. Ajuste texto, selo ou mídia antes de publicar.');
  };

  const handleExtractRegionalNews = async () => {
    setExtractLoading(true);
    setExtractError('');
    try {
      const res = await aiApi.scanNews<{
        articles?: ExtractedDraft[];
        notice?: string;
        error?: string;
      }>({
        region: extractRegion,
        topic: extractTopic,
        sourceHint: sourceHint.trim(),
        count: extractCount,
      });
      if (!res.ok || !res.data) {
        setExtractError(res.error || 'Erro ao extrair notícias regionais.');
        return;
      }
      const list = Array.isArray(res.data.articles) ? res.data.articles : [];
      setExtractedDrafts(list);
      if (list.length === 0) {
        setExtractError('Nenhuma notícia encontrada com esses critérios. Tente ampliar as palavras-chave.');
      } else {
        flash(
          res.data.notice
            ? `${list.length} matéria(s) extraída(s) ao vivo! (${res.data.notice})`
            : `${list.length} matéria(s) extraída(s) da região. Clique em "Editar Matéria" para revisar e publicar.`
        );
      }
    } catch {
      setExtractError('Não foi possível conectar ao servidor de extração IA.');
    } finally {
      setExtractLoading(false);
    }
  };

  const handleRefreshAiTicker = async () => {
    setTickerLoading(true);
    try {
      const res = await aiApi.generateTicker<{ items?: string[]; generatedAt?: string }>({
        region: extractRegion,
      });
      if (res.ok && Array.isArray(res.data?.items) && res.data.items.length > 0) {
        updateNewsPortalSettings({
          marqueeAiItems: res.data.items,
          marqueeTickerEnabled: true,
          marqueeUpdatedAt: res.data.generatedAt || 'Agora',
        });
        flash('Legenda Circulante do Jornal FortNews atualizada por IA.');
      }
    } catch {
      // Ignore silent fail
    } finally {
      setTickerLoading(false);
    }
  };

  const handleSaveArticle = (targetMode: 'approval_queue' | 'publish_now') => {
    setEditorError(null);

    if (videoUploading || photoUploading) {
      const waitMsg = 'Aguarde o envio da mídia concluir antes de enviar a matéria.';
      setEditorError(waitMsg);
      flash(waitMsg);
      return;
    }

    if (!title.trim()) {
      const msg = 'Preencha o Título da Manchete antes de enviar para o Redator-Chefe ou publicar.';
      setEditorError(msg);
      flash(msg);
      return;
    }

    const trimmedVideo = videoUrl.trim();
    const resolvedMediaType: 'image' | 'video' =
      mediaType === 'video' ? 'video' : 'image';

    if (resolvedMediaType === 'video' && !trimmedVideo) {
      const msg = 'Envie um arquivo de vídeo (Subir Vídeo) ou cole um link do YouTube, Vimeo ou MP4.';
      setEditorError(msg);
      flash(msg);
      return;
    }

    const resolvedSummary = summary.trim() || title.trim();
    const resolvedBody = body.trim() || resolvedSummary;

    const nowStamp = `${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString(
      'pt-BR',
      { hour: '2-digit', minute: '2-digit' }
    )}`;

    const ytThumb = getYouTubeThumbnailUrl(trimmedVideo);
    const isDefaultPreset = IMAGE_PRESETS.some((p) => p.url === imageUrl);
    const resolvedImageUrl =
      resolvedMediaType === 'video' && ytThumb && (!imageUrl.trim() || isDefaultPreset)
        ? ytThumb
        : imageUrl.trim() || ytThumb || undefined;

    const targetApprovalStatus: ChiefApprovalStatus =
      targetMode === 'publish_now' ? 'Publicada no Site' : 'Aguardando Redator-Chefe';

    if (editingPautaId) {
      updatePautaContent(editingPautaId, {
        title: title.trim(),
        city,
        seal,
        reporter: reporter.trim() || 'Redação Portal FortNews',
        summary: resolvedSummary,
        body: resolvedBody,
        imageUrl: resolvedImageUrl,
        mediaType: resolvedMediaType,
        videoUrl: resolvedMediaType === 'video' ? trimmedVideo || undefined : undefined,
        sourceUrls: pendingSources,
        socialCreative: pendingSocial,
        ...(targetMode === 'publish_now'
          ? {
              approvalStatus: 'Publicada no Site',
              status: 'Publicado',
              approvedBy: `${chiefName} (Editor-Chefe)`,
              publishedAt: nowStamp,
            }
          : {
              approvalStatus: 'Aguardando Redator-Chefe',
              status: 'Edição & Cortes',
            }),
      });
      if (statusFilter !== 'Todas' && statusFilter !== targetApprovalStatus) {
        setStatusFilter('Todas');
      }
      if (cityFilter !== 'Todas' && cityFilter !== city) {
        setCityFilter('Todas');
      }
      flash(
        targetMode === 'publish_now'
          ? resolvedMediaType === 'video'
            ? 'Matéria em VÍDEO atualizada e PUBLICADA no Portal FortNews e no site FortMídia!'
            : 'Matéria atualizada e PUBLICADA no Portal FortNews e no site FortMídia!'
          : resolvedMediaType === 'video'
            ? 'Matéria em VÍDEO atualizada e enviada para a esteira do Redator-Chefe!'
            : 'Edições salvas e enviadas para aprovação do Redator-Chefe.'
      );
      resetEditor();
      return;
    }

    addPauta({
      title: title.trim(),
      city,
      seal,
      format: 'Portal 24/7',
      reporter: reporter.trim() || 'Redação Portal FortNews',
      deadline: new Date().toLocaleDateString('pt-BR'),
      status: targetMode === 'publish_now' ? 'Publicado' : 'Edição & Cortes',
      approvalStatus: targetApprovalStatus,
      approvedBy:
        targetMode === 'publish_now' ? `${chiefName} (Editor-Chefe)` : undefined,
      publishedAt: targetMode === 'publish_now' ? nowStamp : undefined,
      summary: resolvedSummary,
      body: resolvedBody,
      imageUrl: resolvedImageUrl,
      mediaType: resolvedMediaType,
      videoUrl: resolvedMediaType === 'video' ? trimmedVideo || undefined : undefined,
      aiGenerated: isAiOrigin,
      sourceUrls: pendingSources.length > 0 ? pendingSources : undefined,
      socialCreative: pendingSocial,
    });

    // Garante que a nova matéria fique imediatamente visível na esteira ao lado
    if (statusFilter !== 'Todas' && statusFilter !== targetApprovalStatus) {
      setStatusFilter('Todas');
    }
    if (cityFilter !== 'Todas' && cityFilter !== city) {
      setCityFilter('Todas');
    }

    flash(
      targetMode === 'publish_now'
        ? resolvedMediaType === 'video'
          ? 'Nova matéria em VÍDEO publicada imediatamente no Portal Jornal FortNews e na FortMídia!'
          : 'Nova matéria publicada imediatamente no Portal Jornal FortNews!'
        : resolvedMediaType === 'video'
          ? 'Matéria em VÍDEO enviada para a esteira do Redator-Chefe com sucesso!'
          : 'Matéria incluída e enviada para fila do Redator-Chefe.'
    );
    resetEditor();
  };

  const applyPhotoFile = async (file: File) => {
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const processed = await processUploadedPhoto(file);
      setImageUrl(processed.dataUrl);
      setPhotoMeta({
        fileName: processed.fileName,
        width: processed.width,
        height: processed.height,
        sizeKb: processed.sizeKb,
      });
      if (editingPautaId) {
        updatePautaContent(editingPautaId, { imageUrl: processed.dataUrl });
        flash(
          `Foto "${processed.fileName}" (${processed.sizeKb} KB) aplicada e salva na matéria em edição!`
        );
      } else {
        flash(
          `Foto "${processed.fileName}" (${processed.width}×${processed.height} · ${processed.sizeKb} KB) carregada na capa da matéria!`
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível carregar a foto selecionada.';
      setPhotoError(msg);
      flash(msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await applyPhotoFile(file);
  };

  const handlePhotoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await applyPhotoFile(file);
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setVideoUploading(true);
    setVideoError(null);
    setEditorError(null);
    try {
      const uploaded = await uploadVideoFile(file);
      setVideoUrl(uploaded.videoUrl);
      setMediaType('video');
      setVideoMeta({
        fileName: uploaded.fileName,
        sizeMb: uploaded.sizeMb,
        storage: uploaded.storage,
      });

      const isPresetOrEmpty = !imageUrl.trim() || IMAGE_PRESETS.some((p) => p.url === imageUrl);
      const nextPoster = uploaded.posterDataUrl && isPresetOrEmpty ? uploaded.posterDataUrl : undefined;
      if (nextPoster) {
        setImageUrl(nextPoster);
      }

      if (editingPautaId) {
        updatePautaContent(editingPautaId, {
          mediaType: 'video',
          videoUrl: uploaded.videoUrl,
          ...(nextPoster ? { imageUrl: nextPoster } : {}),
        });
      }

      flash(
        uploaded.storage === 'server'
          ? `Vídeo "${uploaded.fileName}" (${uploaded.sizeMb} MB) enviado ao servidor e pronto na matéria!`
          : `Vídeo "${uploaded.fileName}" (${uploaded.sizeMb} MB) carregado com sucesso! Clique em "Enviar p/ Redator-Chefe" ou "Aprovar & Publicar".`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível enviar o vídeo selecionado.';
      setVideoError(msg);
      flash(msg);
    } finally {
      setVideoUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Portal de Notícias — Matérias, Extrator IA & Publicação
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Extraia notícias regionais com Inteligência Artificial para editar, crie matérias do zero, aprove como Redator-Chefe e publique direto no Jornal FortNews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshAiTicker}
            disabled={tickerLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer"
          >
            {tickerLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6600]" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#FF6600]" />
            )}
            Atualizar Ticker IA
          </button>
          <button
            type="button"
            onClick={onOpenFortNewsPortal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir Jornal FortNews ({publishedCount} no ar)
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* BLOCO 1: EXTRATOR REGIONAL DE NOTÍCIAS POR IA */}
      <section className="rounded-xl border border-[#fa6607]/30 bg-[#121215] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-[#fa6607] shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Extrator Regional de Notícias por IA (Google Search ao Vivo)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Puxa fatos reais da cidade ou portal escolhido e abre para você editar linha por linha antes de publicar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <label className="block text-[11px] text-zinc-400 mb-1">Região / Cidade</label>
            <select
              value={extractRegion}
              onChange={(e) => setExtractRegion(e.target.value as CimbajuCity)}
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              {NEWS_TERRITORIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-4">
            <label className="block text-[11px] text-zinc-400 mb-1">Tema ou Palavras-chave</label>
            <input
              type="text"
              value={extractTopic}
              onChange={(e) => setExtractTopic(e.target.value)}
              placeholder="Ex: Rodovia, Prefeitura, CPTM, Hospital..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="block text-[11px] text-zinc-400 mb-1">
              Portal / Link de Referência (Opcional)
            </label>
            <input
              type="text"
              value={sourceHint}
              onChange={(e) => setSourceHint(e.target.value)}
              placeholder="Ex: prefeitura, agência oficial ou portal regional..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="lg:col-span-2 flex items-end gap-2">
            <select
              aria-label="Quantidade de notícias"
              value={extractCount}
              onChange={(e) => setExtractCount(Number(e.target.value))}
              className="w-16 rounded-lg border border-white/15 bg-[#0A0A0A] px-2 py-2 text-xs text-white"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
              <option value={4}>4x</option>
            </select>
            <button
              type="button"
              disabled={extractLoading}
              onClick={handleExtractRegionalNews}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {extractLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {extractLoading ? 'Extraindo...' : 'Extrair Agora'}
            </button>
          </div>
        </div>

        {extractError && (
          <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {extractError}
          </div>
        )}

        {extractedDrafts.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-semibold text-zinc-300">
              Matérias Extraídas ({extractedDrafts.length}) — Escolha uma para editar no painel abaixo:
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {extractedDrafts.map((draft, i) => (
                <div
                  key={`ext-${i}`}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#D4AF37]">{draft.suggestedSeal}</span>
                      <span className="text-zinc-500">{draft.city}</span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-white leading-snug">
                      {draft.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-3">{draft.summary}</p>
                    {draft.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {draft.sources.slice(0, 2).map((src, si) => (
                          <a
                            key={si}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline truncate max-w-[160px]"
                          >
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            {src.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => loadExtractedDraftIntoEditor(draft)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Editar Matéria
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* BLOCO 2: EDITOR COMPLETO + MESA DE APROVAÇÃO & SITE */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Editor Completo */}
        <section className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-5 sm:p-6 space-y-4 self-start">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-white">
                {editingPautaId ? 'Editar Matéria Existente' : 'Incluir / Redigir Nova Matéria'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 px-2.5 py-1 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Preview
              </button>
              {editingPautaId && (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  + Nova Matéria Limpa
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Selo / Editoria</label>
              <select
                value={seal}
                onChange={(e) => setSeal(e.target.value as NewsSeal)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {NEWS_SEALS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Território / Cidade</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CimbajuCity)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {NEWS_TERRITORIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Título da Manchete *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Manchete jornalística forte e direta..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Resumo / Subtítulo (Linha Fina) *</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Resumo de 1 a 2 frases exibido na capa do Portal FortNews..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Texto Completo da Reportagem</label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Corpo completo da reportagem com detalhes locais, serviços ao cidadão e fontes..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white leading-relaxed"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Repórter / Assinatura</label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Editor-Chefe Responsável</label>
              <select
                value={chiefName}
                onChange={(e) => setChiefName(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {chiefCandidates.length > 0 ? (
                  chiefCandidates.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="Emerson Carneiro">Emerson Carneiro</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-zinc-200">
                Formato de Mídia da Matéria (Foto ou Vídeo Padronizado)
              </label>
              <div className="inline-flex rounded-lg border border-white/15 bg-[#121215] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 cursor-pointer ${
                    mediaType === 'image' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  Foto / Capa
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 cursor-pointer ${
                    mediaType === 'video' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                  }`}
                >
                  <Film className="h-3 w-3" />
                  Matéria em Vídeo
                </button>
              </div>
            </div>

            {mediaType === 'video' && (
              <div className="space-y-2.5 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-[11px] text-[#D4AF37]">
                    Arquivo de Vídeo (MP4/WebM/MOV) ou Link YouTube / Vimeo / Reels
                  </label>
                  {getYouTubeThumbnailUrl(videoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        const thumb = getYouTubeThumbnailUrl(videoUrl);
                        if (thumb) setImageUrl(thumb);
                      }}
                      className="text-[11px] font-medium text-[#FF6600] hover:underline cursor-pointer"
                    >
                      Usar capa do YouTube
                    </button>
                  )}
                </div>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  className="hidden"
                  onChange={handleUploadVideo}
                />

                {videoUrl.trim() && (
                  <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
                    <div className="aspect-video max-h-48 w-full bg-black">
                      {getVideoEmbedUrl(videoUrl) ? (
                        <iframe
                          src={getVideoEmbedUrl(videoUrl) || undefined}
                          title={title || 'Pré-visualização do vídeo'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0"
                        />
                      ) : (
                        <ResolvedVideo
                          src={videoUrl}
                          poster={imageUrl || getYouTubeThumbnailUrl(videoUrl) || undefined}
                          controls
                          playsInline
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#121215] px-3 py-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium min-w-0 truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {videoMeta
                          ? `${videoMeta.fileName} (${videoMeta.sizeMb} MB · ${
                              videoMeta.storage === 'server' ? 'Servidor' : 'Carregado'
                            })`
                          : isLocalVideoUri(videoUrl)
                            ? 'Vídeo anexado e pronto para enviar'
                            : 'Vídeo vinculado à matéria'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={videoUploading}
                          className="rounded bg-[#FF6600] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer disabled:opacity-60"
                        >
                          Trocar Vídeo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoUrl('');
                            setVideoMeta(null);
                            setVideoError(null);
                          }}
                          className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-white/5 cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {videoError && (
                  <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                    {videoError}
                  </div>
                )}

                <div className="flex gap-2">
                  {videoUrl.startsWith('data:video/') || isLocalVideoUri(videoUrl) || videoUrl.startsWith('/uploads/videos/') ? (
                    <div className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 min-w-0">
                      <span className="truncate">
                        {videoMeta
                          ? `Vídeo pronto: ${videoMeta.fileName} (${videoMeta.sizeMb} MB)`
                          : 'Arquivo de vídeo carregado na matéria'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl('');
                          setVideoMeta(null);
                        }}
                        className="shrink-0 text-[11px] font-semibold text-zinc-200 underline hover:text-white cursor-pointer"
                      >
                        Usar Link
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setVideoUrl(nextVal);
                        setVideoMeta(null);
                        setVideoError(null);
                        setEditorError(null);
                        if (nextVal.trim()) setMediaType('video');
                        const ytThumb = getYouTubeThumbnailUrl(nextVal);
                        const isPreset = IMAGE_PRESETS.some((p) => p.url === imageUrl);
                        if (ytThumb && (!imageUrl.trim() || isPreset)) {
                          setImageUrl(ytThumb);
                        }
                      }}
                      placeholder="https://youtube.com/watch?v=..., Vimeo, Reels ou MP4"
                      className="flex-1 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={videoUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6600]/40 bg-[#FF6600]/10 px-3 py-2 text-xs font-medium text-[#FF6600] hover:bg-[#FF6600]/20 cursor-pointer shrink-0 disabled:opacity-60"
                  >
                    {videoUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {videoUploading ? 'Subindo Vídeo...' : 'Subir Vídeo'}
                  </button>
                </div>
              </div>
            )}

            <label className="block text-[11px] text-zinc-400">
              {mediaType === 'video'
                ? 'Imagem de Capa / Poster do Vídeo (padroniza o card com as demais notícias)'
                : 'Foto de Capa da Matéria (Upload, Arrastar & Soltar, URL ou Presets)'}
            </label>

            {/* Hidden File Input controlled via explicit button/dropzone */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadPhoto}
            />

            {/* Live Cover Photo Preview + Drag & Drop Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingPhoto(true);
              }}
              onDragLeave={() => setIsDraggingPhoto(false)}
              onDrop={handlePhotoDrop}
              className={`relative overflow-hidden rounded-lg border transition-colors ${
                isDraggingPhoto
                  ? 'border-[#FF6600] bg-[#FF6600]/10'
                  : 'border-white/15 bg-[#121215]'
              }`}
            >
              {imageUrl.trim() ? (
                <div className="relative h-44 w-full bg-zinc-950">
                  <MediaFrame
                    src={imageUrl}
                    alt={title || 'Pré-visualização da foto de capa'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {photoMeta
                        ? `${photoMeta.fileName} (${photoMeta.width}×${photoMeta.height} · ${photoMeta.sizeKb} KB)`
                        : imageUrl.startsWith('data:image/')
                          ? `Foto enviada do dispositivo (${Math.max(1, Math.round(imageUrl.length / 1024))} KB)`
                          : 'Capa pronta na matéria'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className="inline-flex items-center gap-1 rounded-md bg-[#FF6600] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer disabled:opacity-60"
                      >
                        {photoUploading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        {photoUploading ? 'Enviando...' : 'Trocar Foto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setPhotoMeta(null);
                          setPhotoError(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2 py-1 text-[11px] text-zinc-200 hover:bg-black cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 p-4 text-center text-zinc-400 hover:bg-white/[0.03] cursor-pointer"
                >
                  {photoUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#FF6600]" />
                  ) : (
                    <Upload className="h-6 w-6 text-[#FF6600]" />
                  )}
                  <span className="text-xs font-medium text-zinc-200">
                    {photoUploading
                      ? 'Otimizando e carregando foto...'
                      : 'Clique para subir foto ou arraste a imagem aqui'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    JPG, PNG ou WebP · Otimização automática para publicação no Portal
                  </span>
                </button>
              )}
            </div>

            {photoError && (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {photoError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setImageUrl(preset.url);
                    setPhotoMeta(null);
                    setPhotoError(null);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] cursor-pointer ${
                    imageUrl === preset.url
                      ? 'border-[#FF6600] bg-[#FF6600]/15 text-[#FF6600]'
                      : 'border-white/10 bg-[#121215] text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {imageUrl.startsWith('data:image/') ? (
                <div className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 min-w-0">
                  <span className="truncate">
                    Foto local carregada{' '}
                    {photoMeta
                      ? `· ${photoMeta.fileName} (${photoMeta.sizeKb} KB)`
                      : `(${Math.max(1, Math.round(imageUrl.length / 1024))} KB)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setPhotoMeta(null);
                    }}
                    className="shrink-0 text-[11px] font-semibold text-zinc-200 underline hover:text-white cursor-pointer"
                  >
                    Colar URL
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setPhotoMeta(null);
                    setPhotoError(null);
                  }}
                  placeholder="Cole uma URL de imagem (https://...) ou clique em Foto"
                  className="flex-1 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                />
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6600]/40 bg-[#FF6600]/15 px-3 py-2 text-xs font-semibold text-[#FF6600] hover:bg-[#FF6600]/25 cursor-pointer shrink-0 disabled:opacity-60"
              >
                {photoUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {photoUploading ? 'Subindo...' : 'Subir Foto'}
              </button>
            </div>
          </div>

          {(editorError || apiSyncError) && (
            <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {editorError || apiSyncError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fa6607]/45 bg-[#fa6607]/10 px-4 py-2.5 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Pré-visualizar (Preview)
            </button>
            <button
              type="button"
              disabled={videoUploading || photoUploading}
              onClick={() => handleSaveArticle('approval_queue')}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5 text-[#D4AF37]" />
              {videoUploading ? 'Enviando Vídeo...' : 'Enviar p/ Redator-Chefe'}
            </button>
            <button
              type="button"
              disabled={videoUploading || photoUploading}
              onClick={() => handleSaveArticle('publish_now')}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {videoUploading ? 'Aguarde o Vídeo...' : 'Aprovar & Publicar no Site'}
            </button>
          </div>
        </section>

        {/* Lista & Mesa de Aprovação */}
        <section className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Matérias do Portal ({filteredArticles.length})
              </h2>
              <p className="text-[11px] text-zinc-400">
                {publishedCount} publicadas no ar · {awaitingCount} aguardando aprovação
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filtrar matérias por status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'Todas' | ChiefApprovalStatus)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] text-white"
              >
                <option value="Todas">Todos Status</option>
                <option value="Publicada no Site">Publicada no Site</option>
                <option value="Aguardando Redator-Chefe">Aguardando Redator-Chefe</option>
                <option value="Aprovada pelo Redator-Chefe">Aprovada (Fora do Ar)</option>
                <option value="Em Apuração">Em Apuração</option>
              </select>
              <select
                aria-label="Filtrar matérias por território"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value as 'Todas' | CimbajuCity)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] text-white"
              >
                <option value="Todas">Todas Regiões</option>
                {NEWS_TERRITORIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[760px] overflow-y-auto pr-1">
            {filteredArticles.map((art) => {
              const isPublished = art.approvalStatus === 'Publicada no Site';
              return (
                <div
                  key={art.id}
                  className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-3"
                >
                  <div className="flex gap-3 min-w-0">
                    {(() => {
                      const artIsVideo = isVideoArticle(art);
                      const artPoster = getArticlePosterUrl(art);
                      if (!artPoster && !artIsVideo) return null;
                      return (
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                          {artPoster ? (
                            <MediaFrame
                              src={artPoster}
                              alt={art.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-[#FF6600]">
                              <Film className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                          {artIsVideo && (
                            <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold text-[#FF6600]">
                              ▶ VÍDEO
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-semibold ${
                            isPublished ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {art.approvalStatus}
                        </span>
                        <span className="text-zinc-500">{art.city}</span>
                      </div>
                      <h3 className="mt-1 font-display text-sm font-bold text-white leading-snug break-words">
                        {art.title}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{art.summary}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <select
                      aria-label={`Selo da matéria ${art.title}`}
                      value={art.seal}
                      onChange={(e) => updatePautaSeal(art.id, e.target.value as NewsSeal)}
                      className="rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1 text-[11px] font-medium text-[#D4AF37]"
                    >
                      {NEWS_SEALS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => loadExistingIntoEditor(art)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenMarketingStudio(art.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#FF6600]/40 bg-[#FF6600]/10 px-2.5 py-1 text-[11px] font-medium text-[#FF6600] hover:bg-[#FF6600]/20 cursor-pointer"
                      >
                        <Palette className="h-3 w-3" />
                        Criar Arte
                      </button>

                      {isPublished ? (
                        <button
                          type="button"
                          onClick={() => unpublishPauta(art.id)}
                          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
                        >
                          Retirar do Ar
                        </button>
                      ) : art.approvalStatus === 'Aprovada pelo Redator-Chefe' ? (
                        <button
                          type="button"
                          onClick={() => {
                            publishPautaToSite(art.id);
                            flash(`"${art.title.slice(0, 35)}..." publicada no Portal FortNews!`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Publicar Agora
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            chiefEditorApprovePauta(art.id, chiefName, true);
                            flash(`Aprovada por ${chiefName} e publicada no Portal FortNews!`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#fa6607] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          Aprovar &amp; Publicar
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            deletePauta(art.id);
                            flash('Matéria removida pelo administrador.');
                          }}
                          aria-label={`Excluir matéria ${art.title}`}
                          className="inline-flex items-center rounded-lg border border-red-500/30 p-1 text-red-300 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Article Live Preview Modal (FortNews Layout) */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-white text-zinc-900 shadow-2xl">
            {/* FortNews Orange Header Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-orange-200 bg-[#fa6607] px-5 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white px-2.5 py-1 shadow-sm">
                  <FortNewsLogo onLightSurface className="h-7" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Pré-visualização da Matéria · Portal FortNews
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Fechar pré-visualização"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 text-white hover:bg-black/35 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <span className="rounded bg-[#fa6607] px-2.5 py-0.5 text-white">{seal}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-700">{city}</span>
                <span className="text-zinc-400">·</span>
                <span className="font-normal normal-case text-zinc-500">
                  {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h3
                id="article-preview-title"
                className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-zinc-950"
              >
                {title.trim() || 'Título da Manchete (preencha no editor)'}
              </h3>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 border-l-4 border-[#fa6607] pl-4">
                {summary.trim() || 'Resumo / linha-fina da reportagem exibida na capa do Portal FortNews.'}
              </p>

              <div className="text-xs text-zinc-500">
                Por <strong className="text-zinc-800">{reporter || 'Redação Portal FortNews'}</strong> ·
                Revisão Editorial: {chiefName}
              </div>

              {(mediaType === 'video' || Boolean(videoUrl.trim())) && videoUrl.trim() ? (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black aspect-video">
                  {getVideoEmbedUrl(videoUrl) ? (
                    <iframe
                      src={getVideoEmbedUrl(videoUrl) || undefined}
                      title={title || 'Pré-visualização do vídeo'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <ResolvedVideo
                      src={videoUrl}
                      poster={imageUrl || getYouTubeThumbnailUrl(videoUrl) || undefined}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
              ) : (
                imageUrl && (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 aspect-[16/9]">
                    <MediaFrame
                      src={imageUrl}
                      alt={title || 'Capa da matéria'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )
              )}

              <div className="space-y-3 text-sm leading-relaxed text-zinc-800">
                {(body.trim() || summary.trim() || 'Escreva o corpo completo da matéria no editor para visualizar os parágrafos formatados aqui.')
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((para, idx) => (
                    <p key={idx}>{para.trim()}</p>
                  ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  Voltar ao Editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    handleSaveArticle('publish_now');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Aprovar &amp; Publicar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
