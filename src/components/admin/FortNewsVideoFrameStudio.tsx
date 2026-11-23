import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Newspaper,
  Pause,
  Play,
  RotateCcw,
  Square,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { OFFICIAL_FORTNEWS_LOGO_URL } from '../FortMidiaLogo';
import { PautaSearchPicker } from './PautaSearchPicker';

export type VideoFrameTemplate = 'news_horizontal' | 'reportagem_vertical';

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
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'square';

  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bottom = y + h - inset;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(left, top + arm);
  ctx.lineTo(left, top);
  ctx.lineTo(left + arm, top);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(right - arm, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + arm);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(left, bottom - arm);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + arm, bottom);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(right - arm, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - arm);
  ctx.stroke();

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
  media: HTMLVideoElement | HTMLImageElement | null,
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
    const mw = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth || media.width;
    const mh = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight || media.height;
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
    ctx.fillText('Envie um vídeo MP4 ou foto ao lado', x + w / 2, y + h / 2 + 24);
  }

  ctx.restore();
}

export const FortNewsVideoFrameStudio: React.FC = () => {
  const { pautas, newsPortalSettings } = useFortMidia();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio capture cache for MediaRecorder export
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Template & Branding
  const [template, setTemplate] = useState<VideoFrameTemplate>('news_horizontal');
  const [accentColor, setAccentColor] = useState('#fa6607');
  const [logoUrl, setLogoUrl] = useState(
    newsPortalSettings.logoUrl || OFFICIAL_FORTNEWS_LOGO_URL
  );
  const [selectedPautaId, setSelectedPautaId] = useState('');

  // Editable Text Fields (Shared + Template-Specific)
  const [topHeadline, setTopHeadline] = useState('MEGAOPERAÇÃO\nDA PM');
  const [cityTag, setCityTag] = useState('MAIRIPORÃ');
  const [bottomHeadline, setBottomHeadline] = useState(
    'FORÇA TÁTICA DESARTICULA LABORATÓRIO DO TRÁFICO E APREENDE 1,3 TONELADA DE DROGAS E ARMAS EM MAIRIPORÃ'
  );
  const [leadText, setLeadText] = useState(
    'A Polícia Militar do Estado de São Paulo, por meio da equipe de Força Tática do 26º BPM/M, desmantelou uma refinaria clandestina de entorpecentes na noite do último sábado...'
  );

  // Vertical Reportagem Specific Fields
  const [reportagemTitle, setReportagemTitle] = useState('FRANCO DA ROCHA PULSA!');
  const [reportagemSub, setReportagemSub] = useState(
    'ACOMPANHE AS COMEMORAÇÕES NO COMPLEXO DE LAZER DO PARQUE VITÓRIA.'
  );
  const [reportagemBottomLabel, setReportagemBottomLabel] = useState('REPORTAGEM');
  const [reportagemCityTag, setReportagemCityTag] = useState('CIMBAJU');

  // Footer & Identity
  const [groupLabel, setGroupLabel] = useState('Grupo FortNews');
  const [portalUrl, setPortalUrl] = useState('www.jornalfortnews.com.br');
  const [socialHandle, setSocialHandle] = useState('@grupofortnews');
  const [sloganText, setSloganText] = useState('Informação que conecta você');

  // Media Controls
  const [mediaSourceType, setMediaSourceType] = useState<'video' | 'photo'>('photo');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('/assets/aistudio/Microfone_dc305011.jpg');
  const [mediaFit, setMediaFit] = useState<'cover' | 'contain'>('cover');
  const [mediaZoom, setMediaZoom] = useState(100);
  const [mediaOffsetY, setMediaOffsetY] = useState(50);
  const [showViewfinder, setShowViewfinder] = useState(true);

  // Video Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Export State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [assetsTick, setAssetsTick] = useState(0);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Preload Logo Image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      logoImgRef.current = img;
      setAssetsTick((t) => t + 1);
    };
    img.onerror = () => {
      if (!active) return;
      logoImgRef.current = null;
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

  // Core Canvas Renderer (supports both full preview/export AND transparent cutout PNG overlay)
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, transparentCutout = false) => {
      const W = CANVAS_W;
      const H = CANVAS_H;
      const mediaEl =
        mediaSourceType === 'video' && videoUrl ? videoElRef.current : photoImgRef.current;

      ctx.clearRect(0, 0, W, H);

      if (template === 'news_horizontal') {
        /* ==================== TEMPLATE 1: PADRÃO NEWS HORIZONTAL (VÍDEOS 1 & 3) ==================== */
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

        // 1. Center Video / Photo or Transparent Hole
        if (!transparentCutout) {
          drawMediaIntoWindow(
            ctx,
            mediaEl,
            0,
            videoY,
            W,
            videoH,
            mediaFit,
            mediaZoom,
            mediaOffsetY
          );
        }

        // 2. Top Dark Editorial Header Band
        ctx.save();
        ctx.fillStyle = '#09090C';
        ctx.fillRect(0, 0, W, headerH);

        // Subtle dark studio/news watermark background inside header
        const gradTop = ctx.createLinearGradient(0, 0, W, headerH);
        gradTop.addColorStop(0, '#0B0B0F');
        gradTop.addColorStop(0.55, '#13131A');
        gradTop.addColorStop(1, '#09090B');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, W, headerH);

        // Subtle decorative faded NEWS grid text watermark in header
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.font = '900 112px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FORTNEWS', W * 0.5, 290);
        ctx.fillText('NEWS', W * 0.78, 420);

        // Subtle vertical orange edge bar on far left & right of top band
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, 12, headerH);
        ctx.fillRect(W - 12, 0, 12, headerH);

        // Top-center White Logo Plaque
        const plaqueW = 620;
        const plaqueH = 186;
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

        if (logoImgRef.current) {
          const lImg = logoImgRef.current;
          const pad = 18;
          const availW = plaqueW - pad * 2;
          const availH = plaqueH - pad * 2;
          const scale = Math.min(availW / lImg.width, availH / lImg.height);
          const lw = lImg.width * scale;
          const lh = lImg.height * scale;
          ctx.drawImage(lImg, plaqueX + (plaqueW - lw) / 2, plaqueY + (plaqueH - lh) / 2, lw, lh);
        } else {
          ctx.fillStyle = '#09090B';
          ctx.font = '900 66px "Plus Jakarta Sans", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FortNews', W / 2, plaqueH / 2);
        }

        // Left Massive Bold White Headline (2 lines)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 68px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const headLines = wrapCanvasText(ctx, (topHeadline || 'PLANTÃO REGIONAL').toUpperCase(), 585).slice(0, 2);
        let hy = headLines.length === 1 ? 286 : 238;
        for (const line of headLines) {
          ctx.fillText(line, 44, hy);
          hy += 82;
        }

        // Right Flush Orange City Pill Badge
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

        // 3. Viewfinder 4 Corners on Video Window
        if (showViewfinder) {
          drawViewfinderCorners(
            ctx,
            0,
            videoY,
            W,
            videoH,
            34,
            72,
            5,
            'rgba(255,255,255,0.82)'
          );
        }

        // 4. Orange Divider Bar + Right Black Video Icon Square
        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, orangeBarY, W, orangeBarH);

        // Subtle diagonal studio stripes on orange bar
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

        // Right Black Square Badge with Orange Clapper/Video Icon
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

        // 5. White Editorial News Card Below Video
        const whiteCardH = footerSplitY - whiteCardY;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, whiteCardY, W, whiteCardH);

        // Bold Black ALL-CAPS Main Title
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

        // Body Lead Paragraph
        cy += 16;
        ctx.fillStyle = '#18181B';
        ctx.font = '400 34px Inter, system-ui, sans-serif';
        const maxLeadLines = Math.max(2, Math.floor((footerSplitY - 22 - cy) / 44));
        const bodyLines = wrapCanvasText(ctx, leadText, textMaxW).slice(0, maxLeadLines);
        for (const line of bodyLines) {
          ctx.fillText(line, textPadX, cy);
          cy += 44;
        }

        // 6. Split Two-Tone Footer Bar (Orange Left + Black Right)
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

        // 7. Bottom Light Gray Slogan Strip
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
        /* ==================== TEMPLATE 2: PADRÃO REPORTAGEM VERTICAL (VÍDEO 2) ==================== */
        const railW = 20;
        const headerH = 382;
        const videoX = railW;
        const videoY = headerH;
        const videoW = W - railW * 2;
        const videoH = 1270;
        const orangeFooterY = videoY + videoH;
        const orangeFooterH = 186;
        const blackFooterY = orangeFooterY + orangeFooterH;
        const blackFooterH = H - blackFooterY;

        // 1. Center Vertical Video / Photo or Transparent Hole
        if (!transparentCutout) {
          drawMediaIntoWindow(
            ctx,
            mediaEl,
            videoX,
            videoY,
            videoW,
            videoH,
            mediaFit,
            mediaZoom,
            mediaOffsetY
          );
        }

        // 2. Left & Right Orange Side Rails along video window
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, railW, blackFooterY);
        ctx.fillRect(W - railW, 0, railW, blackFooterY);

        // 3. Top Black Header Band
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, W, headerH);

        // Top-Center White Logo Plaque
        const plaqueW = 540;
        const plaqueH = 152;
        const plaqueX = (W - plaqueW) / 2;
        const plaqueY = 0;
        drawRoundedRectPath(ctx, plaqueX, plaqueY, plaqueW, plaqueH, {
          tl: 0,
          tr: 0,
          br: 18,
          bl: 18,
        });
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        if (logoImgRef.current) {
          const lImg = logoImgRef.current;
          const pad = 14;
          const availW = plaqueW - pad * 2;
          const availH = plaqueH - pad * 2;
          const scale = Math.min(availW / lImg.width, availH / lImg.height);
          const lw = lImg.width * scale;
          const lh = lImg.height * scale;
          ctx.drawImage(lImg, plaqueX + (plaqueW - lw) / 2, plaqueY + (plaqueH - lh) / 2, lw, lh);
        } else {
          ctx.fillStyle = '#09090B';
          ctx.font = '900 58px "Plus Jakarta Sans", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FortNews', W / 2, plaqueH / 2);
        }

        // Centered Bold White Headline
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 50px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const vTitleLines = wrapCanvasText(
          ctx,
          (reportagemTitle || 'FRANCO DA ROCHA PULSA!').toUpperCase(),
          W - 96
        ).slice(0, 2);
        let ty = 178;
        for (const line of vTitleLines) {
          ctx.fillText(line, W / 2, ty);
          ty += 58;
        }

        // Centered Bold White Subtitle
        ctx.fillStyle = '#F4F4F5';
        ctx.font = '700 27px Inter, sans-serif';
        const vSubLines = wrapCanvasText(
          ctx,
          (reportagemSub || '').toUpperCase(),
          W - 110
        ).slice(0, 2);
        ty += 8;
        for (const line of vSubLines) {
          ctx.fillText(line, W / 2, ty);
          ty += 36;
        }

        // Crisp thin white inner frame + Viewfinder corners inside video window
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 3;
        ctx.strokeRect(videoX + 2, videoY + 2, videoW - 4, videoH - 4);
        ctx.restore();

        if (showViewfinder) {
          drawViewfinderCorners(
            ctx,
            videoX,
            videoY,
            videoW,
            videoH,
            34,
            68,
            5,
            'rgba(255,255,255,0.85)'
          );
        }

        // Top-Right Floating Orange City/Region Badge inside Video Frame
        const vCity = (reportagemCityTag || 'CIMBAJU').trim().toUpperCase();
        if (vCity) {
          ctx.save();
          ctx.font = '900 34px "Plus Jakarta Sans", Inter, sans-serif';
          const tw = ctx.measureText(vCity).width;
          const pillW = Math.min(440, Math.max(200, tw + 56));
          const pillH = 62;
          const pillX = videoX + videoW - pillW - 58;
          const pillY = videoY + 56;

          drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, {
            tl: 14,
            tr: 14,
            br: 14,
            bl: 14,
          });
          ctx.fillStyle = accentColor;
          ctx.fill();

          ctx.fillStyle = '#09090B';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(vCity, pillX + pillW / 2, pillY + pillH / 2 + 1, pillW - 28);
          ctx.restore();
        }

        // 4. Bottom Solid Orange Reportagem Bar
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, orangeFooterY, W, orangeFooterH);

        ctx.fillStyle = '#09090B';
        ctx.font = '900 66px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          (reportagemBottomLabel || 'REPORTAGEM').toUpperCase(),
          W / 2,
          orangeFooterY + 68
        );

        ctx.font = '800 38px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillText(
          (sloganText || 'INFORMAÇÃO QUE CONECTA VOCÊ').toUpperCase(),
          W / 2,
          orangeFooterY + 136
        );

        // 5. Bottom Solid Black Portal + Instagram Handle Bar
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, blackFooterY, W, blackFooterH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 32px Inter, sans-serif';
        ctx.textBaseline = 'middle';

        ctx.textAlign = 'left';
        ctx.fillText(
          portalUrl || 'www.jornalfortnews.com.br',
          48,
          blackFooterY + blackFooterH / 2
        );

        ctx.textAlign = 'right';
        ctx.fillText(
          socialHandle || '@grupofortnews',
          W - 48,
          blackFooterY + blackFooterH / 2
        );
      }
    },
    [
      template,
      accentColor,
      topHeadline,
      cityTag,
      bottomHeadline,
      leadText,
      reportagemTitle,
      reportagemSub,
      reportagemBottomLabel,
      reportagemCityTag,
      groupLabel,
      portalUrl,
      socialHandle,
      sloganText,
      mediaSourceType,
      videoUrl,
      mediaFit,
      mediaZoom,
      mediaOffsetY,
      showViewfinder,
      assetsTick,
    ]
  );

  // Continuous animation loop while video is playing, otherwise single render on state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const renderOnce = () => {
      drawFrame(ctx, false);
    };

    if (mediaSourceType === 'video' && videoUrl && (isPlaying || isRecording)) {
      const tick = () => {
        renderOnce();
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(rafId);
    }

    renderOnce();
    return undefined;
  }, [drawFrame, mediaSourceType, videoUrl, isPlaying, isRecording, videoCurrentTime]);

  // Recording elapsed seconds timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name);
    setMediaSourceType('video');
    setIsPlaying(false);
    setVideoCurrentTime(0);
    showToast(`Vídeo "${file.name}" carregado na moldura! Dê play ou clique em "Exportar Vídeo".`);
    e.target.value = '';
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setMediaSourceType('photo');
        showToast('Imagem aplicada dentro da moldura.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

    setReportagemTitle(p.title.split(':')[0].slice(0, 38).toUpperCase());
    setReportagemSub(p.summary.slice(0, 96).toUpperCase());
    setReportagemCityTag(p.city.toUpperCase());

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

  const handleStopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    const vid = videoElRef.current;
    if (vid && !vid.paused) {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleExportFramedVideo = async () => {
    const canvas = canvasRef.current;
    const vid = videoElRef.current;
    if (!canvas || !vid || !videoUrl || mediaSourceType !== 'video') {
      showToast('Envie um vídeo MP4/MOV primeiro para exportar o vídeo com a moldura.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      showToast('Seu navegador não suporta gravação direta. Use "Baixar Moldura PNG Transparente".');
      return;
    }

    try {
      const canvasStream = canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      // Attach original video audio via Web Audio API (single reusable source node per element)
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        if (!audioSourceRef.current) {
          audioSourceRef.current = audioCtxRef.current.createMediaElementSource(vid);
          audioDestRef.current = audioCtxRef.current.createMediaStreamDestination();
          audioSourceRef.current.connect(audioDestRef.current);
          audioSourceRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioDestRef.current) {
          tracks.push(...audioDestRef.current.stream.getAudioTracks());
        }
      } catch {
        // Proceed with video-only track if audio routing is blocked
      }

      const combinedStream = new MediaStream(tracks);
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = chosenMime
        ? new MediaRecorder(combinedStream, { mimeType: chosenMime, videoBitsPerSecond: 6_000_000 })
        : new MediaRecorder(combinedStream);

      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, {
          type: chosenMime || 'video/webm',
        });
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = `fortnews-video-moldura-${template}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(dlUrl), 3000);
        showToast('Vídeo com moldura FortNews exportado e baixado!');
      };

      recorderRef.current = recorder;
      vid.currentTime = 0;
      vid.muted = false;
      setIsMuted(false);
      setIsRecording(true);
      recorder.start(250);
      await vid.play();
      setIsPlaying(true);
    } catch {
      setIsRecording(false);
      showToast('Não foi possível gravar o vídeo. Tente baixar a Moldura PNG Transparente.');
    }
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden Real Video Element for Live Canvas Drawing */}
      {videoUrl && (
        <video
          ref={videoElRef}
          src={videoUrl}
          playsInline
          muted={isMuted}
          onLoadedMetadata={(e) => {
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
            if (isRecording) {
              handleStopRecording();
            }
          }}
          className="hidden"
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

        {/* 2 Official Frame Pattern Switcher */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                Padrão 1 · News / Vídeo Horizontal (9:16)
              </span>
              <span className="font-mono text-[10px] text-zinc-400">1080×1920</span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
              Topo escuro com logo FortNews, manchete + tag laranja da cidade, vídeo horizontal central com mira nos cantos, faixa laranja com ícone de vídeo e card branco inferior com manchete e lide.
            </p>
          </button>

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
                Padrão 2 · Reportagem / Vídeo Vertical (9:16)
              </span>
              <span className="font-mono text-[10px] text-zinc-400">1080×1920</span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
              Topo preto com logo FortNews + título centralizado, vídeo vertical em tela ampla com bordas laranja e selo CIMBAJU no canto, barra laranja "REPORTAGEM" e rodapé com site + @instagram.
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
          {/* 1. Upload de Vídeo ou Foto */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-4">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#fa6607]/50 bg-[#fa6607]/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#fa6607]/25 cursor-pointer"
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#16161A] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 cursor-pointer"
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
                    Título Principal do Topo (Centralizado)
                  </label>
                  <input
                    type="text"
                    value={reportagemTitle}
                    onChange={(e) => setReportagemTitle(e.target.value)}
                    placeholder="Ex: FRANCO DA ROCHA PULSA!"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    Subtítulo do Topo (Centralizado)
                  </label>
                  <textarea
                    rows={2}
                    value={reportagemSub}
                    onChange={(e) => setReportagemSub(e.target.value)}
                    placeholder="Ex: ACOMPANHE AS COMEMORAÇÕES NO COMPLEXO DE LAZER DO PARQUE VITÓRIA."
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Selo Flutuante no Vídeo (Canto Superior Direito)
                    </label>
                    <input
                      type="text"
                      value={reportagemCityTag}
                      onChange={(e) => setReportagemCityTag(e.target.value)}
                      placeholder="Ex: CIMBAJU"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-zinc-400">
                      Tarja Laranja Inferior (Grande)
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
                <div className="flex items-center gap-2">
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
                    onClick={() => setLogoUrl(OFFICIAL_FORTNEWS_LOGO_URL)}
                    className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Padrão FortNews
                  </button>
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

            {/* 9:16 Live Canvas Preview */}
            <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border border-white/15 bg-black shadow-xl">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block w-full h-auto"
              />
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
            <div className="space-y-2 pt-1">
              {isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                  Finalizar & Baixar Vídeo ({formatSec(recordingSeconds)})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExportFramedVideo}
                  disabled={!videoUrl || mediaSourceType !== 'video'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRecording ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4" aria-hidden="true" />
                  )}
                  Exportar Vídeo Pronto com Moldura (com Áudio)
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
