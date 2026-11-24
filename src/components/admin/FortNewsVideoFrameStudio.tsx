import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Newspaper,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Square,
  Star,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { PautaSearchPicker } from './PautaSearchPicker';
import {
  exportFramedVideo,
  FramedVideoExportProgress,
  preloadVideoFirstFrame,
} from '../../utils/videoFrameExporter';

export type VideoFrameTemplate = 'reportagem_vertical' | 'news_horizontal';

export const OFFICIAL_FORTNEWS_VECTOR_LOGO_URL =
  '/assets/aistudio/Logotipo_FortNews_vetorizado__9__b9ef51c4.png';

const VIDEO_FRAME_PRESETS_KEY = 'fortnews_video_frame_presets_v1';
const VIDEO_FRAME_DEFAULT_PRESET_KEY = 'fortnews_video_frame_default_preset_v1';

interface VideoFramePreset {
  id: string;
  name: string;
  builtIn?: boolean;
  template: VideoFrameTemplate;
  accentColor: string;
  logoUrl: string;
  logoScale: number;
  reportagemTitle: string;
  reportagemBottomLabel: string;
  reportagemCityTag: string;
  topHeadline: string;
  cityTag: string;
  bottomHeadline: string;
  leadText: string;
  groupLabel: string;
  portalUrl: string;
  socialHandle: string;
  sloganText: string;
  showViewfinder: boolean;
  mediaFit: 'cover' | 'contain';
  mediaZoom: number;
  mediaOffsetY: number;
}

const BUILTIN_VIDEO_FRAME_PRESETS: VideoFramePreset[] = [
  {
    id: 'builtin-fortnews-oficial',
    name: 'FortNews Oficial',
    builtIn: true,
    template: 'reportagem_vertical',
    accentColor: '#fa6607',
    logoUrl: OFFICIAL_FORTNEWS_VECTOR_LOGO_URL,
    logoScale: 105,
    reportagemTitle: 'COBERTURA EXCLUSIVA\nMATÉRIA EM VÍDEO',
    reportagemBottomLabel: 'REPORTAGEM',
    reportagemCityTag: 'CIMBAJU',
    topHeadline: 'MEGAOPERAÇÃO\nDA PM',
    cityTag: 'MAIRIPORÃ',
    bottomHeadline:
      'FORÇA TÁTICA DESARTICULA LABORATÓRIO DO TRÁFICO E APREENDE 1,3 TONELADA DE DROGAS E ARMAS EM MAIRIPORÃ',
    leadText:
      'A Polícia Militar do Estado de São Paulo, por meio da equipe de Força Tática do 26º BPM/M, desmantelou uma refinaria clandestina de entorpecentes na noite do último sábado...',
    groupLabel: 'Grupo FortNews',
    portalUrl: 'www.jornalfortnews.com.br',
    socialHandle: '@fortnews_',
    sloganText: 'INFORMAÇÃO QUE CONECTA VOCÊ',
    showViewfinder: true,
    mediaFit: 'cover',
    mediaZoom: 100,
    mediaOffsetY: 50,
  },
  {
    id: 'builtin-plantao-urgente',
    name: 'Plantão Urgente',
    builtIn: true,
    template: 'reportagem_vertical',
    accentColor: '#DC2626',
    logoUrl: OFFICIAL_FORTNEWS_VECTOR_LOGO_URL,
    logoScale: 110,
    reportagemTitle: 'PLANTÃO URGENTE\nÚLTIMAS INFORMAÇÕES',
    reportagemBottomLabel: 'PLANTÃO',
    reportagemCityTag: 'CIMBAJU',
    topHeadline: 'PLANTÃO\nURGENTE',
    cityTag: 'CIMBAJU',
    bottomHeadline: 'ATUALIZAÇÃO EM TEMPO REAL DA REDAÇÃO DO PORTAL JORNAL FORTNEWS',
    leadText: 'Acompanhe os detalhes completos em tempo real no Portal Jornal FortNews.',
    groupLabel: 'Grupo FortNews',
    portalUrl: 'www.jornalfortnews.com.br',
    socialHandle: '@fortnews_',
    sloganText: 'INFORMAÇÃO QUE CONECTA VOCÊ',
    showViewfinder: true,
    mediaFit: 'cover',
    mediaZoom: 100,
    mediaOffsetY: 50,
  },
  {
    id: 'builtin-especial-dourado',
    name: 'Especial CIMBAJU',
    builtIn: true,
    template: 'reportagem_vertical',
    accentColor: '#D4AF37',
    logoUrl: OFFICIAL_FORTNEWS_VECTOR_LOGO_URL,
    logoScale: 105,
    reportagemTitle: 'ENTREVISTA ESPECIAL\nCOBERTURA REGIONAL',
    reportagemBottomLabel: 'EXCLUSIVO',
    reportagemCityTag: 'CIMBAJU',
    topHeadline: 'COBERTURA\nESPECIAL',
    cityTag: 'CIMBAJU',
    bottomHeadline: 'REPORTAGEM ESPECIAL DO GRUPO FORTNEWS PARA TODA A REGIÃO DO CIMBAJU',
    leadText: 'Assista ao conteúdo completo nas plataformas oficiais do Grupo FortNews.',
    groupLabel: 'Grupo FortNews',
    portalUrl: 'www.jornalfortnews.com.br',
    socialHandle: '@fortnews_',
    sloganText: 'INFORMAÇÃO QUE CONECTA VOCÊ',
    showViewfinder: true,
    mediaFit: 'cover',
    mediaZoom: 100,
    mediaOffsetY: 50,
  },
  {
    id: 'builtin-news-horizontal',
    name: 'News Horizontal',
    builtIn: true,
    template: 'news_horizontal',
    accentColor: '#fa6607',
    logoUrl: OFFICIAL_FORTNEWS_VECTOR_LOGO_URL,
    logoScale: 105,
    reportagemTitle: 'COBERTURA EXCLUSIVA\nMATÉRIA EM VÍDEO',
    reportagemBottomLabel: 'REPORTAGEM',
    reportagemCityTag: 'CIMBAJU',
    topHeadline: 'MEGAOPERAÇÃO\nDA PM',
    cityTag: 'MAIRIPORÃ',
    bottomHeadline:
      'FORÇA TÁTICA DESARTICULA LABORATÓRIO DO TRÁFICO E APREENDE 1,3 TONELADA DE DROGAS E ARMAS EM MAIRIPORÃ',
    leadText:
      'A Polícia Militar do Estado de São Paulo, por meio da equipe de Força Tática do 26º BPM/M, desmantelou uma refinaria clandestina de entorpecentes na noite do último sábado...',
    groupLabel: 'Grupo FortNews',
    portalUrl: 'www.jornalfortnews.com.br',
    socialHandle: '@fortnews_',
    sloganText: 'INFORMAÇÃO QUE CONECTA VOCÊ',
    showViewfinder: true,
    mediaFit: 'cover',
    mediaZoom: 100,
    mediaOffsetY: 50,
  },
];

function trimTransparentImage(img: HTMLImageElement): HTMLCanvasElement | null {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    // Scan on a manageable resolution for instant speed, then crop from full-res image
    const maxScan = 512;
    const scanScale = Math.min(1, maxScan / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scanScale));
    const sh = Math.max(1, Math.round(h * scanScale));

    const scanCanvas = document.createElement('canvas');
    scanCanvas.width = sw;
    scanCanvas.height = sh;
    const sctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    sctx.drawImage(img, 0, 0, sw, sh);
    const data = sctx.getImageData(0, 0, sw, sh).data;

    let minX = sw;
    let minY = sh;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const a = data[(y * sw + x) * 4 + 3];
        if (a > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found || maxX <= minX || maxY <= minY) return null;

    const pad = 4;
    const sx = Math.max(0, Math.floor(minX / scanScale) - pad);
    const sy = Math.max(0, Math.floor(minY / scanScale) - pad);
    const ex = Math.min(w, Math.ceil((maxX + 1) / scanScale) + pad);
    const ey = Math.min(h, Math.ceil((maxY + 1) / scanScale) + pad);
    const cw = Math.max(1, ex - sx);
    const ch = Math.max(1, ey - sy);

    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    const octx = out.getContext('2d');
    if (!octx) return null;
    octx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
    return out;
  } catch {
    return null;
  }
}

