import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Instagram, Sparkles, X } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { EditorialPauta } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

interface SocialCreativeModalProps {
  pauta: EditorialPauta;
  onClose: () => void;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const SocialCreativeModal: React.FC<SocialCreativeModalProps> = ({ pauta, onClose }) => {
  const { newsPortalSettings, siteSettings, updatePautaContent } = useFortMidia();

  const [headlineOverlay, setHeadlineOverlay] = useState(
    pauta.socialCreative?.headlineOverlay || pauta.title.slice(0, 72)
  );
  const [instagramCaption, setInstagramCaption] = useState(
    pauta.socialCreative?.instagramCaption ||
      `${pauta.title}\n\n${pauta.summary}\n\nLeia a matéria completa no Portal ${newsPortalSettings.portalName}: ${siteSettings.newsPortalUrl}`
  );
  const [storyCta, setStoryCta] = useState(
    pauta.socialCreative?.storyCta || `Confira em ${newsPortalSettings.domain}`
  );
  const [hashtags, setHashtags] = useState(
    pauta.socialCreative?.hashtags || '#JornalFortNews #GrupoFortMidia #CIMBAJU #Noticias'
  );
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    updatePautaContent(pauta.id, {
      socialCreative: {
        headlineOverlay,
        instagramCaption,
        storyCta,
        hashtags,
        visualDirection:
          pauta.socialCreative?.visualDirection ||
          'Card editorial 1080x1350 com selo no topo, manchete forte e rodapé institucional.',
      },
    });
  }, [headlineOverlay, instagramCaption, storyCta, hashtags]);

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(`${instagramCaption}\n\n${hashtags}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark base background
      ctx.fillStyle = '#0B0B0E';
      ctx.fillRect(0, 0, 1080, 1350);

      // Top cover photo area (top 680px)
      if (pauta.imageUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.crossOrigin = 'anonymous';
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Image load failed'));
            el.src = pauta.imageUrl!;
          });
          const scale = Math.max(1080 / img.width, 720 / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (1080 - w) / 2, (720 - h) / 2, w, h);
        } catch {
          const grad = ctx.createLinearGradient(0, 0, 1080, 720);
          grad.addColorStop(0, newsPortalSettings.primaryColor || '#fa6607');
          grad.addColorStop(1, '#141418');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1080, 720);
        }
      }

      // Smooth dark gradient fade over photo
      const overlayGrad = ctx.createLinearGradient(0, 260, 0, 760);
      overlayGrad.addColorStop(0, 'rgba(11,11,14,0.08)');
      overlayGrad.addColorStop(0.65, 'rgba(11,11,14,0.78)');
      overlayGrad.addColorStop(1, '#0B0B0E');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 260, 1080, 500);

      // Top Brand Header Pill
      ctx.fillStyle = newsPortalSettings.primaryColor || '#fa6607';
      ctx.fillRect(0, 0, 1080, 94);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(newsPortalSettings.portalName.toUpperCase(), 64, 59);
      ctx.font = '600 22px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.textAlign = 'right';
      ctx.fillText(pauta.city.toUpperCase(), 1016, 57);
      ctx.textAlign = 'left';

      // Seal badge
      const sealColor =
        pauta.seal === 'Break News' || pauta.seal === 'Urgente'
          ? newsPortalSettings.primaryColor || '#fa6607'
          : '#FF6600';
      ctx.fillStyle = sealColor;
      ctx.fillRect(64, 650, 280, 48);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(pauta.seal.toUpperCase(), 84, 682);

      // Headline text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 54px sans-serif';
      const headLines = wrapCanvasText(ctx, headlineOverlay, 952).slice(0, 4);
      let y = 768;
      for (const line of headLines) {
        ctx.fillText(line, 64, y);
        y += 66;
      }

      // Accent divider
      ctx.fillStyle = '#FF6600';
      ctx.fillRect(64, y + 8, 120, 6);

      // Summary / Subhead
      ctx.fillStyle = '#D4D4D8';
      ctx.font = '400 28px sans-serif';
      const sumLines = wrapCanvasText(ctx, pauta.summary, 952).slice(0, 3);
      let sy = y + 60;
      for (const line of sumLines) {
        ctx.fillText(line, 64, sy);
        sy += 40;
      }

      // Bottom Footer Bar
      ctx.fillStyle = '#141418';
      ctx.fillRect(0, 1226, 1080, 124);
      ctx.fillStyle = '#FF6600';
      ctx.fillRect(0, 1226, 1080, 4);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(storyCta, 64, 1285);
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '400 22px sans-serif';
      ctx.fillText(`${newsPortalSettings.domain} · Grupo FortMídia`, 64, 1318);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `criativo-fortnews-${pauta.id}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-creative-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6600]">
              <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
              Estúdio de Criativos Sociais Automáticos
            </div>
            <h3 id="social-creative-title" className="mt-1 font-display text-lg font-bold text-white">
              Arte 1080×1350 & Legenda Pronta para Redes Sociais
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar criativo social"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Live Card Mockup 4:5 */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] aspect-[4/5] overflow-hidden rounded-xl border border-white/15 bg-[#0B0B0E] flex flex-col justify-between shadow-xl">
              <div>
                <div
                  className="flex items-center justify-between px-4 py-2 text-[11px] font-bold text-white"
                  style={{ backgroundColor: newsPortalSettings.primaryColor }}
                >
                  <span>{newsPortalSettings.portalName.toUpperCase()}</span>
                  <span className="opacity-90">{pauta.city.toUpperCase()}</span>
                </div>

                <div className="relative h-44 w-full bg-zinc-900 overflow-hidden">
                  {pauta.imageUrl && (
                    <MediaFrame
                      src={pauta.imageUrl}
                      alt={pauta.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/30 to-transparent" />
                  <span
                    className="absolute bottom-2 left-4 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white"
                    style={{ backgroundColor: newsPortalSettings.primaryColor }}
                  >
                    {pauta.seal}
                  </span>
                </div>

                <div className="px-4 pt-2 space-y-2">
                  <div className="font-display text-base font-extrabold leading-tight text-white">
                    {headlineOverlay}
                  </div>
                  <div className="h-1 w-12 bg-[#FF6600]" />
                  <p className="text-[11px] leading-snug text-zinc-300 line-clamp-3">
                    {pauta.summary}
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-[#FF6600] bg-[#141418] px-4 py-2.5">
                <div className="text-[11px] font-bold text-white truncate">{storyCta}</div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {newsPortalSettings.domain} · Grupo FortMídia
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="mt-4 w-full max-w-[340px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloading ? 'Renderizando Arte PNG...' : 'Baixar Arte PNG (1080×1350)'}
            </button>
          </div>

          {/* Right: Editable Creative Copy */}
          <div className="lg:col-span-7 space-y-4">
            {pauta.socialCreative?.visualDirection && (
              <div className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold">Direção de Arte IA:</span>{' '}
                  {pauta.socialCreative.visualDirection}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Manchete Curta na Arte (Overlay)
              </label>
              <input
                type="text"
                value={headlineOverlay}
                onChange={(e) => setHeadlineOverlay(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Chamada de Rodapé / Sticker de Story
              </label>
              <input
                type="text"
                value={storyCta}
                onChange={(e) => setStoryCta(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Legenda Pronta (Instagram / Facebook / WhatsApp)
              </label>
              <textarea
                rows={6}
                value={instagramCaption}
                onChange={(e) => setInstagramCaption(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Hashtags</label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-[#FF6600] focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCaption}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                )}
                {copied ? 'Legenda + Hashtags Copiadas!' : 'Copiar Legenda + Hashtags'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Salvar & Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
