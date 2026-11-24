import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Mic2,
  Newspaper,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Unlock,
  Upload,
  Video,
} from 'lucide-react';
import { OFFICIAL_BRAND_LOGOS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { aiApi } from '../../services/api';
import { MarketingArtPreset } from '../../types/fortmidia';
import { FortNewsVideoFrameStudio } from './FortNewsVideoFrameStudio';
import { PautaSearchPicker } from './PautaSearchPicker';
import {
  SocialCaptionStudio,
  buildEditorialSocialCopy,
  copyTextSafe,
  normalizeHashtagsString,
  stripEmojisClean,
  stripEmojisLive,
} from './SocialCaptionStudio';

interface MarketingStudioModuleProps {
  initialPautaId?: string | null;
}

type StudioMode = 'artes' | 'capas' | 'molduras' | 'convite' | 'legendas';
type FormatId =
  | 'feed_4_5'
  | 'square_1_1'
  | 'story_9_16'
  | 'portal_16_9'
  | 'youtube_16_9'
  | 'reels_9_16'
  | 'shorts_9_16';

type WatermarkPos =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'tiled';

type MaskMode = 'dark' | 'light' | 'custom';
type ArtFrameTemplate = 'classic' | 'fortnews_editorial';

const ALL_FORMAT_SPECS: Record<FormatId, { label: string; w: number; h: number }> = {
  feed_4_5: { label: 'Instagram Feed (1080×1350)', w: 1080, h: 1350 },
  square_1_1: { label: 'Feed Quadrado (1080×1080)', w: 1080, h: 1080 },
  story_9_16: { label: 'Stories / Vertical (1080×1920)', w: 1080, h: 1920 },
  portal_16_9: { label: 'Capa Portal / Link (1200×630)', w: 1200, h: 630 },
  youtube_16_9: { label: 'Capa YouTube / Live (1280×720)', w: 1280, h: 720 },
  reels_9_16: { label: 'Capa Instagram Reels (1080×1920)', w: 1080, h: 1920 },
  shorts_9_16: { label: 'Capa YouTube Shorts (1080×1920)', w: 1080, h: 1920 },
};

const MODE_FORMATS: Record<StudioMode, FormatId[]> = {
  artes: ['feed_4_5', 'square_1_1', 'story_9_16', 'portal_16_9'],
  capas: ['youtube_16_9', 'reels_9_16', 'shorts_9_16'],
  molduras: ['reels_9_16'],
  convite: ['feed_4_5', 'story_9_16', 'youtube_16_9'],
  legendas: ['feed_4_5'],
};

const BG_PRESETS = [
  { label: 'Estúdio Podcast', url: '/assets/aistudio/Microfone_dc305011.jpg' },
  { label: 'Outdoor Rodovia', url: '/assets/aistudio/outdoor_6fc8fbe7.jpg' },
  { label: 'Revista FortNews', url: '/assets/aistudio/Mockup_Revista_4c06e73a.jpg' },
  { label: 'Troféu Eventos', url: '/assets/aistudio/Mockup_Trofeu_fec05b30.jpg' },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
}

function isLightHexColor(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 175;
}

function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawEditorialFortNewsSeamBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  seamY: number,
  scale: number,
  accentColor: string
) {
  ctx.save();
  ctx.translate(cx, seamY);
  ctx.scale(scale, scale);

  // 1. Symmetric Audio Waveform above the badge (white left + accent right with contrast shadow)
  const halfHeights = [
    5, 9, 17, 11, 23, 15, 9, 20, 32, 16, 11, 28, 48, 26, 15, 20, 35, 22, 13, 25, 42, 22, 13, 19,
    29, 16, 10, 18,
  ];
  const barW = 3.8;
  const step = 8.4;
  const totalBars = halfHeights.length * 2 - 1;
  const waveStartX = -((totalBars - 1) * step) / 2;
  const waveCy = -92;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  for (let i = 0; i < totalBars; i++) {
    const mirrorIdx = i < halfHeights.length ? i : totalBars - 1 - i;
    const bh = halfHeights[mirrorIdx];
    const bx = waveStartX + i * step - barW / 2;
    const by = waveCy - bh / 2;
    ctx.fillStyle = i < halfHeights.length ? '#FFFFFF' : accentColor;
    drawRoundedPill(ctx, bx, by, barW, bh, 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Diagonal Split FortNews Badge (Orange left "Fort" + Metallic Grey right "News")
  const badgeW = 548;
  const badgeH = 110;
  const slant = 30;
  const leftX = -badgeW / 2;
  const midX = -20;
  const rightX = badgeW / 2;
  const topY = -62;
  const botY = topY + badgeH;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Left Orange Trapezoid
  ctx.beginPath();
  ctx.moveTo(leftX + slant, topY);
  ctx.lineTo(midX + slant * 0.55, topY);
  ctx.lineTo(midX - slant * 0.45, botY);
  ctx.lineTo(leftX, botY);
  ctx.closePath();
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Right Cool Grey Trapezoid (matching Padrão de Notícias FortNews reference)
  ctx.beginPath();
  ctx.moveTo(midX + slant * 0.55, topY);
  ctx.lineTo(rightX, topY);
  ctx.lineTo(rightX - slant, botY);
  ctx.lineTo(midX - slant * 0.45, botY);
  ctx.closePath();
  ctx.fillStyle = '#9EA2A8';
  ctx.fill();
  ctx.restore();

  // Wordmark: "Fort" (Black on Orange) & "News" (Orange on Grey)
  ctx.font = '900 72px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#050507';
  ctx.textAlign = 'right';
  ctx.fillText('Fort', midX - 8, topY + 48);

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText('News', midX + 16, topY + 48);

  // Subtitle split: "INFORMAÇÃO" (black) + "QUE CONECTA VOCÊ" (white)
  ctx.font = '800 16px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.fillStyle = '#050507';
  ctx.textAlign = 'right';
  ctx.fillText('I N F O R M A Ç Ã O', midX - 16, botY - 14);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText('Q U E   C O N E C T A   V O C Ê', midX + 6, botY - 14);

  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        allLines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) allLines.push(line);
  }
  return allLines;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCircularPortrait(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
  borderColor: string,
  fallbackInitial: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#18181B';
  ctx.fill();
  ctx.clip();

  if (img) {
    const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = '#27272A';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(radius * 0.7)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackInitial.slice(0, 2).toUpperCase(), cx, cy);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 7;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
  ctx.restore();
}

export const MarketingStudioModule: React.FC<MarketingStudioModuleProps> = ({
  initialPautaId,
}) => {
  const {
    pautas,
    newsPortalSettings,
    siteSettings,
    marketingPresets,
    marketingPresetsLocked,
    saveMarketingPreset,
    deleteMarketingPreset,
    setMarketingPresetsLocked,
    teamMembers,
    activeAdminUserId,
    podcastShows,
  } = useFortMidia();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;

  const [studioMode, setStudioMode] = useState<StudioMode>('artes');
  const [selectedPautaId, setSelectedPautaId] = useState<string>(initialPautaId || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    marketingPresets[0]?.id || 'preset-fortnews'
  );
  const [brandPreset, setBrandPreset] = useState<'fortnews' | 'fortmidia' | 'podcast' | 'custom'>(
    'fortnews'
  );
  const [formatId, setFormatId] = useState<FormatId>('feed_4_5');
  const [artFrameTemplate, setArtFrameTemplate] = useState<ArtFrameTemplate>('classic');
  const [editorialLogoScale, setEditorialLogoScale] = useState<number>(100);
  const [editorialFooterSlogan, setEditorialFooterSlogan] = useState<string>(
    'Informação que conecta você'
  );
  const [newPresetName, setNewPresetName] = useState('');
  const [showNewPresetInput, setShowNewPresetInput] = useState(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  const activePresetObj = marketingPresets.find((p) => p.id === selectedPresetId);
  const presetLockedForOperator =
    (marketingPresetsLocked || Boolean(activePresetObj?.lockedBySuperAdmin)) && !isSuperAdmin;

  // Background, Photo & Contrast Mask (Escura, Máscara Branca, Personalizada)
  const [bgImageUrl, setBgImageUrl] = useState('/assets/aistudio/Microfone_dc305011.jpg');
  const [bgColor, setBgColor] = useState('#0D0D10');
  const [maskMode, setMaskMode] = useState<MaskMode>('dark');
  const [maskCustomColor, setMaskCustomColor] = useState('#FFFFFF');
  const [maskStyle, setMaskStyle] = useState<'gradient' | 'solid'>('gradient');
  const [scrimOpacity, setScrimOpacity] = useState(74);
  const [photoZoom, setPhotoZoom] = useState(105);

  // Badge, Location & Headline
  const [showBadge, setShowBadge] = useState(true);
  const [badgeText, setBadgeText] = useState('PLANTÃO REGIONAL');
  const [badgeBgColor, setBadgeBgColor] = useState('#fa6607');
  const [badgeTextColor, setBadgeTextColor] = useState('#FFFFFF');

  const [showCity, setShowCity] = useState(true);
  const [cityText, setCityText] = useState('CIMBAJU · SÃO PAULO');

  const [headlineText, setHeadlineText] = useState(
    'Obras de mobilidade e novo corredor econômico transformam o fluxo no CIMBAJU'
  );
  const [headlineSize, setHeadlineSize] = useState(56);
  const [headlineColor, setHeadlineColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');

  // Subtitle / Supporting Text
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [subtitleText, setSubtitleText] = useState(
    'Acompanhe a cobertura completa em tempo real nas redes oficiais e no Portal Jornal FortNews.'
  );
  const [subtitleSize, setSubtitleSize] = useState(30);
  const [subtitleColor, setSubtitleColor] = useState('#E4E4E7');

  // Graphic Lines & Borders
  const [showTopBar, setShowTopBar] = useState(true);
  const [topBarColor, setTopBarColor] = useState('#fa6607');
  const [topBarThickness, setTopBarThickness] = useState(14);

  const [showDividerLine, setShowDividerLine] = useState(true);
  const [dividerColor, setDividerColor] = useState('#FF6600');
  const [dividerThickness, setDividerThickness] = useState(5);
  const [dividerWidthPct, setDividerWidthPct] = useState(28);

  const [showFooterBar, setShowFooterBar] = useState(true);
  const [footerBarColor, setFooterBarColor] = useState('#141418');
  const [footerAccentColor, setFooterAccentColor] = useState('#FF6600');
  const [footerText, setFooterText] = useState('Leia mais em jornalfortnews.com.br');

  const [showOuterBorder, setShowOuterBorder] = useState(false);
  const [outerBorderColor, setOuterBorderColor] = useState('#D4AF37');
  const [outerBorderThickness, setOuterBorderThickness] = useState(8);

  // Watermark 100% Editable
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkType, setWatermarkType] = useState<'text' | 'logo'>('logo');
  const [watermarkText, setWatermarkText] = useState('@jornalfortnews');
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState(
    newsPortalSettings.logoUrl || OFFICIAL_BRAND_LOGOS[2].url
  );
  const [watermarkPos, setWatermarkPos] = useState<WatermarkPos>('top-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(85);
  const [watermarkScale, setWatermarkScale] = useState(100);

  // Video Cover Controls (Capas Reels, Shorts & YouTube)
  const [showPlayIcon, setShowPlayIcon] = useState(true);
  const [videoDurationTag, setVideoDurationTag] = useState('AO VIVO · 4K');
  const [coverEpisodeTag, setCoverEpisodeTag] = useState('EPISÓDIO COMPLETO NO AR');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('');
  const [uploadedVideoDuration, setUploadedVideoDuration] = useState<string>('');
  const [capasPreviewView, setCapasPreviewView] = useState<'canvas' | 'video'>('canvas');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (uploadedVideoUrl && uploadedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
    };
  }, [uploadedVideoUrl]);

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(objectUrl);
    setUploadedVideoName(file.name);
    setUploadedVideoDuration('');
    setCapasPreviewView('video');
    setPresetNotice(`Vídeo "${file.name}" carregado! Avance até o melhor frame e clique em "Usar Frame na Capa".`);
    window.setTimeout(() => setPresetNotice(null), 4500);
    e.target.value = '';
  };

  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid || !Number.isFinite(vid.duration) || vid.duration <= 0) return;
    const totalSec = Math.floor(vid.duration);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    setUploadedVideoDuration(formatted);
    setVideoDurationTag(`${formatted} · HD`);
  };

  const handleCaptureVideoFrame = () => {
    const vid = videoRef.current;
    if (!vid || vid.videoWidth === 0 || vid.videoHeight === 0) {
      setPresetNotice('Aguarde o vídeo carregar ou dê play por 1 segundo antes de capturar o frame.');
      window.setTimeout(() => setPresetNotice(null), 3500);
      return;
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = vid.videoWidth;
    offscreen.height = vid.videoHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(vid, 0, 0, offscreen.width, offscreen.height);
    try {
      const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);
      setBgImageUrl(dataUrl);
      setCapasPreviewView('canvas');
      setPresetNotice('Frame do vídeo capturado e aplicado como imagem de fundo da capa!');
      window.setTimeout(() => setPresetNotice(null), 3500);
    } catch {
      setPresetNotice('Não foi possível capturar o frame deste formato de vídeo.');
      window.setTimeout(() => setPresetNotice(null), 3500);
    }
  };

  const handleClearUploadedVideo = () => {
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    setUploadedVideoUrl(null);
    setUploadedVideoName('');
    setUploadedVideoDuration('');
    setCapasPreviewView('canvas');
  };

  // Podcast Invite Controls (Convites Podcast & IA Thumbnail)
  const [selectedPodcastId, setSelectedPodcastId] = useState(podcastShows[0]?.id || 'pod-01');
  const [programName, setProgramName] = useState(podcastShows[0]?.title || 'Podcast FortNews');
  const [programLogoUrl, setProgramLogoUrl] = useState(
    podcastShows[0]?.programLogoUrl || OFFICIAL_BRAND_LOGOS[0].url
  );
  const [guestName, setGuestName] = useState('Dr. Henrique Tavares');
  const [guestRole, setGuestRole] = useState('Empresário & Liderança Regional');
  const [guestPhotoUrl, setGuestPhotoUrl] = useState(
    '/assets/aistudio/Mockup_Revista_4c06e73a.jpg'
  );
  const [hostName, setHostName] = useState(podcastShows[0]?.host || 'Emerson Carneiro');
  const [hostPhotoUrl, setHostPhotoUrl] = useState(
    podcastShows[0]?.hostAvatarUrl ||
      '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png'
  );
  const [inviteDate, setInviteDate] = useState('QUINTA · 21 NOV');
  const [inviteTime, setInviteTime] = useState('17H00 AO VIVO');
  const [inviteChannel, setInviteChannel] = useState('YouTube FortNews & @jornalfortnews');
  const [guestPhotoScale, setGuestPhotoScale] = useState(100);
  const [hostPhotoScale, setHostPhotoScale] = useState(100);
  const [programLogoScale, setProgramLogoScale] = useState(100);

  // AI Thumbnail Generation State
  const [aiThumbPrompt, setAiThumbPrompt] = useState(
    'Estúdio moderno de podcast jornalístico com iluminação laranja e dourada, microfones profissionais e profundidade cinematográfica'
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<{
    message: string;
    code?: string;
    billingUrl?: string;
  } | null>(null);

  // Social Post Caption (Sempre Sem Emojis)
  const [socialCaption, setSocialCaption] = useState(
    'Acompanhe todos os detalhes da reportagem regional no Portal Jornal FortNews.'
  );
  const [hashtags, setHashtags] = useState(
    '#JornalFortNews #GrupoFortMidia #CIMBAJU #FrancoDaRocha #Caieiras'
  );
  const [copiedType, setCopiedType] = useState<'all' | 'caption' | 'hashtags' | null>(null);
  const [quickCaptionGenerating, setQuickCaptionGenerating] = useState(false);
  const [quickCaptionError, setQuickCaptionError] = useState<string | null>(null);
  const [captionSyncTick, setCaptionSyncTick] = useState(0);
  const [lastVisualMode, setLastVisualMode] = useState<Exclude<StudioMode, 'legendas'>>('artes');
  const [editorTab, setEditorTab] = useState<'textos' | 'linhas' | 'marca'>('textos');

  const handleSwitchStudioMode = (mode: StudioMode) => {
    if (mode !== 'legendas') {
      setLastVisualMode(mode);
    }
    setStudioMode(mode);
    const validFormats = MODE_FORMATS[mode];
    if (mode !== 'legendas' && !validFormats.includes(formatId)) {
      setFormatId(validFormats[0]);
    }
    if (mode === 'capas') {
      setBadgeText('REELS & YOUTUBE');
      setShowPlayIcon(true);
    } else if (mode === 'convite') {
      setBgImageUrl('/assets/aistudio/Microfone_dc305011.jpg');
      setBadgeText('CONVITE OFICIAL · PODCAST');
    }
  };

  const handleOpenCaptionStudioFromArt = () => {
    if (studioMode !== 'legendas') {
      setLastVisualMode(studioMode);
    }
    setCaptionSyncTick((n) => n + 1);
    setStudioMode('legendas');
  };

  const applyMaskPreset = (mode: MaskMode) => {
    setMaskMode(mode);
    if (mode === 'light') {
      setHeadlineColor('#111114');
      setSubtitleColor('#27272A');
      setScrimOpacity(78);
    } else if (mode === 'dark') {
      setHeadlineColor('#FFFFFF');
      setSubtitleColor('#E4E4E7');
      setScrimOpacity(74);
    }
  };

  const handleGenerateAiThumbnail = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const spec = ALL_FORMAT_SPECS[formatId];
      const aspectRatio =
        spec.w > spec.h ? '16:9' : spec.w === spec.h ? '1:1' : '9:16';

      const res = await aiApi.generateThumbnail<{
        imageUrl?: string;
        error?: string;
        code?: string;
        billingUrl?: string;
      }>({
        prompt: aiThumbPrompt,
        programName: studioMode === 'convite' ? programName : headlineText,
        guestName: studioMode === 'convite' ? guestName : undefined,
        hostName: studioMode === 'convite' ? hostName : undefined,
        aspectRatio,
      });
      if (!res.ok || !res.data?.imageUrl) {
        setAiError({
          message: res.error || 'Não foi possível gerar a thumbnail por IA.',
          code: res.code,
          billingUrl: res.billingUrl,
        });
        return;
      }
      setBgImageUrl(res.data.imageUrl);
      setPhotoZoom(102);
    } catch {
      setAiError({
        message: 'Erro de conexão com o servidor de geração de imagem IA.',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const applyArticleToArt = (pautaId: string) => {
    setSelectedPautaId(pautaId);
    const art = pautas.find((p) => p.id === pautaId);
    if (!art) return;
    setBadgeText(art.seal.toUpperCase());
    setCityText(art.city.toUpperCase());
    setHeadlineText(art.socialCreative?.headlineOverlay || art.title);
    setSubtitleText(art.summary);
    if (art.imageUrl) setBgImageUrl(art.imageUrl);
    setFooterText(
      art.socialCreative?.storyCta || `Leia completo em ${newsPortalSettings.domain}`
    );
    setSocialCaption(
      stripEmojisClean(
        art.socialCreative?.instagramCaption ||
          `${art.title}\n\n${art.summary}\n\nLeia completo: ${siteSettings.newsPortalUrl}`
      )
    );
    if (art.socialCreative?.hashtags) {
      setHashtags(normalizeHashtagsString(art.socialCreative.hashtags));
    }
  };

  useEffect(() => {
    if (initialPautaId) {
      applyArticleToArt(initialPautaId);
    }
  }, [initialPautaId]);

  const flashPresetNotice = (msg: string) => {
    setPresetNotice(msg);
    window.setTimeout(() => setPresetNotice(null), 3500);
  };

  const applySavedPreset = (preset: MarketingArtPreset) => {
    setSelectedPresetId(preset.id);
    if (preset.id === 'preset-fortnews') setBrandPreset('fortnews');
    else if (preset.id === 'preset-fortmidia') setBrandPreset('fortmidia');
    else if (preset.id === 'preset-podcast') setBrandPreset('podcast');
    else setBrandPreset('custom');

    setBadgeBgColor(preset.badgeBgColor);
    setBadgeTextColor(preset.badgeTextColor);
    if (preset.badgeText) setBadgeText(preset.badgeText);
    setTopBarColor(preset.topBarColor);
    setTopBarThickness(preset.topBarThickness);
    setShowTopBar(preset.showTopBar);
    setDividerColor(preset.dividerColor);
    setDividerThickness(preset.dividerThickness);
    setDividerWidthPct(preset.dividerWidthPct);
    setShowDividerLine(preset.showDividerLine);
    setFooterBarColor(preset.footerBarColor);
    setFooterAccentColor(preset.footerAccentColor);
    setFooterText(preset.footerText);
    setShowFooterBar(preset.showFooterBar);
    setShowOuterBorder(preset.showOuterBorder);
    setOuterBorderColor(preset.outerBorderColor);
    setOuterBorderThickness(preset.outerBorderThickness);
    setWatermarkEnabled(preset.watermarkEnabled);
    setWatermarkType(preset.watermarkType);
    setWatermarkText(preset.watermarkText);
    setWatermarkLogoUrl(preset.watermarkLogoUrl);
    setWatermarkPos(preset.watermarkPos);
    setWatermarkOpacity(preset.watermarkOpacity);
    setWatermarkScale(preset.watermarkScale);
    setMaskMode(preset.maskMode);
    setMaskCustomColor(preset.maskCustomColor);
    setMaskStyle(preset.maskStyle);
    setScrimOpacity(preset.scrimOpacity);
    setHeadlineSize(preset.headlineSize);
    setHeadlineColor(preset.headlineColor);
    setSubtitleSize(preset.subtitleSize);
    setSubtitleColor(preset.subtitleColor);
    setTextAlign(preset.textAlign);
    setGuestPhotoScale(preset.guestPhotoScale || 100);
    setHostPhotoScale(preset.hostPhotoScale || 100);
    if (preset.programLogoUrl) setProgramLogoUrl(preset.programLogoUrl);
    if (preset.bgImageUrl) setBgImageUrl(preset.bgImageUrl);
    if (preset.artFrameTemplate) setArtFrameTemplate(preset.artFrameTemplate);
    if (preset.editorialLogoScale) setEditorialLogoScale(preset.editorialLogoScale);
    if (preset.editorialFooterSlogan) setEditorialFooterSlogan(preset.editorialFooterSlogan);
    flashPresetNotice(`Preset "${preset.name}" aplicado.`);
  };

  const handleSavePreset = (asNew = false) => {
    if (!isSuperAdmin) return;
    const existing = marketingPresets.find((p) => p.id === selectedPresetId);
    const name = asNew
      ? newPresetName.trim() || `Preset Personalizado ${marketingPresets.length + 1}`
      : existing?.name || 'Padrão Oficial FortMídia';
    const id = asNew || !existing ? `preset-${Date.now()}` : existing.id;

    const payload: MarketingArtPreset = {
      id,
      name,
      accentColor: topBarColor,
      badgeText,
      badgeBgColor,
      badgeTextColor,
      topBarColor,
      topBarThickness,
      showTopBar,
      dividerColor,
      dividerThickness,
      dividerWidthPct,
      showDividerLine,
      footerBarColor,
      footerAccentColor,
      footerText,
      showFooterBar,
      showOuterBorder,
      outerBorderColor,
      outerBorderThickness,
      watermarkEnabled,
      watermarkType,
      watermarkText,
      watermarkLogoUrl,
      watermarkPos,
      watermarkOpacity,
      watermarkScale,
      maskMode,
      maskCustomColor,
      maskStyle,
      scrimOpacity,
      headlineSize,
      headlineColor,
      subtitleSize,
      subtitleColor,
      textAlign,
      guestPhotoScale,
      hostPhotoScale,
      programLogoUrl,
      bgImageUrl: studioMode === 'convite' ? bgImageUrl : existing?.bgImageUrl,
      artFrameTemplate,
      editorialLogoScale,
      editorialFooterSlogan,
      lockedBySuperAdmin: marketingPresetsLocked,
      updatedBy: activeOperator?.name || 'Super Admin',
      updatedAt: `${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };

    if (saveMarketingPreset(payload)) {
      setSelectedPresetId(payload.id);
      setNewPresetName('');
      setShowNewPresetInput(false);
      flashPresetNotice(`Preset "${payload.name}" salvo pelo Super Admin.`);
    }
  };

  const applyPodcastShow = (podId: string) => {
    setSelectedPodcastId(podId);
    const show = podcastShows.find((s) => s.id === podId);
    if (!show) return;
    setProgramName(show.title);
    setHostName(show.host);
    if (show.hostAvatarUrl) {
      setHostPhotoUrl(show.hostAvatarUrl);
    }
    if (show.programLogoUrl) {
      setProgramLogoUrl(show.programLogoUrl);
    }
    setInviteDate(show.daySlot.split('·')[0]?.trim() || 'SEMANAL');
    setInviteTime(show.daySlot.split('·')[1]?.trim() || '16H00 AO VIVO');
    setHeadlineText(show.episodeTitle);
  };

  // Real-time 1:1 WYSIWYG Canvas Render across all 3 studio tabs
  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const spec = ALL_FORMAT_SPECS[formatId];
      canvas.width = spec.w;
      canvas.height = spec.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = spec.w;
      const H = spec.h;
      const isCompactH = H < 800;
      const padX = Math.round(W * 0.068);

      // ==================== MOLDURA EDITORIAL FORTNEWS (NOTÍCIA ESTÁTICA) ====================
      if (studioMode === 'artes' && artFrameTemplate === 'fortnews_editorial') {
        const bgImg = await loadImg(bgImageUrl);
        if (cancelled) return;

        const accent = topBarColor || '#fa6607';
        const topAccentH = showTopBar ? Math.max(16, Math.round(H * 0.0155)) : 0;
        const footerBarH = showFooterBar ? Math.round(H * (isCompactH ? 0.095 : 0.062)) : 0;
        const photoH = Math.round(H * (isCompactH ? 0.45 : H >= 1600 ? 0.48 : 0.54));
        const photoY = topAccentH;
        const photoBottomY = photoY + photoH;

        // 1. Clean Editorial Off-White Canvas
        ctx.fillStyle = '#F7F7F9';
        ctx.fillRect(0, 0, W, H);

        // 2. Top Solid Orange Bar
        if (topAccentH > 0) {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, W, topAccentH);
        }

        // 3. Top Full-Bleed Photo Viewport with Zoom + Bottom Warm Orange Fade
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, photoY, W, photoH);
        ctx.clip();

        ctx.fillStyle = '#18181B';
        ctx.fillRect(0, photoY, W, photoH);

        if (bgImg) {
          const scale = Math.max(W / bgImg.width, photoH / bgImg.height) * (photoZoom / 100);
          const dw = bgImg.width * scale;
          const dh = bgImg.height * scale;
          const dx = (W - dw) / 2;
          const dy = photoY + (photoH - dh) / 2;
          ctx.drawImage(bgImg, dx, dy, dw, dh);
        }

        // Bottom warm orange gradient fade matching Padrão de Notícias FortNews
        const fadeH = Math.round(photoH * 0.25);
        const fadeGrad = ctx.createLinearGradient(0, photoBottomY - fadeH, 0, photoBottomY);
        fadeGrad.addColorStop(0, hexToRgba(accent, 0));
        fadeGrad.addColorStop(0.55, hexToRgba(accent, 0.62));
        fadeGrad.addColorStop(1, hexToRgba(accent, 0.96));
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, photoBottomY - fadeH, W, fadeH);
        ctx.restore();

        // 4. Centered FortNews Waveform + Diagonal Orange/Grey Badge straddling the photo seam
        const baseBadgeScale = (W / 1080) * (isCompactH ? 0.72 : 1) * (editorialLogoScale / 100);
        drawEditorialFortNewsSeamBadge(ctx, W / 2, photoBottomY, baseBadgeScale, accent);

        // 5. White Card Editorial Content (City + Category Pill + Bold Uppercase Headline + Lead)
        const edPadX = Math.round(W * 0.056);
        const maxTextW = W - edPadX * 2;
        const badgeOverhang = Math.round(52 * baseBadgeScale);
        let cursorY = photoBottomY + badgeOverhang + Math.round(H * (isCompactH ? 0.025 : 0.036));
        const contentMaxY = H - footerBarH - Math.round(H * 0.022);

        // City + Orange Category Pill Row
        if (showCity || showBadge) {
          const metaFontPx = Math.round((isCompactH ? 24 : 33) * (W / 1080));
          const pillH = Math.round(metaFontPx * 1.72);
          let rowX = edPadX;

          if (showCity && cityText.trim()) {
            const cleanCity = cityText.trim().split('·')[0].trim().toUpperCase();
            ctx.fillStyle = '#09090B';
            ctx.font = `900 ${metaFontPx}px "Plus Jakarta Sans", Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(cleanCity, rowX, cursorY + pillH / 2);
            rowX += ctx.measureText(cleanCity).width + Math.round(24 * (W / 1080));
          }

          if (showBadge && badgeText.trim()) {
            const catLabel = badgeText.trim().toUpperCase();
            ctx.font = `900 ${Math.round(metaFontPx * 0.96)}px "Plus Jakarta Sans", Inter, sans-serif`;
            const pillTextW = ctx.measureText(catLabel).width;
            const pillW = Math.min(W - edPadX - rowX - 18, pillTextW + Math.round(44 * (W / 1080)));
            const pillRadius = Math.round(pillH * 0.34);

            // Subtle stacked right accent cap matching official FortNews reference
            ctx.fillStyle = hexToRgba(badgeBgColor || accent, 0.88);
            drawRoundedPill(ctx, rowX + 16, cursorY + 2, pillW, pillH - 4, pillRadius);
            ctx.fill();

            ctx.fillStyle = badgeBgColor || accent;
            drawRoundedPill(ctx, rowX, cursorY, pillW, pillH, pillRadius);
            ctx.fill();

            ctx.fillStyle = badgeTextColor || '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(catLabel, rowX + pillW / 2, cursorY + pillH / 2 + 1, pillW - 24);
          }

          cursorY += pillH + Math.round(H * (isCompactH ? 0.022 : 0.028));
        }

        // Bold Uppercase Editorial Headline (auto-contrasted dark ink on white card)
        const headInk = isLightHexColor(headlineColor) ? '#09090B' : headlineColor;
        const headPx = Math.round(
          (isCompactH ? headlineSize * 0.62 : headlineSize * 0.92) * (W / 1080)
        );
        ctx.fillStyle = headInk;
        ctx.font = `900 ${headPx}px "Plus Jakarta Sans", Inter, sans-serif`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'top';
        const anchorX = textAlign === 'center' ? W / 2 : edPadX;

        const headLines = wrapLines(
          ctx,
          (headlineText || 'MANCHETE FORTNEWS').toUpperCase(),
          maxTextW
        ).slice(0, isCompactH ? 2 : 4);
        const headLineH = Math.round(headPx * 1.13);
        for (const line of headLines) {
          if (cursorY + headLineH > contentMaxY) break;
          ctx.fillText(line, anchorX, cursorY);
          cursorY += headLineH;
        }

        // Clean Regular Editorial Lead / Summary
        if (showSubtitle && subtitleText.trim() && cursorY + 28 < contentMaxY) {
          cursorY += Math.round(H * (isCompactH ? 0.016 : 0.018));
          const subInk = isLightHexColor(subtitleColor) ? '#18181B' : subtitleColor;
          const subPx = Math.round(
            (isCompactH ? subtitleSize * 0.72 : Math.max(30, subtitleSize * 1.12)) * (W / 1080)
          );
          ctx.fillStyle = subInk;
          ctx.font = `500 ${subPx}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
          ctx.textAlign = textAlign;
          ctx.textBaseline = 'top';
          const subLineH = Math.round(subPx * 1.32);
          const remainingH = contentMaxY - cursorY;
          const maxSubLines = Math.max(1, Math.floor(remainingH / subLineH));
          const subLines = wrapLines(ctx, subtitleText, maxTextW).slice(0, maxSubLines);
          for (const line of subLines) {
            ctx.fillText(line, anchorX, cursorY);
            cursorY += subLineH;
          }
        }

        // 6. Official Diagonal Split Footer Bar (Orange Slanted URL Left + White Slogan Right)
        if (showFooterBar && footerBarH > 0) {
          const fy = H - footerBarH;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, fy, W, footerBarH);

          // Thin orange top & bottom rules on the white right side
          ctx.fillStyle = accent;
          ctx.fillRect(0, fy, W, 3);
          ctx.fillRect(0, H - 5, W, 5);

          // Slanted orange left trapezoid
          const topSplitX = Math.round(W * 0.465);
          const botSplitX = Math.round(W * 0.51);
          ctx.beginPath();
          ctx.moveTo(0, fy);
          ctx.lineTo(topSplitX, fy);
          ctx.quadraticCurveTo(topSplitX + 16, fy, topSplitX + 26, fy + 24);
          ctx.lineTo(botSplitX, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fillStyle = accent;
          ctx.fill();

          // Portal URL inside orange trapezoid
          const cleanPortal = (footerText || newsPortalSettings.domain || 'www.jornalfortnews.com.br')
            .replace(/^leia\s+(mais|completo)\s+em\s+/i, '')
            .trim();
          const displayDomain = cleanPortal.startsWith('www.') || cleanPortal.includes(' ')
            ? cleanPortal
            : `www.${cleanPortal}`;
          const footerFontPx = Math.round((isCompactH ? 22 : 30) * (W / 1080));
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `600 ${footerFontPx}px "Plus Jakarta Sans", Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayDomain, topSplitX / 2 + 8, fy + footerBarH / 2 + 1, topSplitX - 36);

          // Two-tone slogan on right white area ("Informação que" black + "conecta você" grey)
          const rawSlogan = (editorialFooterSlogan || 'Informação que conecta você').trim();
          const sWords = rawSlogan.split(/\s+/);
          const splitAt = sWords.length >= 3 ? Math.ceil(sWords.length / 2) : 1;
          const part1 = sWords.slice(0, splitAt).join(' ') + (sWords.length > 1 ? ' ' : '');
          const part2 = sWords.slice(splitAt).join(' ');

          ctx.font = `500 ${footerFontPx}px "Plus Jakarta Sans", Inter, sans-serif`;
          const w1 = ctx.measureText(part1).width;
          const w2 = ctx.measureText(part2).width;
          const totalW = w1 + w2;
          const rightCenter = botSplitX + (W - botSplitX) / 2 - 4;
          const startX = Math.max(botSplitX + 14, rightCenter - totalW / 2);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#09090B';
          ctx.fillText(part1, startX, fy + footerBarH / 2 + 1);
          if (part2) {
            ctx.fillStyle = '#9CA3AF';
            ctx.fillText(part2, startX + w1, fy + footerBarH / 2 + 1);
          }
        }

        // Optional Outer Border
        if (showOuterBorder && outerBorderThickness > 0) {
          ctx.strokeStyle = outerBorderColor;
          ctx.lineWidth = outerBorderThickness;
          ctx.strokeRect(
            outerBorderThickness / 2,
            outerBorderThickness / 2,
            W - outerBorderThickness,
            H - outerBorderThickness
          );
        }

        return;
      }

      // 1. Base Fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // 2. Background Image with Zoom
      const bgImg = await loadImg(bgImageUrl);
      if (cancelled) return;
      if (bgImg) {
        const scale = Math.max(W / bgImg.width, H / bgImg.height) * (photoZoom / 100);
        const dw = bgImg.width * scale;
        const dh = bgImg.height * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
      }

      // 3. Contrast Mask (Escura, Máscara Branca ou Personalizada)
      const maskHex =
        maskMode === 'light'
          ? '#FFFFFF'
          : maskMode === 'custom'
            ? maskCustomColor
            : '#0A0A0C';
      const alphaStrong = Math.min(0.95, Math.max(0.1, scrimOpacity / 100));

      if (maskStyle === 'solid') {
        ctx.fillStyle = hexToRgba(maskHex, alphaStrong);
        ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, hexToRgba(maskHex, alphaStrong * 0.35));
        grad.addColorStop(0.45, hexToRgba(maskHex, alphaStrong * 0.72));
        grad.addColorStop(1, hexToRgba(maskHex, Math.min(0.96, alphaStrong + 0.16)));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 4. Top Accent Bar
      if (showTopBar && topBarThickness > 0) {
        ctx.fillStyle = topBarColor;
        ctx.fillRect(0, 0, W, topBarThickness);
      }

      // 5. Outer Border
      if (showOuterBorder && outerBorderThickness > 0) {
        ctx.strokeStyle = outerBorderColor;
        ctx.lineWidth = outerBorderThickness;
        ctx.strokeRect(
          outerBorderThickness / 2,
          outerBorderThickness / 2,
          W - outerBorderThickness,
          H - outerBorderThickness
        );
      }

      const footerH = showFooterBar ? (isCompactH ? 84 : 112) : 0;

      // ==================== MODE: CONVITE PODCAST ====================
      if (studioMode === 'convite') {
        const [guestImg, hostImg, progLogo] = await Promise.all([
          loadImg(guestPhotoUrl),
          loadImg(hostPhotoUrl),
          loadImg(programLogoUrl),
        ]);
        if (cancelled) return;

        const isLightText = maskMode === 'light';
        const titleInk = isLightText ? '#111114' : headlineColor;
        const subInk = isLightText ? '#27272A' : subtitleColor;

        // Top Program Logo + Invite Tag
        let topY = (showTopBar ? topBarThickness : 0) + (isCompactH ? 34 : 58);
        if (progLogo) {
          const logoH = Math.round((isCompactH ? 74 : 96) * (programLogoScale / 100));
          const ratio = progLogo.width / Math.max(1, progLogo.height);
          const logoW = Math.round(logoH * Math.min(2.6, Math.max(0.85, ratio)));
          ctx.drawImage(progLogo, padX, topY, logoW, logoH);
        }

        // Badge on top right
        ctx.fillStyle = badgeBgColor;
        const invLabel = 'CONVITE OFICIAL PODCAST';
        ctx.font = `800 ${isCompactH ? 18 : 22}px Inter, sans-serif`;
        const bw = ctx.measureText(invLabel).width + 36;
        ctx.fillRect(W - padX - bw, topY + 12, bw, isCompactH ? 40 : 48);
        ctx.fillStyle = badgeTextColor;
        ctx.textAlign = 'left';
        ctx.fillText(invLabel, W - padX - bw + 18, topY + (isCompactH ? 38 : 43));

        // Program Name
        const progY = topY + (isCompactH ? 105 : 138);
        ctx.fillStyle = '#FF6600';
        ctx.font = `800 ${isCompactH ? 24 : 32}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(programName.toUpperCase(), W / 2, progY);

        // Portraits: Guest & Host with editable sizes & collision-safe spacing
        const baseGuestR = isCompactH ? 115 : 168;
        const baseHostR = isCompactH ? 88 : 122;
        let guestR = Math.round(baseGuestR * (guestPhotoScale / 100));
        let hostR = Math.round(baseHostR * (hostPhotoScale / 100));

        const maxCombinedDiameter = W - padX * 2 - 44;
        if (2 * (guestR + hostR) > maxCombinedDiameter) {
          const shrink = maxCombinedDiameter / (2 * (guestR + hostR));
          guestR = Math.round(guestR * shrink);
          hostR = Math.round(hostR * shrink);
        }

        const centerY = isCompactH
          ? Math.max(progY + guestR + 18, H * 0.46)
          : Math.max(progY + guestR + 28, H * 0.38);

        const minGuestCx = padX + guestR + 6;
        const maxHostCx = W - padX - hostR - 6;
        const guestCx = Math.max(minGuestCx, Math.min(W * 0.34, W / 2 - guestR - 18));
        const hostCx = Math.min(maxHostCx, Math.max(W * 0.69, guestCx + guestR + hostR + 26));

        drawCircularPortrait(ctx, guestImg, guestCx, centerY, guestR, '#FF6600', guestName);
        drawCircularPortrait(ctx, hostImg, hostCx, centerY + 14, hostR, '#D4AF37', hostName);

        // Nameplates below portraits
        ctx.textAlign = 'center';
        ctx.fillStyle = titleInk;
        ctx.font = `800 ${isCompactH ? 26 : 34}px "Plus Jakarta Sans", Inter, sans-serif`;
        ctx.fillText(guestName, guestCx, centerY + guestR + (isCompactH ? 34 : 46));
        ctx.fillStyle = subInk;
        ctx.font = `500 ${isCompactH ? 18 : 24}px Inter, sans-serif`;
        ctx.fillText(guestRole, guestCx, centerY + guestR + (isCompactH ? 60 : 78));

        ctx.fillStyle = '#D4AF37';
        ctx.font = `700 ${isCompactH ? 20 : 26}px Inter, sans-serif`;
        ctx.fillText(`Host: ${hostName}`, hostCx, centerY + 14 + hostR + (isCompactH ? 32 : 42));

        // Topic Headline & Date/Time Box
        const infoY = isCompactH ? H - footerH - 125 : H - footerH - 280;
        if (!isCompactH) {
          ctx.fillStyle = titleInk;
          ctx.font = `800 ${Math.min(44, headlineSize)}px "Plus Jakarta Sans", Inter, sans-serif`;
          const topicLines = wrapLines(ctx, headlineText, W - padX * 2).slice(0, 2);
          let ty = infoY;
          for (const line of topicLines) {
            ctx.fillText(line, W / 2, ty);
            ty += 52;
          }
        }

        // Date & Time Pill Box
        const boxW = W - padX * 2;
        const boxH = isCompactH ? 82 : 112;
        const boxY = H - footerH - boxH - (isCompactH ? 20 : 42);
        ctx.fillStyle = isLightText ? 'rgba(17,17,20,0.92)' : 'rgba(18,18,24,0.9)';
        ctx.fillRect(padX, boxY, boxW, boxH);
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(padX, boxY, 10, boxH);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#D4AF37';
        ctx.font = `800 ${isCompactH ? 24 : 32}px Inter, sans-serif`;
        ctx.fillText(`${inviteDate}  •  ${inviteTime}`, padX + 34, boxY + (isCompactH ? 36 : 48));

        ctx.fillStyle = '#E4E4E7';
        ctx.font = `500 ${isCompactH ? 18 : 23}px Inter, sans-serif`;
        ctx.fillText(inviteChannel, padX + 34, boxY + (isCompactH ? 64 : 84));
      } else {
        // ==================== MODE: ARTES OU CAPAS DE VÍDEO ====================
        const bottomMargin = footerH + (isCompactH ? 42 : 76);

        // For Capas (Reels/Shorts/YouTube), draw top episode badge & optional Play Button
        if (studioMode === 'capas') {
          const topBadgeY = (showTopBar ? topBarThickness : 0) + (isCompactH ? 34 : 68);
          ctx.fillStyle = '#D4AF37';
          ctx.font = `800 ${isCompactH ? 22 : 28}px Inter, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(coverEpisodeTag.toUpperCase(), padX, topBadgeY + 24);

          if (videoDurationTag.trim()) {
            ctx.font = `800 ${isCompactH ? 20 : 24}px monospace`;
            const durW = ctx.measureText(videoDurationTag).width + 32;
            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fillRect(padX, topBadgeY + 42, durW, isCompactH ? 36 : 42);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(videoDurationTag, padX + 16, topBadgeY + (isCompactH ? 66 : 70));
          }

          if (showPlayIcon) {
            const px = W / 2;
            const py = isCompactH ? H * 0.34 : H * 0.32;
            const pr = isCompactH ? 52 : 72;
            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 102, 0, 0.92)';
            ctx.fill();
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(px - pr * 0.25, py - pr * 0.38);
            ctx.lineTo(px + pr * 0.45, py);
            ctx.lineTo(px - pr * 0.25, py + pr * 0.38);
            ctx.closePath();
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.textAlign = textAlign;
        const anchorX = textAlign === 'center' ? W / 2 : padX;
        const maxTextW = W - padX * 2;

        const subFontPx = isCompactH ? Math.round(subtitleSize * 0.78) : subtitleSize;
        ctx.font = `500 ${subFontPx}px Inter, system-ui, sans-serif`;
        const subLines =
          showSubtitle && subtitleText.trim() ? wrapLines(ctx, subtitleText, maxTextW) : [];
        const subLineH = Math.round(subFontPx * 1.35);
        const subBlockH = subLines.length * subLineH;

        const headFontPx = isCompactH ? Math.round(headlineSize * 0.78) : headlineSize;
        ctx.font = `800 ${headFontPx}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
        const headLines = wrapLines(ctx, headlineText || 'Manchete FortNews', maxTextW);
        const headLineH = Math.round(headFontPx * 1.15);
        const headBlockH = headLines.length * headLineH;

        const dividerGap = showDividerLine ? dividerThickness + 34 : 18;
        const badgeGap = showBadge || showCity ? (isCompactH ? 52 : 66) : 0;

        const totalBlockH = badgeGap + headBlockH + dividerGap + subBlockH;
        let cursorY = Math.max(
          (showTopBar ? topBarThickness : 0) + (isCompactH ? 64 : 110),
          H - bottomMargin - totalBlockH
        );

        if (showBadge || showCity) {
          ctx.font = `800 ${isCompactH ? 20 : 24}px Inter, system-ui, sans-serif`;
          const tagLabel = badgeText.trim() || 'DESTAQUE';
          const tagW = showBadge ? ctx.measureText(tagLabel).width + 38 : 0;
          const tagH = isCompactH ? 40 : 48;

          let rowX = textAlign === 'center' ? W / 2 - tagW / 2 : padX;
          if (showBadge) {
            ctx.fillStyle = badgeBgColor;
            ctx.fillRect(rowX, cursorY, tagW, tagH);
            ctx.fillStyle = badgeTextColor;
            ctx.textAlign = 'left';
            ctx.fillText(tagLabel, rowX + 19, cursorY + (isCompactH ? 27 : 32));
            rowX += tagW + 20;
          }

          if (showCity && cityText.trim()) {
            ctx.fillStyle = maskMode === 'light' ? '#B45309' : '#D4AF37';
            ctx.font = `700 ${isCompactH ? 20 : 24}px Inter, system-ui, sans-serif`;
            ctx.textAlign = textAlign === 'center' && !showBadge ? 'center' : 'left';
            ctx.fillText(
              cityText.trim(),
              textAlign === 'center' && !showBadge ? W / 2 : rowX,
              cursorY + (isCompactH ? 27 : 32)
            );
          }

          cursorY += tagH + (isCompactH ? 24 : 34);
        }

        ctx.textAlign = textAlign;
        ctx.fillStyle = headlineColor;
        ctx.font = `800 ${headFontPx}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
        for (const line of headLines) {
          cursorY += headLineH * 0.86;
          ctx.fillText(line, anchorX, cursorY);
          cursorY += headLineH * 0.14;
        }

        if (showDividerLine && dividerThickness > 0) {
          cursorY += 16;
          const lineW = Math.round(((W - padX * 2) * dividerWidthPct) / 100);
          const lineX = textAlign === 'center' ? (W - lineW) / 2 : padX;
          ctx.fillStyle = dividerColor;
          ctx.fillRect(lineX, cursorY, lineW, dividerThickness);
          cursorY += dividerThickness + 20;
        } else {
          cursorY += 18;
        }

        if (subLines.length > 0) {
          ctx.textAlign = textAlign;
          ctx.fillStyle = subtitleColor;
          ctx.font = `500 ${subFontPx}px Inter, system-ui, sans-serif`;
          for (const line of subLines) {
            cursorY += subLineH * 0.85;
            ctx.fillText(line, anchorX, cursorY);
            cursorY += subLineH * 0.15;
          }
        }
      }

      // 7. Footer Bar
      if (showFooterBar) {
        const fy = H - footerH;
        ctx.fillStyle = footerBarColor;
        ctx.fillRect(0, fy, W, footerH);
        ctx.fillStyle = footerAccentColor;
        ctx.fillRect(0, fy, W, 5);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${isCompactH ? 22 : 28}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          footerText || `Leia mais em ${newsPortalSettings.domain}`,
          padX,
          fy + Math.round(footerH * 0.58)
        );

        ctx.textAlign = 'right';
        ctx.fillStyle = footerAccentColor;
        ctx.font = `800 ${isCompactH ? 20 : 24}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          brandPreset === 'fortmidia' ? 'FORTMÍDIA' : 'FORTNEWS',
          W - padX,
          fy + Math.round(footerH * 0.58)
        );
      }

      // 8. Watermark
      if (watermarkEnabled && studioMode !== 'convite') {
        const logoImg = watermarkType === 'logo' ? await loadImg(watermarkLogoUrl) : null;
        if (cancelled) return;

        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0.08, watermarkOpacity / 100));
        const scaleFactor = watermarkScale / 100;

        if (watermarkPos === 'tiled') {
          ctx.translate(W / 2, H / 2);
          ctx.rotate((-24 * Math.PI) / 180);
          ctx.fillStyle = maskMode === 'light' ? '#000000' : '#FFFFFF';
          ctx.font = `800 ${Math.round(42 * scaleFactor)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          const stamp = watermarkText.trim() || 'FORTMÍDIA';
          for (let y = -H; y <= H; y += 260) {
            for (let x = -W; x <= W; x += 420) {
              ctx.fillText(stamp, x, y);
            }
          }
        } else if (watermarkType === 'logo' && logoImg) {
          const baseSize = Math.round((isCompactH ? 90 : 120) * scaleFactor);
          const ratio = logoImg.width / Math.max(1, logoImg.height);
          const drawW = Math.round(baseSize * Math.min(2.6, Math.max(0.8, ratio)));
          const drawH = baseSize;
          let wx = padX;
          let wy = (showTopBar ? topBarThickness : 0) + 34;

          if (watermarkPos === 'top-right') {
            wx = W - padX - drawW;
          } else if (watermarkPos === 'bottom-left') {
            wy = H - footerH - drawH - 28;
          } else if (watermarkPos === 'bottom-right') {
            wx = W - padX - drawW;
            wy = H - footerH - drawH - 28;
          } else if (watermarkPos === 'center') {
            wx = (W - drawW) / 2;
            wy = (H - drawH) / 2;
          }
          ctx.drawImage(logoImg, wx, wy, drawW, drawH);
        } else {
          const fontPx = Math.round((isCompactH ? 26 : 32) * scaleFactor);
          ctx.font = `800 ${fontPx}px Inter, sans-serif`;
          ctx.fillStyle = maskMode === 'light' ? '#111114' : '#FFFFFF';
          const txt = watermarkText.trim() || '@jornalfortnews';
          let wx = padX;
          let wy = (showTopBar ? topBarThickness : 0) + 56;
          ctx.textAlign = 'left';

          if (watermarkPos === 'top-right') {
            wx = W - padX;
            ctx.textAlign = 'right';
          } else if (watermarkPos === 'bottom-left') {
            wy = H - footerH - 30;
          } else if (watermarkPos === 'bottom-right') {
            wx = W - padX;
            wy = H - footerH - 30;
            ctx.textAlign = 'right';
          } else if (watermarkPos === 'center') {
            wx = W / 2;
            wy = H / 2;
            ctx.textAlign = 'center';
          }
          ctx.fillText(txt, wx, wy);
        }

        ctx.restore();
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [
    studioMode,
    formatId,
    brandPreset,
    bgImageUrl,
    bgColor,
    maskMode,
    maskCustomColor,
    maskStyle,
    scrimOpacity,
    photoZoom,
    showBadge,
    badgeText,
    badgeBgColor,
    badgeTextColor,
    showCity,
    cityText,
    headlineText,
    headlineSize,
    headlineColor,
    textAlign,
    showSubtitle,
    subtitleText,
    subtitleSize,
    subtitleColor,
    showTopBar,
    topBarColor,
    topBarThickness,
    showDividerLine,
    dividerColor,
    dividerThickness,
    dividerWidthPct,
    showFooterBar,
    footerBarColor,
    footerAccentColor,
    footerText,
    showOuterBorder,
    outerBorderColor,
    outerBorderThickness,
    watermarkEnabled,
    watermarkType,
    watermarkText,
    watermarkLogoUrl,
    watermarkPos,
    watermarkOpacity,
    watermarkScale,
    showPlayIcon,
    videoDurationTag,
    coverEpisodeTag,
    programName,
    programLogoUrl,
    guestName,
    guestRole,
    guestPhotoUrl,
    hostName,
    hostPhotoUrl,
    inviteDate,
    inviteTime,
    inviteChannel,
    guestPhotoScale,
    hostPhotoScale,
    programLogoScale,
    artFrameTemplate,
    editorialLogoScale,
    editorialFooterSlogan,
    newsPortalSettings.domain,
  ]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const spec = ALL_FORMAT_SPECS[formatId];
    const link = document.createElement('a');
    link.download = `fortmidia-${studioMode}-${spec.w}x${spec.h}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopySocial = async (kind: 'all' | 'caption' | 'hashtags') => {
    const cleanCaption = stripEmojisClean(socialCaption);
    const cleanTags = normalizeHashtagsString(hashtags);
    const payload =
      kind === 'all'
        ? [cleanCaption, cleanTags].filter(Boolean).join('\n\n')
        : kind === 'caption'
          ? cleanCaption
          : cleanTags;
    const ok = await copyTextSafe(payload);
    if (ok) {
      setCopiedType(kind);
      window.setTimeout(() => setCopiedType(null), 2400);
    }
  };

  const buildCurrentArtCaptionPayload = () => {
    const isInvite = studioMode === 'convite';
    return {
      platform:
        formatId === 'story_9_16' || formatId === 'reels_9_16' || formatId === 'shorts_9_16'
          ? 'Reels / Stories'
          : formatId === 'youtube_16_9'
            ? 'YouTube'
            : 'Instagram Feed',
      tone: isInvite ? 'Convite Podcast / Entrevista' : 'Jornalístico / Direto',
      brand:
        isInvite || brandPreset === 'podcast'
          ? 'Podcast FortNews'
          : brandPreset === 'fortmidia'
            ? 'Grupo FortMídia'
            : 'Jornal FortNews',
      headline: isInvite ? `${programName} recebe ${guestName}` : headlineText,
      subtitle: isInvite
        ? `${guestName} (${guestRole}) conversa com ${hostName}. ${headlineText}`
        : subtitleText,
      city: isInvite ? 'Regional CIMBAJU' : cityText || 'Regional CIMBAJU',
      category: isInvite ? 'Podcast' : badgeText || 'Notícias',
      details: isInvite
        ? `Data: ${inviteDate} | Horário: ${inviteTime} | Transmissão: ${inviteChannel}`
        : '',
      ctaLink: isInvite ? inviteChannel : newsPortalSettings.domain,
      hashtagCount: 8,
    };
  };

  const handleQuickGenerateEditorialCaption = () => {
    setQuickCaptionError(null);
    const result = buildEditorialSocialCopy(buildCurrentArtCaptionPayload());
    setSocialCaption(result.caption);
    setHashtags(result.hashtags);
  };

  const handleQuickGenerateAiCaption = async () => {
    setQuickCaptionGenerating(true);
    setQuickCaptionError(null);
    try {
      const payload = buildCurrentArtCaptionPayload();
      const res = await aiApi.generateSocialCaption(payload);
      if (!res.ok || !res.data?.caption) {
        setQuickCaptionError(
          res.error ||
            'Não foi possível gerar com IA. Use o botão "Modelo Rápido" ou abra o Gerador Completo.'
        );
        return;
      }
      setSocialCaption(stripEmojisClean(res.data.caption));
      setHashtags(
        normalizeHashtagsString(
          res.data.hashtagList?.length ? res.data.hashtagList : res.data.hashtags || '',
          payload.hashtagCount
        )
      );
    } catch {
      setQuickCaptionError('Erro de conexão com a IA. Use o botão "Modelo Rápido".');
    } finally {
      setQuickCaptionGenerating(false);
    }
  };

  const readFileAsUrl = (
    e: React.ChangeEvent<HTMLInputElement>,
    cb: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') cb(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Estúdio de Marketing · Artes, Capas, Convites & Legendas
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Crie artes de feed, capas de Reels/Shorts/YouTube, convites de Podcast e gere legendas e hashtags (#) para redes sociais sempre sem emojis.
          </p>
        </div>

        {studioMode === 'legendas' ? (
          <button
            type="button"
            onClick={() => handleCopySocial('all')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap"
          >
            {copiedType === 'all' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copiedType === 'all' ? 'Legenda + # Copiadas!' : 'Copiar Legenda + #'}
          </button>
        ) : (
          studioMode !== 'molduras' && (
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar Arte PNG ({ALL_FORMAT_SPECS[formatId].w}×{ALL_FORMAT_SPECS[formatId].h})
            </button>
          )
        )}
      </div>

      {/* 5 STUDIO MODE TABS */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#121215] p-1.5">
        <button
          type="button"
          onClick={() => handleSwitchStudioMode('artes')}
          className={`flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
            studioMode === 'artes' ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Newspaper className="h-4 w-4" />
          Artes Feed & Portal
        </button>
        <button
          type="button"
          onClick={() => handleSwitchStudioMode('molduras')}
          className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
            studioMode === 'molduras' ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Video className="h-4 w-4" />
          Molduras de Vídeo
        </button>
        <button
          type="button"
          onClick={() => handleSwitchStudioMode('capas')}
          className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
            studioMode === 'capas' ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="h-4 w-4" />
          Capas Reels & YouTube
        </button>
        <button
          type="button"
          onClick={() => handleSwitchStudioMode('convite')}
          className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
            studioMode === 'convite' ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Mic2 className="h-4 w-4" />
          Convites Podcast & IA
        </button>
        <button
          type="button"
          onClick={() => handleSwitchStudioMode('legendas')}
          className={`flex-1 min-w-[175px] inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
            studioMode === 'legendas' ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Hash className="h-4 w-4" />
          Legendas & # (Redes)
        </button>
      </div>

      {studioMode === 'molduras' ? (
        <FortNewsVideoFrameStudio />
      ) : studioMode === 'legendas' ? (
        <SocialCaptionStudio
          pautas={pautas}
          selectedPautaId={selectedPautaId}
          onSelectPauta={(id) => {
            if (!id) {
              setSelectedPautaId('');
            } else {
              applyArticleToArt(id);
            }
          }}
          socialCaption={socialCaption}
          setSocialCaption={setSocialCaption}
          hashtags={hashtags}
          setHashtags={setHashtags}
          defaultPortalDomain={newsPortalSettings.domain}
          autoSyncTick={captionSyncTick}
          currentArtContext={{
            mode: lastVisualMode,
            headline: headlineText,
            subtitle: subtitleText,
            city: cityText,
            badge: badgeText,
            ctaLink: footerText || newsPortalSettings.domain,
            programName,
            guestName,
            guestRole,
            hostName,
            inviteDate,
            inviteTime,
            inviteChannel,
          }}
        />
      ) : (
      <>
      {/* Saved Presets Bar (Super Admin Save + Lock) & Format/Importer */}
      <div className="rounded-xl border border-white/10 bg-[#121215] p-4 space-y-4">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              {marketingPresetsLocked ? (
                <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-emerald-400" />
              )}
              Padrões Visuais Salvos (Presets da Empresa)
            </div>
            <p className="text-[11px] text-zinc-400">
              {presetLockedForOperator
                ? 'Presets travados pelo Super Admin. Você pode selecionar um preset e editar os textos/fotos do post, mas não alterar os padrões salvos.'
                : 'Super Admin: ajuste cores, linhas, marca d’água e tamanhos das fotos e clique em Salvar Preset. Trave para impedir alterações por outros perfis.'}
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSavePreset(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar Preset
              </button>
              <button
                type="button"
                onClick={() => setShowNewPresetInput((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !marketingPresetsLocked;
                  setMarketingPresetsLocked(next);
                  flashPresetNotice(
                    next
                      ? 'Presets travados pelo Super Admin! Ninguém mais pode alterá-los.'
                      : 'Presets destravados pelo Super Admin.'
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  marketingPresetsLocked
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'border-white/15 text-zinc-300 hover:bg-white/5'
                }`}
              >
                {marketingPresetsLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {marketingPresetsLocked ? 'Travado (Só Super Admin)' : 'Travar Presets'}
              </button>
            </div>
          )}
        </div>

        {isSuperAdmin && showNewPresetInput && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] p-2.5">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nome do novo preset (ex: Convite Podcast Padrão 2026)"
              className="flex-1 min-w-[220px] rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => handleSavePreset(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
            >
              Salvar Novo Preset
            </button>
          </div>
        )}

        {presetNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{presetNotice}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-12 items-end">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Selecionar Preset Oficial
            </label>
            <div className="flex flex-wrap gap-1.5">
              {marketingPresets.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'border-white/10 text-zinc-300 hover:bg-white/5'
                    }`}
                    style={isActive ? { backgroundColor: preset.accentColor || '#FF6600' } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => applySavedPreset(preset)}
                      className="inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {(marketingPresetsLocked || preset.lockedBySuperAdmin) && (
                        <Lock className="h-3 w-3 opacity-85" />
                      )}
                      <span>{preset.name}</span>
                    </button>
                    {isSuperAdmin && marketingPresets.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remover preset ${preset.name}`}
                        onClick={() => {
                          deleteMarketingPreset(preset.id);
                          flashPresetNotice(`Preset "${preset.name}" excluído.`);
                        }}
                        className="ml-1 opacity-75 hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Formato / Dimensão
            </label>
            <select
              value={formatId}
              onChange={(e) => setFormatId(e.target.value as FormatId)}
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              {MODE_FORMATS[studioMode].map((id) => (
                <option key={id} value={id}>
                  {ALL_FORMAT_SPECS[id].label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            {studioMode === 'convite' ? (
              <>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1.5">
                  <Mic2 className="h-3.5 w-3.5 text-[#FF6600]" />
                  Selecionar Programa Oficial (Grade 16h–20h)
                </label>
                <select
                  value={selectedPodcastId}
                  onChange={(e) => applyPodcastShow(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  {podcastShows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.title} ({show.daySlot})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1.5">
                  <Newspaper className="h-3.5 w-3.5 text-[#fa6607]" />
                  Importar Matéria do Portal FortNews (Nº Interno ou Busca)
                </label>
                <PautaSearchPicker
                  pautas={pautas}
                  selectedPautaId={selectedPautaId}
                  onSelect={(id) => {
                    if (!id) {
                      setSelectedPautaId('');
                    } else {
                      applyArticleToArt(id);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Editor + Canvas Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] overflow-hidden">
          <div className="flex border-b border-white/10 bg-[#0D0D10] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setEditorTab('textos')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium cursor-pointer ${
                editorTab === 'textos' ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              {studioMode === 'convite' ? 'Convidado, Host & IA' : 'Textos, Máscara & Fundo'}
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('linhas')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium cursor-pointer ${
                editorTab === 'linhas' ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Linhas & Rodapé
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('marca')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium cursor-pointer ${
                editorTab === 'marca' ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Marca d&apos;Água & Copy
            </button>
          </div>

          <div className="p-5 space-y-4">
            {editorTab === 'textos' && (
              <>
                {/* CONVITE PODCAST SPECIFIC FIELDS */}
                {studioMode === 'convite' ? (
                  <div className="space-y-4">
                    {/* Guest & Host Photos + Names */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 space-y-2">
                        <div className="text-[11px] font-bold text-[#FF6600]">Convidado(a)</div>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Nome do Convidado"
                          className="w-full rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={guestRole}
                          onChange={(e) => setGuestRole(e.target.value)}
                          placeholder="Cargo / Empresa"
                          className="w-full rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-300"
                        />
                        <label className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-white/15 bg-[#121215] py-1.5 text-[11px] text-zinc-200 cursor-pointer">
                          <Upload className="h-3 w-3 text-[#FF6600]" />
                          Foto Convidado
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => readFileAsUrl(e, setGuestPhotoUrl)}
                          />
                        </label>
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                            <span>Tamanho Foto Convidado</span>
                            <span className="font-mono text-[#FF6600]">{guestPhotoScale}%</span>
                          </div>
                          <input
                            type="range"
                            aria-label="Tamanho da foto do convidado"
                            min={55}
                            max={165}
                            step={5}
                            value={guestPhotoScale}
                            onChange={(e) => setGuestPhotoScale(Number(e.target.value))}
                            className="w-full accent-[#FF6600] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 space-y-2">
                        <div className="text-[11px] font-bold text-[#D4AF37]">Apresentador(es)</div>
                        <input
                          type="text"
                          value={hostName}
                          onChange={(e) => setHostName(e.target.value)}
                          placeholder="Nome do Apresentador"
                          className="w-full rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={programName}
                          onChange={(e) => setProgramName(e.target.value)}
                          placeholder="Nome do Programa"
                          className="w-full rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-300"
                        />
                        <label className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-white/15 bg-[#121215] py-1.5 text-[11px] text-zinc-200 cursor-pointer">
                          <Upload className="h-3 w-3 text-[#D4AF37]" />
                          Foto Apresentador
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => readFileAsUrl(e, setHostPhotoUrl)}
                          />
                        </label>
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                            <span>Tamanho Foto Apresentador</span>
                            <span className="font-mono text-[#D4AF37]">{hostPhotoScale}%</span>
                          </div>
                          <input
                            type="range"
                            aria-label="Tamanho da foto do apresentador"
                            min={55}
                            max={165}
                            step={5}
                            value={hostPhotoScale}
                            onChange={(e) => setHostPhotoScale(Number(e.target.value))}
                            className="w-full accent-[#D4AF37] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Program Logo Selector & Size */}
                    <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                        <span>Logo do Programa / Canal</span>
                        <label className="inline-flex items-center gap-1 text-[#FF6600] cursor-pointer">
                          <Upload className="h-3 w-3" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => readFileAsUrl(e, setProgramLogoUrl)}
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                        <span>Tamanho do Logo ({programLogoScale}%)</span>
                        <input
                          type="range"
                          aria-label="Tamanho do logo do programa no convite"
                          min={60}
                          max={170}
                          step={5}
                          value={programLogoScale}
                          onChange={(e) => setProgramLogoScale(Number(e.target.value))}
                          className="flex-1 accent-[#FF6600] cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {OFFICIAL_BRAND_LOGOS.map((l) => (
                          <button
                            key={l.url}
                            type="button"
                            onClick={() => setProgramLogoUrl(l.url)}
                            className={`rounded border px-2 py-1 text-[10px] cursor-pointer ${
                              programLogoUrl === l.url
                                ? 'border-[#FF6600] text-[#FF6600]'
                                : 'border-white/10 text-zinc-400'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date, Time, Channel, Topic */}
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Data / Dia</label>
                        <input
                          type="text"
                          value={inviteDate}
                          onChange={(e) => setInviteDate(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Horário</label>
                        <input
                          type="text"
                          value={inviteTime}
                          onChange={(e) => setInviteTime(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Transmissão</label>
                        <input
                          type="text"
                          value={inviteChannel}
                          onChange={(e) => setInviteChannel(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Tema do Episódio / Chamada
                      </label>
                      <input
                        type="text"
                        value={headlineText}
                        onChange={(e) => setHeadlineText(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* CAPAS EXTRA CONTROLS */}
                    {studioMode === 'capas' && (
                      <div className="rounded-lg border border-[#D4AF37]/30 bg-[#0A0A0A] p-3.5 space-y-3">
                        <div className="text-[11px] font-bold text-[#D4AF37]">
                          Opções de Capa &amp; Upload de Vídeo (Reels / Shorts / YouTube)
                        </div>

                        {/* Video Upload Block */}
                        <div className="rounded-lg border border-[#fa6607]/35 bg-[#121215] p-3 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                              <Video className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                              Upload de Vídeo (MP4, MOV, WebM)
                            </div>
                            {uploadedVideoDuration && (
                              <span className="rounded bg-[#fa6607]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#fa6607]">
                                {uploadedVideoDuration}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer">
                              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                              {uploadedVideoUrl ? 'Trocar Vídeo' : 'Fazer Upload de Vídeo'}
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={handleVideoFileUpload}
                              />
                            </label>

                            {uploadedVideoUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={handleCaptureVideoFrame}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                                >
                                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                                  Capturar Frame como Capa
                                </button>
                                <button
                                  type="button"
                                  onClick={handleClearUploadedVideo}
                                  title="Remover vídeo carregado"
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-zinc-400 hover:border-red-500/40 hover:text-red-300 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Remover
                                </button>
                              </>
                            )}
                          </div>

                          {uploadedVideoName ? (
                            <p className="text-[11px] text-zinc-300 truncate">
                              Arquivo: <span className="font-medium text-white">{uploadedVideoName}</span> — pause no melhor segundo na prévia ao lado e capture o frame direto na capa.
                            </p>
                          ) : (
                            <p className="text-[11px] text-zinc-400">
                              Suba seu Reels, Short ou episódio YouTube para visualizar no estúdio, detectar a duração automaticamente e capturar o melhor frame como capa.
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <input
                            type="text"
                            value={coverEpisodeTag}
                            onChange={(e) => setCoverEpisodeTag(e.target.value)}
                            placeholder="Tag Episódio (ex: NOVO REELS)"
                            className="rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={videoDurationTag}
                            onChange={(e) => setVideoDurationTag(e.target.value)}
                            placeholder="Duração / Selo (ex: 08:45 · HD)"
                            className="rounded border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showPlayIcon}
                            onChange={(e) => setShowPlayIcon(e.target.checked)}
                            className="accent-[#fa6607]"
                          />
                          Exibir Botão Play Central na Capa
                        </label>
                      </div>
                    )}

                    {/* MOLDURA NOTÍCIA ESTÁTICA SELECTOR (ARTES MODE) */}
                    {studioMode === 'artes' && (
                      <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-zinc-200">
                            Estilo / Moldura da Notícia Estática
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {ALL_FORMAT_SPECS[formatId].w}×{ALL_FORMAT_SPECS[formatId].h}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setArtFrameTemplate('classic')}
                            className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                              artFrameTemplate === 'classic'
                                ? 'border-[#fa6607] bg-[#fa6607]/15 text-white'
                                : 'border-white/10 bg-[#121215] text-zinc-300 hover:border-white/25'
                            }`}
                          >
                            <div className="text-[11px] font-bold">Padrão Clássico</div>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              Foto em tela cheia com máscara de contraste e texto sobreposto.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setArtFrameTemplate('fortnews_editorial')}
                            className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                              artFrameTemplate === 'fortnews_editorial'
                                ? 'border-[#fa6607] bg-[#fa6607]/15 text-white'
                                : 'border-white/10 bg-[#121215] text-zinc-300 hover:border-white/25'
                            }`}
                          >
                            <div className="text-[11px] font-bold">Moldura Notícia FortNews</div>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              Foto superior com degradê laranja, selo FortNews central, card branco editorial e rodapé diagonal.
                            </p>
                          </button>
                        </div>

                        {artFrameTemplate === 'fortnews_editorial' && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-white/10">
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                                <span>Tamanho do Selo FortNews</span>
                                <span className="font-mono font-semibold text-[#fa6607] tabular-nums">
                                  {editorialLogoScale}%
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="Tamanho do selo FortNews na moldura estática"
                                min={70}
                                max={145}
                                step={5}
                                value={editorialLogoScale}
                                onChange={(e) => setEditorialLogoScale(Number(e.target.value))}
                                className="w-full accent-[#fa6607] cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-400 mb-1">
                                Slogan no Rodapé Direito
                              </label>
                              <input
                                type="text"
                                value={editorialFooterSlogan}
                                onChange={(e) => setEditorialFooterSlogan(e.target.value)}
                                placeholder="Informação que conecta você"
                                className="w-full rounded border border-white/15 bg-[#121215] px-2.5 py-1 text-[11px] text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Headline */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-zinc-300">
                          Título / Manchete da Capa
                        </label>
                        <span className="font-mono text-[11px] text-[#FF6600]">{headlineSize}px</span>
                      </div>
                      <textarea
                        rows={3}
                        value={headlineText}
                        onChange={(e) => setHeadlineText(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white"
                      />
                      <div className="mt-2 grid grid-cols-3 gap-2 items-center">
                        <input
                          type="range"
                          aria-label="Tamanho da manchete"
                          min={32}
                          max={84}
                          value={headlineSize}
                          onChange={(e) => setHeadlineSize(Number(e.target.value))}
                          className="col-span-2 accent-[#FF6600]"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="color"
                            aria-label="Cor da manchete"
                            value={headlineColor}
                            onChange={(e) => setHeadlineColor(e.target.value)}
                            className="h-7 w-8 rounded border-0 bg-transparent cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setTextAlign(textAlign === 'left' ? 'center' : 'left')}
                            className="rounded border border-white/15 px-2 py-1 text-[10px] text-zinc-200 cursor-pointer"
                          >
                            {textAlign === 'left' ? 'Esq' : 'Centro'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Subtitle */}
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showSubtitle}
                            onChange={(e) => setShowSubtitle(e.target.checked)}
                            className="accent-[#FF6600]"
                          />
                          Subtítulo / Legenda de Apoio
                        </label>
                        <span className="font-mono text-[11px] text-zinc-400">{subtitleSize}px</span>
                      </div>
                      {showSubtitle && (
                        <>
                          <textarea
                            rows={2}
                            value={subtitleText}
                            onChange={(e) => setSubtitleText(e.target.value)}
                            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                          />
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              aria-label="Tamanho do subtítulo"
                              min={20}
                              max={44}
                              value={subtitleSize}
                              onChange={(e) => setSubtitleSize(Number(e.target.value))}
                              className="flex-1 accent-[#FF6600]"
                            />
                            <input
                              type="color"
                              aria-label="Cor do subtítulo"
                              value={subtitleColor}
                              onChange={(e) => setSubtitleColor(e.target.value)}
                              className="h-7 w-8 rounded border-0 bg-transparent cursor-pointer"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Badge & City */}
                    <div className="grid gap-3 sm:grid-cols-2 border-t border-white/10 pt-3">
                      <div>
                        <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300 mb-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBadge}
                            onChange={(e) => setShowBadge(e.target.checked)}
                            className="accent-[#FF6600]"
                          />
                          Etiqueta / Selo Topo
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={badgeText}
                            onChange={(e) => setBadgeText(e.target.value)}
                            className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="color"
                            aria-label="Cor fundo selo"
                            value={badgeBgColor}
                            onChange={(e) => setBadgeBgColor(e.target.value)}
                            className="h-8 w-8 rounded bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300 mb-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showCity}
                            onChange={(e) => setShowCity(e.target.checked)}
                            className="accent-[#FF6600]"
                          />
                          Cidade / Editoria
                        </label>
                        <input
                          type="text"
                          value={cityText}
                          onChange={(e) => setCityText(e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* AI THUMBNAIL GENERATOR (Always handy for Convites & Capas) */}
                {(studioMode === 'convite' || studioMode === 'capas') && (
                  <div className="rounded-lg border border-[#FF6600]/35 bg-[#161210] p-3.5 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF6600]">
                      <Sparkles className="h-4 w-4" />
                      Gerar Fundo / Thumbnail por IA (Nano Banana / Gemini)
                    </div>
                    <textarea
                      rows={2}
                      value={aiThumbPrompt}
                      onChange={(e) => setAiThumbPrompt(e.target.value)}
                      placeholder="Descreva o cenário de fundo para a thumbnail..."
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                    />
                    {aiError && (
                      <div className="rounded-lg border border-red-500/35 bg-red-950/30 p-3 space-y-2 text-[11px] text-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-red-300">{aiError.message}</p>
                            {(aiError.code === 'CREDITS_DEPLETED' || aiError.code === 'QUOTA_EXHAUSTED') && (
                              <p className="text-zinc-300">
                                Para gerar imagens com os modelos Nano Banana / Gemini Image, o projeto vinculado à chave precisa de créditos pré-pagos ativos. Enquanto recarrega, você pode aplicar um fundo do acervo abaixo ou enviar sua própria foto.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {aiError.billingUrl && (
                            <a
                              href={aiError.billingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-red-500/20 border border-red-400/40 px-2.5 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-500/30"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Gerenciar Créditos no AI Studio
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setBgImageUrl('/assets/aistudio/Microfone_dc305011.jpg');
                              setAiError(null);
                            }}
                            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer"
                          >
                            Aplicar Fundo Estúdio
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBgImageUrl('/assets/aistudio/outdoor_6fc8fbe7.jpg');
                              setAiError(null);
                            }}
                            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10 cursor-pointer"
                          >
                            Aplicar Fundo Outdoor
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={handleGenerateAiThumbnail}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] disabled:opacity-60 cursor-pointer"
                    >
                      {aiGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {aiGenerating ? 'Gerando Thumbnail IA...' : 'Gerar Fundo / Thumbnail com IA'}
                    </button>
                  </div>
                )}

                {/* CONTRAST MASK (ESCURA, MÁSCARA BRANCA PARA FOTOS CLARAS, PERSONALIZADA) */}
                <div className="border-t border-white/10 pt-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5 text-[#D4AF37]" />
                      Máscara de Contraste (Fotos Claras / Leitura)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => applyMaskPreset('dark')}
                        className={`rounded px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                          maskMode === 'dark'
                            ? 'bg-zinc-950 text-white border border-[#FF6600]'
                            : 'border border-white/10 text-zinc-400'
                        }`}
                      >
                        Máscara Escura
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMaskPreset('light')}
                        className={`rounded px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                          maskMode === 'light'
                            ? 'bg-white text-black border border-[#FF6600]'
                            : 'border border-white/10 text-zinc-300'
                        }`}
                      >
                        Máscara Branca (Fotos Claras)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMaskPreset('custom')}
                        className={`rounded px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                          maskMode === 'custom'
                            ? 'bg-[#FF6600] text-white'
                            : 'border border-white/10 text-zinc-400'
                        }`}
                      >
                        Personalizada
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                    {maskMode === 'custom' && (
                      <label className="inline-flex items-center gap-1.5">
                        Cor:
                        <input
                          type="color"
                          value={maskCustomColor}
                          onChange={(e) => setMaskCustomColor(e.target.value)}
                          className="h-7 w-8 rounded bg-transparent cursor-pointer"
                        />
                      </label>
                    )}
                    <div className="inline-flex rounded border border-white/15 p-0.5">
                      <button
                        type="button"
                        onClick={() => setMaskStyle('gradient')}
                        className={`rounded px-2 py-0.5 text-[10px] cursor-pointer ${
                          maskStyle === 'gradient' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                        }`}
                      >
                        Degradê
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaskStyle('solid')}
                        className={`rounded px-2 py-0.5 text-[10px] cursor-pointer ${
                          maskStyle === 'solid' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                        }`}
                      >
                        Sólida Uniforme
                      </button>
                    </div>
                  </div>
                </div>

                {/* Background Image & Zoom/Scrim */}
                <div className="border-t border-white/10 pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-[#FF6600]" />
                      Imagem de Fundo
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {BG_PRESETS.map((bg) => (
                        <button
                          key={bg.url}
                          type="button"
                          onClick={() => setBgImageUrl(bg.url)}
                          className="rounded border border-white/10 bg-[#0A0A0A] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-[#FF6600] cursor-pointer"
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bgImageUrl}
                      onChange={(e) => setBgImageUrl(e.target.value)}
                      className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                    />
                    <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-zinc-200 cursor-pointer shrink-0">
                      <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => readFileAsUrl(e, setBgImageUrl)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Intensidade da Máscara</span>
                        <span className="font-mono">{scrimOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={95}
                        value={scrimOpacity}
                        onChange={(e) => setScrimOpacity(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Zoom da Foto</span>
                        <span className="font-mono">{photoZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={160}
                        value={photoZoom}
                        onChange={(e) => setPhotoZoom(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {editorTab === 'linhas' && (
              <fieldset disabled={presetLockedForOperator} className="space-y-4 disabled:opacity-65">
                {presetLockedForOperator && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-2 text-[11px] text-[#D4AF37]">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>Linhas, bordas e rodapé do preset travados pelo Super Admin.</span>
                  </div>
                )}
                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTopBar}
                        onChange={(e) => setShowTopBar(e.target.checked)}
                        className="accent-[#FF6600]"
                      />
                      Faixa / Linha Superior
                    </label>
                    <input
                      type="color"
                      value={topBarColor}
                      onChange={(e) => setTopBarColor(e.target.value)}
                      className="h-7 w-8 rounded bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span>Espessura ({topBarThickness}px)</span>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={topBarThickness}
                      onChange={(e) => setTopBarThickness(Number(e.target.value))}
                      className="flex-1 accent-[#FF6600]"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDividerLine}
                        onChange={(e) => setShowDividerLine(e.target.checked)}
                        className="accent-[#FF6600]"
                      />
                      Linha Divisória (Abaixo da Manchete)
                    </label>
                    <input
                      type="color"
                      value={dividerColor}
                      onChange={(e) => setDividerColor(e.target.value)}
                      className="h-7 w-8 rounded bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
                    <div>
                      <div>Espessura ({dividerThickness}px)</div>
                      <input
                        type="range"
                        min={2}
                        max={20}
                        value={dividerThickness}
                        onChange={(e) => setDividerThickness(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                    <div>
                      <div>Largura ({dividerWidthPct}%)</div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={dividerWidthPct}
                        onChange={(e) => setDividerWidthPct(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showFooterBar}
                        onChange={(e) => setShowFooterBar(e.target.checked)}
                        className="accent-[#FF6600]"
                      />
                      Barra & Legenda de Rodapé
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        aria-label="Fundo rodapé"
                        value={footerBarColor}
                        onChange={(e) => setFooterBarColor(e.target.value)}
                        className="h-7 w-8 rounded bg-transparent cursor-pointer"
                      />
                      <input
                        type="color"
                        aria-label="Destaque rodapé"
                        value={footerAccentColor}
                        onChange={(e) => setFooterAccentColor(e.target.value)}
                        className="h-7 w-8 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Texto institucional / CTA de rodapé..."
                    className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOuterBorder}
                        onChange={(e) => setShowOuterBorder(e.target.checked)}
                        className="accent-[#FF6600]"
                      />
                      Moldura / Borda Externa Completa
                    </label>
                    <input
                      type="color"
                      value={outerBorderColor}
                      onChange={(e) => setOuterBorderColor(e.target.value)}
                      className="h-7 w-8 rounded bg-transparent cursor-pointer"
                    />
                  </div>
                  {showOuterBorder && (
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span>Espessura ({outerBorderThickness}px)</span>
                      <input
                        type="range"
                        min={2}
                        max={24}
                        value={outerBorderThickness}
                        onChange={(e) => setOuterBorderThickness(Number(e.target.value))}
                        className="flex-1 accent-[#FF6600]"
                      />
                    </div>
                  )}
                </div>
              </fieldset>
            )}

            {editorTab === 'marca' && (
              <>
                <fieldset
                  disabled={presetLockedForOperator}
                  className="rounded-lg border border-[#FF6600]/30 bg-[#0A0A0A] p-4 space-y-3 disabled:opacity-65"
                >
                  {presetLockedForOperator && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] text-[#D4AF37]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Marca d&apos;água oficial travada pelo Super Admin.</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watermarkEnabled}
                        onChange={(e) => setWatermarkEnabled(e.target.checked)}
                        className="accent-[#FF6600]"
                      />
                      Marca d&apos;Água 100% Editável
                    </label>
                    <div className="inline-flex rounded border border-white/15 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setWatermarkType('logo')}
                        className={`rounded px-2.5 py-1 cursor-pointer ${
                          watermarkType === 'logo' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                        }`}
                      >
                        Logotipo
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermarkType('text')}
                        className={`rounded px-2.5 py-1 cursor-pointer ${
                          watermarkType === 'text' ? 'bg-[#FF6600] text-white' : 'text-zinc-400'
                        }`}
                      >
                        Texto
                      </button>
                    </div>
                  </div>

                  {watermarkType === 'logo' ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {OFFICIAL_BRAND_LOGOS.map((l) => (
                          <button
                            key={l.url}
                            type="button"
                            onClick={() => setWatermarkLogoUrl(l.url)}
                            className={`rounded border px-2 py-1 text-[10px] cursor-pointer ${
                              watermarkLogoUrl === l.url
                                ? 'border-[#FF6600] text-[#FF6600]'
                                : 'border-white/10 text-zinc-400'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 cursor-pointer">
                        <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                        Enviar PNG/Logo Próprio
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            readFileAsUrl(e, (url) => {
                              setWatermarkLogoUrl(url);
                              setWatermarkType('logo');
                              setWatermarkEnabled(true);
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-white"
                    />
                  )}

                  <select
                    value={watermarkPos}
                    onChange={(e) => setWatermarkPos(e.target.value as WatermarkPos)}
                    className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-xs text-white"
                  >
                    <option value="top-right">Canto Superior Direito</option>
                    <option value="top-left">Canto Superior Esquerdo</option>
                    <option value="bottom-right">Canto Inferior Direito</option>
                    <option value="bottom-left">Canto Inferior Esquerdo</option>
                    <option value="center">Centralizada</option>
                    <option value="tiled">Marca d&apos;Água Diagonal Repetida</option>
                  </select>

                  <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Opacidade</span>
                        <span className="font-mono">{watermarkOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Tamanho / Escala</span>
                        <span className="font-mono">{watermarkScale}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={180}
                        value={watermarkScale}
                        onChange={(e) => setWatermarkScale(Number(e.target.value))}
                        className="w-full accent-[#FF6600]"
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="space-y-2.5 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        Legenda & Hashtags (#) — Sem Emojis
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCaptionStudioFromArt}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#fa6607] hover:underline cursor-pointer"
                    >
                      <Hash className="h-3 w-3" />
                      Abrir Gerador Completo
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleQuickGenerateAiCaption}
                      disabled={quickCaptionGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer"
                    >
                      {quickCaptionGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {quickCaptionGenerating ? 'Gerando...' : 'Gerar com IA'}
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickGenerateEditorialCaption}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      <FileText className="h-3 w-3 text-[#D4AF37]" />
                      Modelo Rápido
                    </button>
                  </div>

                  {quickCaptionError && (
                    <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
                      {quickCaptionError}
                    </p>
                  )}

                  <textarea
                    rows={4}
                    value={socialCaption}
                    onChange={(e) => setSocialCaption(stripEmojisLive(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(stripEmojisLive(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#D4AF37]"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopySocial('all')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15 cursor-pointer"
                    >
                      {copiedType === 'all' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedType === 'all' ? 'Tudo Copiado!' : 'Copiar Tudo (Legenda + #)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySocial('caption')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5 cursor-pointer"
                    >
                      {copiedType === 'caption' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedType === 'caption' ? 'Legenda Copiada!' : 'Copiar Legenda'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySocial('hashtags')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/35 px-2.5 py-1.5 text-[11px] text-[#D4AF37] hover:bg-[#D4AF37]/10 cursor-pointer"
                    >
                      {copiedType === 'hashtags' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Hash className="h-3.5 w-3.5" />
                      )}
                      {copiedType === 'hashtags' ? '# Copiadas!' : 'Copiar #'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Live WYSIWYG Canvas Preview */}
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Palette className="h-4 w-4 text-[#fa6607]" />
              Prévia em Alta Resolução ({ALL_FORMAT_SPECS[formatId].label})
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {studioMode === 'artes' && (
                <div
                  className="inline-flex rounded-lg border border-white/15 bg-[#0A0A0A] p-0.5 text-[11px]"
                  role="group"
                  aria-label="Modelo de moldura para notícia estática"
                >
                  <button
                    type="button"
                    onClick={() => setArtFrameTemplate('classic')}
                    className={`rounded-md px-2.5 py-1 font-semibold whitespace-nowrap cursor-pointer ${
                      artFrameTemplate === 'classic'
                        ? 'bg-[#fa6607] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Clássico
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtFrameTemplate('fortnews_editorial')}
                    className={`rounded-md px-2.5 py-1 font-semibold whitespace-nowrap cursor-pointer ${
                      artFrameTemplate === 'fortnews_editorial'
                        ? 'bg-[#fa6607] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Moldura Notícia FortNews
                  </button>
                </div>
              )}
              {studioMode === 'capas' && uploadedVideoUrl && (
                <div className="inline-flex rounded-lg border border-white/15 bg-[#0A0A0A] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCapasPreviewView('canvas')}
                    className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                      capasPreviewView === 'canvas'
                        ? 'bg-[#fa6607] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Capa PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapasPreviewView('video')}
                    className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                      capasPreviewView === 'video'
                        ? 'bg-[#fa6607] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Vídeo Carregado
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download PNG
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#08080A] p-3 gap-3">
            <canvas
              ref={canvasRef}
              className={`max-h-[600px] w-auto max-w-full rounded-lg shadow-2xl border border-white/10 ${
                studioMode === 'capas' && uploadedVideoUrl && capasPreviewView === 'video'
                  ? 'hidden'
                  : 'block'
              }`}
            />

            {studioMode === 'capas' && uploadedVideoUrl && (
              <div
                className={`w-full flex flex-col items-center gap-3 ${
                  capasPreviewView === 'video' ? 'flex' : 'hidden'
                }`}
              >
                <video
                  ref={videoRef}
                  src={uploadedVideoUrl}
                  controls
                  playsInline
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  className="max-h-[540px] w-auto max-w-full rounded-lg border border-white/15 bg-black shadow-2xl"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 w-full rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs">
                  <span className="text-zinc-300 truncate max-w-[60%]">
                    <strong className="text-white">{uploadedVideoName}</strong>
                    {uploadedVideoDuration ? ` · ${uploadedVideoDuration}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureVideoFrame}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    Usar Frame Atual na Capa
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
              Exportação idêntica à prévia em PNG
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenCaptionStudioFromArt}
                className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2.5 py-1 font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
              >
                <Hash className="h-3 w-3" />
                Gerar Legenda & # desta Arte
              </button>
              <button
                type="button"
                onClick={() => {
                  applyMaskPreset('dark');
                  const target =
                    marketingPresets.find((p) => p.id === selectedPresetId) ?? marketingPresets[0];
                  if (target) applySavedPreset(target);
                }}
                className="inline-flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Restaurar Padrão Visual
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