function getVerticalFullScreenMetrics(logoScale: number, logoAspect: number) {
  const W = CANVAS_W;
  const H = CANVAS_H;
  const safeAspect = Number.isFinite(logoAspect) && logoAspect > 0.4 ? logoAspect : 3.15;
  const drawW = Math.min(W - 44, Math.max(320, Math.round(620 * (logoScale / 100))));
  const drawH = Math.min(320, Math.round(drawW / safeAspect));
  const logoTopY = 12;
  const logoBottomY = logoTopY + drawH;
  // Seam sits right between the upper waveform and the slanted FortNews block so the black+orange waveform stays crisp on white
  const headerY = Math.max(66, Math.min(148, Math.round(logoTopY + drawH * 0.34)));
  const headlineAreaH = 176;
  const videoY = Math.max(388, logoBottomY + headlineAreaH);
  const orangeFooterH = 166;
  const splitFooterH = 82;
  const splitFooterY = H - splitFooterH;
  const orangeFooterY = splitFooterY - orangeFooterH;
  const videoH = Math.max(920, orangeFooterY - videoY);

  return {
    drawW,
    drawH,
    logoTopY,
    logoBottomY,
    headerY,
    headerH: videoY - headerY,
    videoY,
    videoH,
    orangeFooterY,
    orangeFooterH,
    splitFooterY,
    splitFooterH,
  };
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const ACCENT_PRESETS = [
  { label: 'Laranja FortNews', color: '#fa6607' },
  { label: 'Vermelho Plantão', color: '#DC2626' },
  { label: 'Dourado Especial', color: '#D4AF37' },
];

const REPORTAGEM_BADGE_PRESETS = [
  'REPORTAGEM',
  'PLANTÃO',
  'URGENTE',
  'AO VIVO',
  'EXCLUSIVO',
  'ENTREVISTA',
];

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number }
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function drawViewfinderCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  inset: number,
  arm: number,
  lineWidth: number,
  leftColor: string,
  rightColor?: string
) {
  const rColor = rightColor || leftColor;
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';

  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bottom = y + h - inset;

  // Left side brackets (Top-left & Bottom-left)
  ctx.strokeStyle = leftColor;
  ctx.beginPath();
  ctx.moveTo(left, top + arm);
  ctx.lineTo(left, top);
  ctx.lineTo(left + arm, top);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left, bottom - arm);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + arm, bottom);
  ctx.stroke();

  // Right side brackets (Top-right & Bottom-right)
  ctx.strokeStyle = rColor;
  ctx.beginPath();
  ctx.moveTo(right - arm, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + arm);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(right - arm, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - arm);
  ctx.stroke();

  ctx.restore();
}

function drawTopAudioWaveform(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  leftColor: string,
  rightColor: string
) {
  // Symmetric multi-peak audio waveform matching FortNews broadcast reference
  const halfHeights = [
    6, 10, 18, 12, 24, 16, 10, 22, 34, 18, 12, 30, 52, 28, 16, 22, 38, 24, 14, 28, 46, 24, 14,
    22, 32, 18, 12, 20,
  ];
  const barW = 4.2;
  const step = 9.2;
  const totalBars = halfHeights.length * 2 - 1;
  const startX = cx - ((totalBars - 1) * step) / 2;

  ctx.save();
  for (let i = 0; i < totalBars; i++) {
    const mirrorIdx = i < halfHeights.length ? i : totalBars - 1 - i;
    const h = halfHeights[mirrorIdx];
    const x = startX + i * step - barW / 2;
    const y = cy - h / 2;
    ctx.fillStyle = i < halfHeights.length ? leftColor : rightColor;
    drawRoundedRectPath(ctx, x, y, barW, h, { tl: 2, tr: 2, br: 2, bl: 2 });
    ctx.fill();
  }
  ctx.restore();
}

function drawSlantedFortNewsBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  accentColor: string,
  customLogoImg: HTMLImageElement | null,
  useOfficialVector: boolean,
  sloganText: string
) {
  const badgeW = 584;
  const badgeH = 118;
  const slant = 32;
  const leftX = cx - badgeW / 2;
  const midX = cx - 22;
  const rightX = cx + badgeW / 2;
  const botY = topY + badgeH;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  if (!useOfficialVector && customLogoImg) {
    // Custom uploaded logo inside clean slanted white plaque
    ctx.beginPath();
    ctx.moveTo(leftX + slant, topY);
    ctx.lineTo(rightX, topY);
    ctx.lineTo(rightX - slant, botY);
    ctx.lineTo(leftX, botY);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const padX = 48;
    const padY = 14;
    const availW = badgeW - padX * 2;
    const availH = badgeH - padY * 2;
    const scale = Math.min(availW / customLogoImg.width, availH / customLogoImg.height);
    const lw = customLogoImg.width * scale;
    const lh = customLogoImg.height * scale;
    ctx.drawImage(customLogoImg, cx - lw / 2, topY + (badgeH - lh) / 2, lw, lh);
    ctx.restore();
    return;
  }

  // Left Orange Trapezoid ("Fort")
  ctx.beginPath();
  ctx.moveTo(leftX + slant, topY);
  ctx.lineTo(midX + slant * 0.55, topY);
  ctx.lineTo(midX - slant * 0.45, botY);
  ctx.lineTo(leftX, botY);
  ctx.closePath();
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Right Black Trapezoid ("News")
  ctx.beginPath();
  ctx.moveTo(midX + slant * 0.55, topY);
  ctx.lineTo(rightX, topY);
  ctx.lineTo(rightX - slant, botY);
  ctx.lineTo(midX - slant * 0.45, botY);
  ctx.closePath();
  ctx.fillStyle = '#060608';
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Crisp "Fort" (Black on Orange) & "News" (Orange on Black)
  ctx.font = '900 72px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#060608';
  ctx.textAlign = 'right';
  ctx.fillText('Fort', midX - 10, topY + 52);

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText('News', midX + 18, topY + 52);

  // Subtle bottom tagline split cleanly across both trapezoids
  const upperSlogan = (sloganText || 'INFORMAÇÃO QUE CONECTA VOCÊ').trim().toUpperCase();
  const words = upperSlogan.split(/\s+/);
  const leftTag = words[0] || 'INFORMAÇÃO';
  const rightTag = words.slice(1).join(' ') || 'QUE CONECTA VOCÊ';

  ctx.font = '800 18px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#060608';
  ctx.textAlign = 'right';
  ctx.fillText(leftTag, midX - 16, botY - 16, 215);

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText(rightTag, midX + 8, botY - 16, 290);

  ctx.restore();
}

function drawVideoClapperIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.72;
  const x = cx - w / 2;
  const y = cy - h / 2 + 4;

  // Clapper body
  ctx.strokeRect(x, y, w, h);

  // Top clapper slate line
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 2);
  ctx.lineTo(x + w - 4, y - 16);
  ctx.stroke();

  // Play triangle inside
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 8);
  ctx.lineTo(cx + 14, cy + 4);
  ctx.lineTo(cx - 10, cy + 16);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawMediaIntoWindow(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  fitMode: 'cover' | 'contain',
  zoomPct: number,
  offsetYPct: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = '#09090B';
  ctx.fillRect(x, y, w, h);

  if (media) {
    const mw =
      media instanceof HTMLVideoElement
        ? media.videoWidth
        : media instanceof HTMLImageElement
          ? media.naturalWidth || media.width
          : media.width;
    const mh =
      media instanceof HTMLVideoElement
        ? media.videoHeight
        : media instanceof HTMLImageElement
          ? media.naturalHeight || media.height
          : media.height;
    if (mw > 0 && mh > 0) {
      const baseScale =
        fitMode === 'cover' ? Math.max(w / mw, h / mh) : Math.min(w / mw, h / mh);
      const scale = baseScale * (zoomPct / 100);
      const dw = mw * scale;
      const dh = mh * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2 + ((offsetYPct - 50) / 50) * (h * 0.35);
      ctx.drawImage(media, dx, dy, dw, dh);
    }
  } else {
    // Subtle studio placeholder grid when no media loaded yet
    ctx.fillStyle = '#141418';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let gx = x + 90; gx < x + w; gx += 90) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y + 90; gy < y + h; gy += 90) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ÁREA DO VÍDEO / IMAGEM', x + w / 2, y + h / 2 - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('Arraste ou envie um vídeo MP4 ou foto', x + w / 2, y + h / 2 + 24);
  }

  ctx.restore();
}

export const FortNewsVideoFrameStudio: React.FC = () => {
  const { pautas } = useFortMidia();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTrimmedRef = useRef<HTMLCanvasElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const videoPosterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const combinedMediaInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDragDepthRef = useRef(0);
  const previewDragDepthRef = useRef(0);

  // Abort controllers for async video preloading & silent background MP4 export
  const preloadAbortRef = useRef<AbortController | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  // Saved Presets State (persisted in localStorage)
  const [customPresets, setCustomPresets] = useState<VideoFramePreset[]>(() => {
    try {
      const raw = window.localStorage.getItem(VIDEO_FRAME_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [defaultPresetId, setDefaultPresetId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(VIDEO_FRAME_DEFAULT_PRESET_KEY) || BUILTIN_VIDEO_FRAME_PRESETS[0].id;
    } catch {
      return BUILTIN_VIDEO_FRAME_PRESETS[0].id;
    }
  });

  const allPresets = [...BUILTIN_VIDEO_FRAME_PRESETS, ...customPresets];
  const initialPreset =
    allPresets.find((p) => p.id === defaultPresetId) || BUILTIN_VIDEO_FRAME_PRESETS[0];

  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Template & Branding (Official FortNews vertical broadcast frame selected by default)
  const [template, setTemplate] = useState<VideoFrameTemplate>(initialPreset.template);
  const [accentColor, setAccentColor] = useState(initialPreset.accentColor);
  const [logoUrl, setLogoUrl] = useState(
    initialPreset.logoUrl || OFFICIAL_FORTNEWS_VECTOR_LOGO_URL
  );
  const [logoScale, setLogoScale] = useState<number>(initialPreset.logoScale || 105);
  const [selectedPautaId, setSelectedPautaId] = useState('');

  // Editable Text Fields (Template 2 - News Horizontal)
  const [topHeadline, setTopHeadline] = useState(initialPreset.topHeadline);
  const [cityTag, setCityTag] = useState(initialPreset.cityTag);
  const [bottomHeadline, setBottomHeadline] = useState(initialPreset.bottomHeadline);
  const [leadText, setLeadText] = useState(initialPreset.leadText);

  // Official Vertical Reportagem Fields (full-screen 9:16)
  const [reportagemTitle, setReportagemTitle] = useState(initialPreset.reportagemTitle);
  const [reportagemBottomLabel, setReportagemBottomLabel] = useState(
    initialPreset.reportagemBottomLabel
  );
  const [reportagemCityTag, setReportagemCityTag] = useState(initialPreset.reportagemCityTag);

  // Footer & Identity
  const [groupLabel, setGroupLabel] = useState(initialPreset.groupLabel);
  const [portalUrl, setPortalUrl] = useState(initialPreset.portalUrl);
  const [socialHandle, setSocialHandle] = useState(initialPreset.socialHandle);
  const [sloganText, setSloganText] = useState(initialPreset.sloganText);

  // Media Controls
  const [mediaSourceType, setMediaSourceType] = useState<'video' | 'photo'>('photo');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('/assets/aistudio/Microfone_dc305011.jpg');
  const [mediaFit, setMediaFit] = useState<'cover' | 'contain'>(initialPreset.mediaFit);
  const [mediaZoom, setMediaZoom] = useState(initialPreset.mediaZoom);
  const [mediaOffsetY, setMediaOffsetY] = useState(initialPreset.mediaOffsetY);
  const [showViewfinder, setShowViewfinder] = useState(initialPreset.showViewfinder);

  // Video Playback & Async Preload State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadingPhase, setVideoLoadingPhase] = useState('');
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [isDragOverPreview, setIsDragOverPreview] = useState(false);

  // Background Export State (no watching required, progress tracked)
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<FramedVideoExportProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assetsTick, setAssetsTick] = useState(0);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const persistCustomPresets = (next: VideoFramePreset[]) => {
    setCustomPresets(next);
    try {
      window.localStorage.setItem(VIDEO_FRAME_PRESETS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const applyVideoPreset = (preset: VideoFramePreset) => {
    setActivePresetId(preset.id);
    setTemplate(preset.template);
    setAccentColor(preset.accentColor);
    setLogoUrl(preset.logoUrl || OFFICIAL_FORTNEWS_VECTOR_LOGO_URL);
    setLogoScale(preset.logoScale || 105);
    setReportagemTitle(preset.reportagemTitle);
    setReportagemBottomLabel(preset.reportagemBottomLabel);
    setReportagemCityTag(preset.reportagemCityTag);
    setTopHeadline(preset.topHeadline);
    setCityTag(preset.cityTag);
    setBottomHeadline(preset.bottomHeadline);
    setLeadText(preset.leadText);
    setGroupLabel(preset.groupLabel);
    setPortalUrl(preset.portalUrl);
    setSocialHandle(preset.socialHandle);
    setSloganText(preset.sloganText);
    setShowViewfinder(preset.showViewfinder);
    setMediaFit(preset.mediaFit);
    setMediaZoom(preset.mediaZoom);
    setMediaOffsetY(preset.mediaOffsetY);
    showToast(`Preset "${preset.name}" aplicado na moldura.`);
  };

  const buildCurrentPresetPayload = (id: string, name: string): VideoFramePreset => ({
    id,
    name,
    builtIn: false,
    template,
    accentColor,
    logoUrl,
    logoScale,
    reportagemTitle,
    reportagemBottomLabel,
    reportagemCityTag,
    topHeadline,
    cityTag,
    bottomHeadline,
    leadText,
    groupLabel,
    portalUrl,
    socialHandle,
    sloganText,
    showViewfinder,
    mediaFit,
    mediaZoom,
    mediaOffsetY,
  });

  const handleSavePreset = (asNew = false) => {
    const existingCustom = customPresets.find((p) => p.id === activePresetId);
    if (!asNew && existingCustom) {
      const updated = buildCurrentPresetPayload(existingCustom.id, existingCustom.name);
      persistCustomPresets(customPresets.map((p) => (p.id === existingCustom.id ? updated : p)));
      showToast(`Preset "${existingCustom.name}" atualizado (Logo ${logoScale}%).`);
      return;
    }

    const cleanName = newPresetName.trim() || `Moldura Personalizada ${customPresets.length + 1}`;
    const created = buildCurrentPresetPayload(`custom-frame-${Date.now()}`, cleanName);
    persistCustomPresets([...customPresets, created]);
    setActivePresetId(created.id);
    setNewPresetName('');
    setShowNewPresetForm(false);
    showToast(`Preset "${created.name}" salvo com sucesso!`);
  };

  const handleSetDefaultPreset = (id: string) => {
    setDefaultPresetId(id);
    try {
      window.localStorage.setItem(VIDEO_FRAME_DEFAULT_PRESET_KEY, id);
    } catch {
      // Ignore storage error
    }
    const target = allPresets.find((p) => p.id === id);
    showToast(`"${target?.name || 'Preset'}" definido como padrão ao abrir o estúdio.`);
  };

  const handleDeleteCustomPreset = (id: string) => {
    const target = customPresets.find((p) => p.id === id);
    const next = customPresets.filter((p) => p.id !== id);
    persistCustomPresets(next);
    if (activePresetId === id) {
      setActivePresetId(BUILTIN_VIDEO_FRAME_PRESETS[0].id);
    }
    if (defaultPresetId === id) {
      setDefaultPresetId(BUILTIN_VIDEO_FRAME_PRESETS[0].id);
      try {
        window.localStorage.setItem(
          VIDEO_FRAME_DEFAULT_PRESET_KEY,
          BUILTIN_VIDEO_FRAME_PRESETS[0].id
        );
      } catch {
        // Ignore
      }
    }
    if (target) showToast(`Preset "${target.name}" removido.`);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Preload Logo Image + Auto-trim transparent padding for crisp full-width rendering
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      logoImgRef.current = img;
      logoTrimmedRef.current = trimTransparentImage(img);
      setAssetsTick((t) => t + 1);
    };
    img.onerror = () => {
      if (!active) return;
      logoImgRef.current = null;
      logoTrimmedRef.current = null;
      setAssetsTick((t) => t + 1);
    };
    img.src = logoUrl;
    return () => {
      active = false;
    };
  }, [logoUrl]);

  // Preload Photo Image
  useEffect(() => {
    let active = true;
    if (!photoUrl) {
      photoImgRef.current = null;
      setAssetsTick((t) => t + 1);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      photoImgRef.current = img;
      setAssetsTick((t) => t + 1);
    };
    img.onerror = () => {
      if (!active) return;
      photoImgRef.current = null;
      setAssetsTick((t) => t + 1);
    };
    img.src = photoUrl;
    return () => {
      active = false;
    };
  }, [photoUrl]);

  // Draws ONLY the opaque background + video/photo layer inside the frame's viewport
  const drawMediaLayer = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      mediaEl: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null
    ) => {
      const W = CANVAS_W;
      const H = CANVAS_H;
      if (template === 'news_horizontal') {
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, W, H);
        drawMediaIntoWindow(ctx, mediaEl, 0, 528, W, 620, mediaFit, mediaZoom, mediaOffsetY);
      } else {
        const trimmed = logoTrimmedRef.current;
        const logoAspect = trimmed ? trimmed.width / Math.max(1, trimmed.height) : 3.15;
        const m = getVerticalFullScreenMetrics(logoScale, logoAspect);
        ctx.fillStyle = '#050507';
        ctx.fillRect(0, 0, W, H);
        drawMediaIntoWindow(
          ctx,
          mediaEl,
          0,
          m.videoY,
          W,
          m.videoH,
          mediaFit,
          mediaZoom,
          mediaOffsetY
        );
      }
    },
    [template, mediaFit, mediaZoom, mediaOffsetY, logoScale, assetsTick]
  );

  // Draws ONLY the moldura graphics (supports transparent video cutout for CapCut & fast offline compositing!)
  const drawOverlayLayer = useCallback(
    (ctx: CanvasRenderingContext2D, transparentCutout = false) => {
      const W = CANVAS_W;
      const H = CANVAS_H;

      if (transparentCutout) {
        ctx.clearRect(0, 0, W, H);
      }

      if (template === 'news_horizontal') {
        /* ==================== PADRÃO 2: NEWS HORIZONTAL (9:16) ==================== */
        const headerH = 528;
        const videoY = headerH;
        const videoH = 620;
        const orangeBarY = videoY + videoH;
        const orangeBarH = 92;
        const whiteCardY = orangeBarY + orangeBarH;
        const footerSplitY = 1790;
        const footerSplitH = 68;
        const bottomStripY = footerSplitY + footerSplitH;
        const bottomStripH = H - bottomStripY;

        // Top Dark Editorial Header Band
        ctx.save();
        const gradTop = ctx.createLinearGradient(0, 0, W, headerH);
        gradTop.addColorStop(0, '#0B0B0F');
        gradTop.addColorStop(0.55, '#13131A');
        gradTop.addColorStop(1, '#09090B');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, W, headerH);

        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.font = '900 112px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORTNEWS', W * 0.5, 290);
        ctx.fillText('NEWS', W * 0.78, 420);

        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, 12, headerH);
        ctx.fillRect(W - 12, 0, 12, headerH);

        const logoSource = logoTrimmedRef.current || logoImgRef.current;
        const scaleRatio = Math.max(0.6, Math.min(1.6, logoScale / 100));
        const plaqueW = Math.min(W - 64, Math.max(540, Math.round(620 * scaleRatio)));
        const plaqueH = Math.min(220, Math.max(156, Math.round(186 * Math.min(1.18, scaleRatio))));
        const plaqueX = (W - plaqueW) / 2;
        const plaqueY = 0;
        drawRoundedRectPath(ctx, plaqueX, plaqueY, plaqueW, plaqueH, {
          tl: 0,
          tr: 0,
          br: 20,
          bl: 20,
        });
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        if (logoSource) {
          const pad = 16;
          const availW = plaqueW - pad * 2;
          const availH = plaqueH - pad * 2;
          const scale = Math.min(availW / logoSource.width, availH / logoSource.height);
          const lw = logoSource.width * scale;
          const lh = logoSource.height * scale;
          ctx.drawImage(
            logoSource,
            plaqueX + (plaqueW - lw) / 2,
            plaqueY + (plaqueH - lh) / 2,
            lw,
            lh
          );
        } else {
          ctx.fillStyle = '#09090B';
          ctx.font = '900 66px "Plus Jakarta Sans", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FortNews', W / 2, plaqueH / 2);
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 68px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const headLines = wrapCanvasText(
          ctx,
          (topHeadline || 'PLANTÃO REGIONAL').toUpperCase(),
          585
        ).slice(0, 2);
        let hy = headLines.length === 1 ? 286 : 238;
        for (const line of headLines) {
          ctx.fillText(line, 44, hy);
          hy += 82;
        }

        const cleanCity = (cityTag || 'CIMBAJU').trim().toUpperCase();
        ctx.font = '900 54px "Plus Jakarta Sans", Inter, sans-serif';
        const measuredCityW = ctx.measureText(cleanCity).width;
        const badgeW = Math.min(540, Math.max(330, measuredCityW + 84));
        const badgeH = 104;
        const badgeX = W - badgeW;
        const badgeY = 368;
        drawRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, {
          tl: 28,
          tr: 0,
          br: 0,
          bl: 28,
        });
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cleanCity, badgeX + badgeW / 2, badgeY + badgeH / 2 + 2, badgeW - 44);
        ctx.restore();

        if (showViewfinder) {
          drawViewfinderCorners(
            ctx,
            0,
            videoY,
            W,
            videoH,
            34,
            72,
            6,
            'rgba(170,176,184,0.9)',
            accentColor
          );
        }

        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, orangeBarY, W, orangeBarH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.rect(0, orangeBarY, W - 150, orangeBarH);
        ctx.clip();
        for (let sx = -60; sx < W; sx += 38) {
          ctx.beginPath();
          ctx.moveTo(sx, orangeBarY + orangeBarH + 10);
          ctx.lineTo(sx + 54, orangeBarY - 10);
          ctx.stroke();
        }
        ctx.restore();

        const iconBoxW = 148;
        const iconBoxX = W - iconBoxW;
        ctx.fillStyle = '#09090B';
        ctx.fillRect(iconBoxX, orangeBarY, iconBoxW, orangeBarH);
        drawVideoClapperIcon(
          ctx,
          iconBoxX + iconBoxW / 2,
          orangeBarY + orangeBarH / 2 + 2,
          56,
          accentColor
        );

        const whiteCardH = footerSplitY - whiteCardY;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, whiteCardY, W, whiteCardH);

        const textPadX = 42;
        const textMaxW = W - textPadX * 2;
        ctx.fillStyle = '#09090B';
        ctx.font = '900 44px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const mainTitleLines = wrapCanvasText(
          ctx,
          (bottomHeadline || 'MANCHETE PRINCIPAL DO PORTAL FORTNEWS').toUpperCase(),
          textMaxW
        ).slice(0, 4);

        let cy = whiteCardY + 42;
        for (const line of mainTitleLines) {
          ctx.fillText(line, textPadX, cy);
          cy += 54;
        }

        cy += 16;
        ctx.fillStyle = '#18181B';
        ctx.font = '400 34px Inter, system-ui, sans-serif';
        const maxLeadLines = Math.max(2, Math.floor((footerSplitY - 22 - cy) / 44));
        const bodyLines = wrapCanvasText(ctx, leadText, textMaxW).slice(0, maxLeadLines);
        for (const line of bodyLines) {
          ctx.fillText(line, textPadX, cy);
          cy += 44;
        }

        const leftW = 432;
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, footerSplitY, leftW, footerSplitH);
        ctx.fillStyle = '#09090B';
        ctx.fillRect(leftW, footerSplitY, W - leftW, footerSplitH);

        ctx.fillStyle = '#09090B';
        ctx.font = '800 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(groupLabel || 'Grupo FortNews', leftW / 2, footerSplitY + footerSplitH / 2 + 1);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 32px Inter, sans-serif';
        ctx.fillText(
          portalUrl || 'www.jornalfortnews.com.br',
          leftW + (W - leftW) / 2,
          footerSplitY + footerSplitH / 2 + 1
        );

        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(0, bottomStripY, W, bottomStripH);
        ctx.fillStyle = '#18181B';
        ctx.font = '600 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          sloganText || 'Informação que conecta você',
          W / 2,
          bottomStripY + bottomStripH / 2
        );
      } else {
        /* ==================== PADRÃO OFICIAL FORTNEWS · TELA INTEIRA 9:16 (EDGE-TO-EDGE) ==================== */
        const logoSource = logoTrimmedRef.current || logoImgRef.current;
        const logoAspect = logoSource
          ? logoSource.width / Math.max(1, logoSource.height)
          : 3.15;
        const m = getVerticalFullScreenMetrics(logoScale, logoAspect);

        const cardX = 0;
        const cardW = W; // 1080px — Tela inteira sem margens laterais
        const {
          drawW,
          drawH,
          logoTopY,
          logoBottomY,
          headerY,
          headerH,
          videoY,
          videoH,
          orangeFooterY,
          orangeFooterH,
          splitFooterY,
          splitFooterH,
        } = m;

        // 1. Clean Light Full-Width Top Strip behind the official black+orange waveform (100% contrast, zero side margins)
        ctx.save();
        const topStripGrad = ctx.createLinearGradient(0, 0, 0, headerY);
        topStripGrad.addColorStop(0, '#FFFFFF');
        topStripGrad.addColorStop(1, '#EFF1F5');
        ctx.fillStyle = topStripGrad;
        ctx.fillRect(0, 0, W, headerY);
        ctx.restore();

        // 2. Full-Width Black Editorial Header Block + Left Vertical Accent Stripe
        ctx.fillStyle = '#050507';
        ctx.fillRect(cardX, headerY, cardW, headerH);

        ctx.fillStyle = accentColor;
        ctx.fillRect(cardX, headerY, 16, headerH);

        // 3. Official Vectorized FortNews Logo (centered, auto-trimmed, user-resizable)
        if (logoSource) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
          ctx.shadowBlur = 16;
          ctx.shadowOffsetY = 4;
          const lx = Math.round((W - drawW) / 2);
          ctx.drawImage(logoSource, lx, logoTopY, drawW, drawH);
          ctx.restore();
        } else {
          drawTopAudioWaveform(ctx, W / 2, 36, '#09090B', accentColor);
          drawSlantedFortNewsBadge(ctx, W / 2, 64, accentColor, null, true, sloganText);
        }

        // 4. Bold White 2-Line Headline + Inline Rounded Orange Tag Pill (e.g. CIMBAJU)
        const rawTitle = (reportagemTitle || 'COBERTURA EXCLUSIVA\nMATÉRIA EM VÍDEO')
          .trim()
          .toUpperCase();
        const vCity = (reportagemCityTag || 'CIMBAJU').trim().toUpperCase();

        ctx.save();
        const headlineLeftX = 52;
        const headlineRightLimit = W - 44;
        const fullLineMaxW = headlineRightLimit - headlineLeftX;

        // Pre-measure inline orange city pill width
        ctx.font = '900 36px "Plus Jakarta Sans", Inter, sans-serif';
        const pillTextW = vCity ? ctx.measureText(vCity).width : 0;
        const pillW = vCity ? Math.min(320, Math.max(180, pillTextW + 46)) : 0;
        const pillH = 56;
        const pillGap = vCity ? 28 : 0;

        let titleFontSize = 64;
        ctx.font = `900 ${titleFontSize}px "Plus Jakarta Sans", Inter, sans-serif`;
        const explicitLines = rawTitle
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        let line1 = '';
        let line2 = '';

        if (explicitLines.length >= 2) {
          line1 = explicitLines[0];
          line2 = explicitLines.slice(1).join(' ');
        } else {
          const wrapped = wrapCanvasText(ctx, rawTitle, fullLineMaxW);
          if (wrapped.length >= 2) {
            line1 = wrapped[0];
            line2 = wrapped.slice(1).join(' ');
          } else {
            line1 = wrapped[0] || rawTitle;
            line2 = '';
          }
        }

        const line2MaxW = vCity ? fullLineMaxW - pillW - pillGap : fullLineMaxW;
        while (titleFontSize > 42) {
          ctx.font = `900 ${titleFontSize}px "Plus Jakarta Sans", Inter, sans-serif`;
          const w1 = ctx.measureText(line1).width;
          const w2 = line2 ? ctx.measureText(line2).width : 0;
          if (w1 <= fullLineMaxW && w2 <= line2MaxW) break;
          titleFontSize -= 2;
        }

        ctx.font = `900 ${titleFontSize}px "Plus Jakarta Sans", Inter, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const headlineZoneTop = Math.max(headerY + 110, logoBottomY + 14);
        const headlineZoneBottom = videoY - 14;
        const headlineZoneMid = (headlineZoneTop + headlineZoneBottom) / 2;

        if (line2) {
          const line1Y = headlineZoneMid - 38;
          const line2Y = headlineZoneMid + 38;
          ctx.fillText(line1, headlineLeftX, line1Y, fullLineMaxW);
          ctx.fillText(line2, headlineLeftX, line2Y, line2MaxW);

          if (vCity) {
            const line2ActualW = Math.min(line2MaxW, ctx.measureText(line2).width);
            const pillX = Math.min(
              headlineRightLimit - pillW,
              Math.max(headlineLeftX + line2ActualW + 34, headlineRightLimit - pillW - 6)
            );
            const pillY = line2Y - pillH / 2 - 2;
            drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, {
              tl: 14,
              tr: 14,
              br: 14,
              bl: 14,
            });
            ctx.fillStyle = accentColor;
            ctx.fill();

            ctx.fillStyle = '#050507';
            ctx.font = '900 36px "Plus Jakarta Sans", Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(vCity, pillX + pillW / 2, pillY + pillH / 2 + 2, pillW - 24);
          }
        } else {
          const singleY = headlineZoneMid;
          ctx.fillText(line1, headlineLeftX, singleY, line2MaxW);
          if (vCity) {
            const pillX = headlineRightLimit - pillW;
            const pillY = singleY - pillH / 2 - 2;
            drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, {
              tl: 14,
              tr: 14,
              br: 14,
              bl: 14,
            });
            ctx.fillStyle = accentColor;
            ctx.fill();

            ctx.fillStyle = '#050507';
            ctx.font = '900 36px "Plus Jakarta Sans", Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(vCity, pillX + pillW / 2, pillY + pillH / 2 + 2, pillW - 24);
          }
        }
        ctx.restore();

        // 5. Two-Tone Camera Viewfinder L-Brackets inside Full-Screen Video Viewport
        if (showViewfinder) {
          drawViewfinderCorners(
            ctx,
            cardX,
            videoY,
            cardW,
            videoH,
            40,
            106,
            10,
            'rgba(150, 155, 163, 0.92)',
            accentColor
          );
        }

        // 6. Full-Width Bottom Solid Orange Editorial Banner
        ctx.fillStyle = accentColor;
        ctx.fillRect(cardX, orangeFooterY, cardW, orangeFooterH);

        ctx.fillStyle = '#050507';
        ctx.font = '900 74px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          (reportagemBottomLabel || 'REPORTAGEM').toUpperCase(),
          W / 2,
          orangeFooterY + 58,
          cardW - 64
        );

        ctx.font = '800 43px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillText(
          (sloganText || 'INFORMAÇÃO QUE CONECTA VOCÊ').toUpperCase(),
          W / 2,
          orangeFooterY + 124,
          cardW - 64
        );

        // 7. Full-Width Bottom Diagonal Split Footer Bar (Black Left + Orange Slash + Cool Grey Right)
        const slashTopX = Math.round(W * 0.64);
        const slashBotX = Math.round(W * 0.605);
        const slashW = 18;

        ctx.beginPath();
        ctx.moveTo(0, splitFooterY);
        ctx.lineTo(slashTopX, splitFooterY);
        ctx.lineTo(slashBotX, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = '#050507';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(slashTopX, splitFooterY);
        ctx.lineTo(slashTopX + slashW, splitFooterY);
        ctx.lineTo(slashBotX + slashW, H);
        ctx.lineTo(slashBotX, H);
        ctx.closePath();
        ctx.fillStyle = accentColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(slashTopX + slashW, splitFooterY);
        ctx.lineTo(W, splitFooterY);
        ctx.lineTo(W, H);
        ctx.lineTo(slashBotX + slashW, H);
        ctx.closePath();
        ctx.fillStyle = '#9EA3AB';
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        ctx.font = '700 37px Inter, sans-serif';
        ctx.fillText(
          portalUrl || 'www.jornalfortnews.com.br',
          slashBotX / 2 + 8,
          splitFooterY + splitFooterH / 2 + 1,
          slashBotX - 44
        );

        ctx.font = '700 38px Inter, sans-serif';
        const rightZoneStart = slashTopX + slashW;
        const rightZoneW = W - rightZoneStart;
        ctx.fillText(
          socialHandle || '@fortnews_',
          rightZoneStart + rightZoneW / 2 - 4,
          splitFooterY + splitFooterH / 2 + 1,
          rightZoneW - 32
        );
      }
    },
    [
      template,
      accentColor,
      logoUrl,
      logoScale,
      topHeadline,
      cityTag,
      bottomHeadline,
      leadText,
      reportagemTitle,
      reportagemBottomLabel,
      reportagemCityTag,
      groupLabel,
      portalUrl,
      socialHandle,
      sloganText,
      showViewfinder,
      assetsTick,
    ]
  );

  // Full composite renderer for preview & PNG export (falls back to preloaded first frame so viewport is NEVER black!)
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, transparentCutout = false) => {
      if (transparentCutout) {
        drawOverlayLayer(ctx, true);
        return;
      }
      let mediaEl: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null =
        photoImgRef.current;
      if (mediaSourceType === 'video' && videoUrl) {
        const liveVid = videoElRef.current;
        if (liveVid && liveVid.readyState >= 2 && liveVid.videoWidth > 0) {
          mediaEl = liveVid;
        } else if (videoPosterCanvasRef.current) {
          mediaEl = videoPosterCanvasRef.current;
        }
      }
      drawMediaLayer(ctx, mediaEl);
      drawOverlayLayer(ctx, false);
    },
    [drawMediaLayer, drawOverlayLayer, mediaSourceType, videoUrl]
  );

  // Smooth preview animation loop (NEVER resizes canvas and NEVER restarts on timeupdate!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const renderOnce = () => {
      drawFrame(ctx, false);
    };

    if (mediaSourceType === 'video' && videoUrl && isPlaying) {
      const tick = () => {
        renderOnce();
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(rafId);
    }

    renderOnce();
    return undefined;
  }, [drawFrame, mediaSourceType, videoUrl, isPlaying]);

  // Cancel any in-flight preload or export on unmount
  useEffect(() => {
    return () => {
      preloadAbortRef.current?.abort();
      exportAbortRef.current?.abort();
    };
  }, []);

  const processVideoFile = async (file: File) => {
    // Abort any previous preload in flight
    preloadAbortRef.current?.abort();
    const preloadController = new AbortController();
    preloadAbortRef.current = preloadController;

    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    videoPosterCanvasRef.current = null;
    setIsVideoLoading(true);
    setVideoLoadingPhase('Carregando vídeo e decodificando primeiro quadro...');
    setVideoFileName(file.name);
    setIsPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoUrl(url);
    setMediaSourceType('video');

    try {
      const preloaded = await preloadVideoFirstFrame(url, preloadController.signal);
      if (preloadController.signal.aborted) return;

      videoPosterCanvasRef.current = preloaded.posterCanvas;
      setVideoDuration(preloaded.duration);
      setAssetsTick((t) => t + 1);
      setIsVideoLoading(false);
      setVideoLoadingPhase('');
      showToast(
        `Vídeo "${file.name}" carregado e pronto! Clique em "Exportar Vídeo Pronto (MP4 com Áudio)".`
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsVideoLoading(false);
      setVideoLoadingPhase('');
      showToast(
        `Vídeo "${file.name}" carregado. Se a prévia não aparecer, converta para MP4 (H.264).`
      );
    }
  };

  const processPhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setMediaSourceType('photo');
        showToast(`Imagem "${file.name}" aplicada dentro da moldura.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMediaFile = (file: File) => {
    if (isExporting) {
      showToast('Aguarde a exportação atual terminar ou cancele antes de trocar a mídia.');
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|mov|webm|m4v|mkv|avi|ogv)$/i.test(lowerName);
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(lowerName);

    if (isVideo) {
      void processVideoFile(file);
    } else if (isImage) {
      processPhotoFile(file);
    } else {
      showToast('Formato não suportado. Envie ou arraste um vídeo (MP4/MOV/WebM) ou uma foto (JPG/PNG/WebP).');
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processVideoFile(file);
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processPhotoFile(file);
  };

  const handleUploadAnyMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    handleMediaFile(file);
  };

  const hasDraggedFiles = (dt: DataTransfer | null) => {
    if (!dt) return false;
    return Array.from(dt.types || []).includes('Files');
  };

  const handleUploadDragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (isExporting || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    uploadDragDepthRef.current += 1;
    setIsDragOverUpload(true);
  };

  const handleUploadDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (isExporting || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleUploadDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    uploadDragDepthRef.current = Math.max(0, uploadDragDepthRef.current - 1);
    if (uploadDragDepthRef.current === 0) {
      setIsDragOverUpload(false);
    }
  };

  const handleUploadDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    uploadDragDepthRef.current = 0;
    setIsDragOverUpload(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleMediaFile(file);
    }
  };

  const handlePreviewDragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (isExporting || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    previewDragDepthRef.current += 1;
    setIsDragOverPreview(true);
  };

  const handlePreviewDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (isExporting || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handlePreviewDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    previewDragDepthRef.current = Math.max(0, previewDragDepthRef.current - 1);
    if (previewDragDepthRef.current === 0) {
      setIsDragOverPreview(false);
    }
  };

  const handlePreviewDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    previewDragDepthRef.current = 0;
    setIsDragOverPreview(false);
    if (isExporting) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleMediaFile(file);
    }
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
        showToast('Logo do topo atualizado.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImportPauta = (pautaId: string) => {
    setSelectedPautaId(pautaId);
    const p = pautas.find((item) => item.id === pautaId);
    if (!p) return;

    const shortTop = p.seal === 'Break News' || p.seal === 'Urgente'
      ? `PLANTÃO\n${p.seal.toUpperCase()}`
      : p.title.split(' ').slice(0, 4).join(' ').toUpperCase();

    setTopHeadline(shortTop);
    setCityTag(p.city.toUpperCase());
    setBottomHeadline(p.title.toUpperCase());
    setLeadText(p.summary);

    const words = p.title.toUpperCase().split(/\s+/).filter(Boolean);
    const splitMid = Math.ceil(Math.min(words.length, 6) / 2);
    const rLine1 = words.slice(0, splitMid).join(' ');
    const rLine2 = words.slice(splitMid, 6).join(' ') || 'MATÉRIA EM VÍDEO';
    setReportagemTitle(`${rLine1}\n${rLine2}`);
    setReportagemCityTag(p.city.replace('Regional ', '').toUpperCase());

    if (p.imageUrl && mediaSourceType === 'photo') {
      setPhotoUrl(p.imageUrl);
    }
    showToast('Dados da matéria importados para a moldura!');
  };

  const handleTogglePlay = async () => {
    const vid = videoElRef.current;
    if (!vid || !videoUrl) return;
    if (vid.paused) {
      try {
        await vid.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleRestartVideo = async () => {
    const vid = videoElRef.current;
    if (!vid || !videoUrl) return;
    vid.currentTime = 0;
    setVideoCurrentTime(0);
    try {
      await vid.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleDownloadFullPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) drawFrame(ctx, false);
    const link = document.createElement('a');
    link.download = `fortnews-${template}-capa-1080x1920-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Capa / Post PNG (1080×1920) baixada!');
  };

  const handleDownloadTransparentFramePng = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    drawFrame(ctx, true);

    const link = document.createElement('a');
    link.download = `fortnews-moldura-transparente-${template}-1080x1920-${Date.now()}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
    showToast(
      'Moldura PNG Transparente (1080×1920) baixada! Pronta para sobrepor no CapCut, Premiere ou Canva.'
    );
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    setIsExporting(false);
    setExportProgress(null);
    showToast('Exportação de vídeo cancelada.');
  };

  const handleExportFramedVideo = async () => {
    if (!videoUrl || mediaSourceType !== 'video') {
      showToast('Envie um vídeo MP4/MOV primeiro para exportar o vídeo com a moldura.');
      return;
    }

    // Pause live preview so export runs silently in the background without competing for decoder
    const previewVid = videoElRef.current;
    if (previewVid && !previewVid.paused) {
      previewVid.pause();
      setIsPlaying(false);
    }

    // Pre-render the static moldura overlay ONCE on a dedicated transparent offscreen canvas
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = CANVAS_W;
    overlayCanvas.height = CANVAS_H;
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!overlayCtx) {
      showToast('Não foi possível preparar a moldura para exportação.');
      return;
    }
    drawOverlayLayer(overlayCtx, true);

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setIsExporting(true);
    setExportProgress({
      percent: 1,
      phase: 'Iniciando renderização silenciosa...',
      currentSec: 0,
      totalSec: videoDuration,
    });

    try {
      const result = await exportFramedVideo({
        videoUrl,
        width: CANVAS_W,
        height: CANVAS_H,
        renderVideoLayer: (ctx, offVideo) => drawMediaLayer(ctx, offVideo),
        overlayCanvas,
        signal: controller.signal,
        onProgress: (p) => setExportProgress(p),
      });

      const dlUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `fortnews-video-moldura-${template}-${Date.now()}.${result.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);

      showToast(
        result.extension === 'mp4'
          ? `Vídeo MP4 pronto com moldura${result.hasAudio ? ' e áudio original' : ''} baixado com sucesso!`
          : `Vídeo pronto com moldura${result.hasAudio ? ' e áudio original' : ''} baixado com sucesso!`
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        showToast(
          'Não foi possível renderizar este formato de vídeo no navegador. Tente MP4 (H.264) ou baixe a Moldura PNG Transparente.'
        );
      }
    } finally {
      exportAbortRef.current = null;
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Offscreen Preview Video Element (mounted offscreen instead of display:none so frames never drop/flash black) */}
      {videoUrl && (
        <video
          ref={videoElRef}
          src={videoUrl}
          playsInline
          preload="auto"
          muted={isMuted}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            setVideoDuration(Number.isFinite(v.duration) ? v.duration : 0);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) drawFrame(ctx, false);
          }}
          onSeeked={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) drawFrame(ctx, false);
          }}
          onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
          }}
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
        />
      )}

      {/* Top Info & Template Selector */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Molduras Oficiais FortNews para Vídeos (Reels, Shorts & TikTok 9:16)
            </h2>
            <p className="text-xs text-zinc-400">
              Escolha entre os dois padrões oficiais das redes da FortNews, edite os textos, envie seu vídeo e exporte o vídeo pronto ou a moldura PNG transparente.
            </p>
          </div>

          <div className="w-full lg:w-96">
            <PautaSearchPicker
              pautas={pautas}
              selectedPautaId={selectedPautaId}
              onSelect={(id) => {
                if (!id) {
                  setSelectedPautaId('');
                } else {
                  handleImportPauta(id);
                }
              }}
              placeholder="Importar matéria por nº (ex: 3, FN-0003) ou título..."
              ariaLabel="Importar matéria da redação por número interno ou título"
            />
          </div>
        </div>

        {/* Presets da Moldura (Salvar, Aplicar, Definir Padrão) */}
        <div className="rounded-lg border border-white/10 bg-[#0B0B0E] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Bookmark className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
              Presets Salvos da Moldura
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {customPresets.some((p) => p.id === activePresetId) && (
                <button
                  type="button"
                  onClick={() => handleSavePreset(false)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/50 bg-[#fa6607]/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#fa6607]/25 cursor-pointer"
                >
                  <Save className="h-3 w-3 text-[#fa6607]" aria-hidden="true" />
                  Atualizar Preset
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNewPresetForm((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#16161A] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:border-[#fa6607]/60 hover:text-white cursor-pointer"
              >
                <Plus className="h-3 w-3 text-[#fa6607]" aria-hidden="true" />
                Salvar Novo Preset
              </button>
            </div>
          </div>

          {showNewPresetForm && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSavePreset(true);
                  }
                }}
                placeholder="Nome do preset (ex: Reportagem Logo Grande 125%)"
                className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-[#121216] px-3 py-1.5 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSavePreset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Salvar Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewPresetForm(false);
                  setNewPresetName('');
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {allPresets.map((preset) => {
              const isActive = preset.id === activePresetId;
              const isDefault = preset.id === defaultPresetId;
              return (
                <div
                  key={preset.id}
                  className={`inline-flex items-center rounded-lg border text-[11px] transition-colors ${
                    isActive
                      ? 'border-[#fa6607] bg-[#fa6607]/15 text-white'
                      : 'border-white/10 bg-[#16161A] text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => applyVideoPreset(preset)}
                    className="px-2.5 py-1.5 font-medium cursor-pointer"
                  >
                    {preset.name}
                    <span className="ml-1.5 font-mono text-[10px] text-zinc-400 tabular-nums">
                      {preset.logoScale}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDefaultPreset(preset.id)}
                    title={isDefault ? 'Preset padrão ao abrir' : 'Definir como padrão ao abrir'}
                    aria-label={isDefault ? 'Preset padrão' : `Definir ${preset.name} como padrão`}
                    className={`px-1.5 py-1.5 cursor-pointer ${
                      isDefault ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-300'
                    }`}
                  >
                    <Star className={`h-3 w-3 ${isDefault ? 'fill-current' : ''}`} />
                  </button>
                  {!preset.builtIn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomPreset(preset.id)}
                      title="Excluir preset"
                      aria-label={`Excluir preset ${preset.name}`}
                      className="pr-2 pl-1 py-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 Official Frame Pattern Switcher */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTemplate('reportagem_vertical')}
            className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
              template === 'reportagem_vertical'
                ? 'border-[#fa6607] bg-[#fa6607]/12'
                : 'border-white/10 bg-[#16161A] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-white">
                <Film className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Padrão 1 · Oficial FortNews Tela Inteira (9:16)
              </span>
              <span className="font-mono text-[10px] text-zinc-400">1080×1920</span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
              Tela cheia 100% sem margens laterais, logo oficial FortNews vetorizado redimensionável, manchete em 2 linhas + tag CIMBAJU, cantoneiras, tarja REPORTAGEM e rodapé diagonal.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTemplate('news_horizontal')}
            className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
              template === 'news_horizontal'
                ? 'border-[#fa6607] bg-[#fa6607]/12'
                : 'border-white/10 bg-[#16161A] hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-white">
                <Newspaper className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Padrão 2 · News / Vídeo Horizontal (9:16)
              </span>
              <span className="font-mono text-[10px] text-zinc-400">1080×1920</span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
              Topo escuro com logo oficial FortNews, manchete + tag laranja da cidade, vídeo horizontal central com mira nos cantos, faixa laranja com ícone de vídeo e card branco inferior.
            </p>
          </button>
        </div>

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace: Left Controls + Right Live 9:16 Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Upload de Vídeo ou Foto (com Drag & Drop) */}
          <div
            onDragEnter={handleUploadDragEnter}
            onDragOver={handleUploadDragOver}
            onDragLeave={handleUploadDragLeave}
            onDrop={handleUploadDrop}
            className={`rounded-xl border p-5 space-y-4 transition-colors duration-150 ${
              isDragOverUpload
                ? 'border-[#fa6607] bg-[#fa6607]/10'
                : 'border-white/10 bg-[#111114]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                1. Vídeo ou Imagem da Moldura
              </h3>
              <div className="inline-flex rounded-lg border border-white/10 bg-[#0A0A0A] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMediaSourceType('video')}
                  className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    mediaSourceType === 'video'
                      ? 'bg-[#fa6607] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSourceType('photo')}
                  className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    mediaSourceType === 'photo'
                      ? 'bg-[#fa6607] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Foto / Capa
                </button>
              </div>
            </div>

            {/* Interactive Drag & Drop Upload Zone */}
            <input
              ref={combinedMediaInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*,image/*"
              onChange={handleUploadAnyMedia}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => combinedMediaInputRef.current?.click()}
              disabled={isExporting}
              className={`group w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa6607] ${
                isDragOverUpload
                  ? 'border-[#fa6607] bg-[#fa6607]/15'
                  : 'border-white/15 bg-[#0B0B0E] hover:border-[#fa6607]/60 hover:bg-[#141418]'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                    isDragOverUpload
                      ? 'border-[#fa6607] bg-[#fa6607] text-white'
                      : 'border-white/10 bg-[#16161A] text-[#fa6607] group-hover:border-[#fa6607]/50'
                  }`}
                >
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">
                    {isDragOverUpload
                      ? 'Solte o vídeo ou foto aqui para aplicar na moldura'
                      : 'Arraste e solte um vídeo ou foto aqui'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    MP4, MOV, WebM, JPG, PNG ou WebP · clique aqui ou use os botões abaixo
                  </p>
                </div>
              </div>
            </button>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={handleUploadVideo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fa6607]/50 bg-[#fa6607]/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#fa6607]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Video className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                {videoFileName ? 'Trocar Vídeo (MP4/MOV)' : 'Enviar Vídeo (MP4 / MOV)'}
              </button>

              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadPhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#16161A] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ImageIcon className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Enviar Foto de Fundo
              </button>
            </div>

            {videoFileName && (
              <div className="rounded-lg border border-white/10 bg-[#16161A] px-3.5 py-2 text-[11px] text-zinc-300 flex items-center justify-between gap-2">
                <span className="truncate">
                  Vídeo ativo: <strong className="text-white">{videoFileName}</strong>
                </span>
                <span className="font-mono tabular-nums text-zinc-400 shrink-0">
                  {formatSec(videoDuration)}
                </span>
              </div>
            )}

            {/* Framing Controls */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Enquadramento</label>
                <select
                  value={mediaFit}
                  onChange={(e) => setMediaFit(e.target.value as 'cover' | 'contain')}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="cover">Preencher (Cover)</option>
                  <option value="contain">Ajustar Inteiro (Contain)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 flex justify-between text-[11px] text-zinc-400">
                  <span>Zoom</span>
                  <span className="font-mono tabular-nums">{mediaZoom}%</span>
                </label>
                <input
                  type="range"
                  min={80}
                  max={180}
                  value={mediaZoom}
                  onChange={(e) => setMediaZoom(Number(e.target.value))}
                  className="w-full accent-[#fa6607]"
                />
              </div>
              <div>
                <label className="mb-1 flex justify-between text-[11px] text-zinc-400">
                  <span>Posição Vertical</span>
                  <span className="font-mono tabular-nums">{mediaOffsetY}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mediaOffsetY}
                  onChange={(e) => setMediaOffsetY(Number(e.target.value))}
                  className="w-full accent-[#fa6607]"
                />
              </div>
            </div>
          </div>

          {/* 2. Textos da Moldura */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              2. Textos do {template === 'news_horizontal' ? 'Padrão News Horizontal' : 'Padrão Reportagem Vertical'}
            </h3>

            {template === 'news_horizontal' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Chamada Superior (2 linhas · Esquerda)
                    </label>
                    <textarea
                      rows={2}
                      value={topHeadline}
                      onChange={(e) => setTopHeadline(e.target.value)}
                      placeholder="Ex: MEGAOPERAÇÃO&#10;DA PM"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Tag Laranja da Cidade / Editoria (Direita)
                    </label>
                    <input
                      type="text"
                      value={cityTag}
                      onChange={(e) => setCityTag(e.target.value)}
                      placeholder="Ex: MAIRIPORÃ ou CAIEIRAS"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {NEWS_TERRITORIES.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCityTag(c.replace('Regional ', '').toUpperCase())}
                          className="rounded border border-white/10 bg-[#16161A] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-[#fa6607] hover:text-white cursor-pointer"
                        >
                          {c.replace('Regional ', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Manchete Principal (Card Branco · Caixa Alta)
                  </label>
                  <textarea
                    rows={3}
                    value={bottomHeadline}
                    onChange={(e) => setBottomHeadline(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Texto / Lide da Matéria (Card Branco)
                  </label>
                  <textarea
                    rows={3}
                    value={leadText}
                    onChange={(e) => setLeadText(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Manchete do Topo (2 linhas · Caixa Alta)
                  </label>
                  <textarea
                    rows={2}
                    value={reportagemTitle}
                    onChange={(e) => setReportagemTitle(e.target.value)}
                    placeholder={'COBERTURA EXCLUSIVA\nMATÉRIA EM VÍDEO'}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Tag Laranja ao lado da 2ª Linha (Cidade / Região)
                    </label>
                    <input
                      type="text"
                      value={reportagemCityTag}
                      onChange={(e) => setReportagemCityTag(e.target.value)}
                      placeholder="Ex: CIMBAJU"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {NEWS_TERRITORIES.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setReportagemCityTag(c.replace('Regional ', '').toUpperCase())
                          }
                          className="rounded border border-white/10 bg-[#16161A] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-[#fa6607] hover:text-white cursor-pointer"
                        >
                          {c.replace('Regional ', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Tarja Laranja Inferior (Título Grande)
                    </label>
                    <input
                      type="text"
                      value={reportagemBottomLabel}
                      onChange={(e) => setReportagemBottomLabel(e.target.value)}
                      placeholder="Ex: REPORTAGEM"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {REPORTAGEM_BADGE_PRESETS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReportagemBottomLabel(tag)}
                          className="rounded border border-white/10 bg-[#16161A] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-[#fa6607] hover:text-white cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Identidade Visual, Cores & Rodapé */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              3. Cores, Logo & Rodapé
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] text-zinc-400">Cor de Destaque da Moldura</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-12 rounded-lg border border-white/15 bg-[#0A0A0A] p-1 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {ACCENT_PRESETS.map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setAccentColor(p.color)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#16161A] px-2 py-1 text-[10px] text-zinc-300 hover:border-white/30 cursor-pointer"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] text-zinc-400">Logo do Topo</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#16161A] px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                    Trocar Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl(OFFICIAL_FORTNEWS_VECTOR_LOGO_URL);
                      setLogoScale(105);
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Logo Oficial FortNews
                  </button>
                </div>

                {/* Tamanho do Logo */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Tamanho do Logo</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#fa6607] tabular-nums">
                        {logoScale}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setLogoScale(105)}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Padrão
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Tamanho do logo da moldura"
                    min={60}
                    max={160}
                    step={5}
                    value={logoScale}
                    onChange={(e) => setLogoScale(Number(e.target.value))}
                    className="w-full accent-[#fa6607] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Site no Rodapé</label>
                <input
                  type="text"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  {template === 'news_horizontal' ? 'Marca Esquerda' : '@Instagram Direita'}
                </label>
                {template === 'news_horizontal' ? (
                  <input
                    type="text"
                    value={groupLabel}
                    onChange={(e) => setGroupLabel(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                  />
                ) : (
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Slogan</label>
                <input
                  type="text"
                  value={sloganText}
                  onChange={(e) => setSloganText(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showViewfinder}
                onChange={(e) => setShowViewfinder(e.target.checked)}
                className="h-4 w-4 accent-[#fa6607] cursor-pointer"
              />
              Exibir cantoneiras de câmera (mira branca nos 4 cantos do vídeo)
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN: Live 9:16 Preview + Player + 3 Export Actions (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">
                Prévia Oficial em Tempo Real (9:16)
              </span>
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                1080×1920 px
              </span>
            </div>

            {/* 9:16 Live Canvas Preview + Drag & Drop + Visual Preloader Overlay (zero black screen on load/export) */}
            <div
              onDragEnter={handlePreviewDragEnter}
              onDragOver={handlePreviewDragOver}
              onDragLeave={handlePreviewDragLeave}
              onDrop={handlePreviewDrop}
              className={`relative mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border bg-zinc-950 shadow-xl transition-colors duration-150 ${
                isDragOverPreview ? 'border-[#fa6607] ring-2 ring-[#fa6607]/40' : 'border-white/15'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block w-full h-auto"
              />

              {isDragOverPreview && !isExporting && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#fa6607] bg-[#fa6607]/20 text-[#fa6607]">
                    <Upload className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white">
                    Solte aqui
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    Aplicar vídeo ou foto diretamente na moldura
                  </p>
                </div>
              )}

              {(isVideoLoading || isExporting) && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-6 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fa6607]/40 bg-[#fa6607]/15 shadow-lg">
                    <Loader2
                      className="h-7 w-7 animate-spin text-[#fa6607]"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-white">
                    {isExporting
                      ? 'Preparando Download MP4'
                      : 'Carregando Vídeo'}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">
                    {isExporting
                      ? exportProgress?.phase || 'Decodificando quadros e áudio original...'
                      : videoLoadingPhase || 'Decodificando primeiro quadro...'}
                  </p>

                  {isExporting && (
                    <div className="mt-4 w-full max-w-[220px] space-y-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-[#fa6607] transition-all duration-150"
                          style={{ width: `${Math.max(4, exportProgress?.percent ?? 4)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-zinc-300 tabular-nums">
                        <span>MP4 · 1080×1920</span>
                        <span className="font-bold text-[#fa6607]">
                          {exportProgress?.percent ?? 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Playback Bar (when video is uploaded) */}
            {mediaSourceType === 'video' && videoUrl && (
              <div className="rounded-lg border border-white/10 bg-[#16161A] p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#fa6607] px-3 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          Play
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartVideo}
                      aria-label="Reiniciar vídeo"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    {formatSec(videoCurrentTime)} / {formatSec(videoDuration)}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={videoDuration || 1}
                  step={0.1}
                  value={videoCurrentTime}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (videoElRef.current) videoElRef.current.currentTime = next;
                    setVideoCurrentTime(next);
                  }}
                  className="w-full accent-[#fa6607]"
                />
              </div>
            )}

            {/* 3 Export Actions */}
            <div className="space-y-2.5 pt-1">
              {isExporting ? (
                <div className="rounded-lg border border-[#fa6607]/40 bg-[#16161A] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold text-white">
                      <Loader2 className="h-4 w-4 animate-spin text-[#fa6607]" aria-hidden="true" />
                      {exportProgress?.phase || 'Renderizando vídeo MP4...'}
                    </span>
                    <span className="font-mono font-bold text-[#fa6607] tabular-nums">
                      {exportProgress?.percent ?? 0}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#fa6607] transition-all duration-150"
                      style={{ width: `${Math.max(3, exportProgress?.percent ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span>
                      Processamento silencioso em segundo plano — o download inicia automaticamente ao concluir.
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelExport}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 cursor-pointer shrink-0"
                    >
                      <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExportFramedVideo}
                  disabled={!videoUrl || mediaSourceType !== 'video' || isVideoLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVideoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Film className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isVideoLoading
                    ? 'Preparando vídeo...'
                    : 'Exportar Vídeo Pronto com Moldura (MP4 com Áudio)'}
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadTransparentFramePng}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#fa6607]/50 bg-[#fa6607]/12 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#fa6607]/20 cursor-pointer"
              >
                <Layers className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                Baixar Moldura PNG Transparente (CapCut / Premiere)
              </button>

              <button
                type="button"
                onClick={handleDownloadFullPng}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#16161A] px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 cursor-pointer"
              >
                <Download className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                Baixar Capa / Frame PNG (1080×1920)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
