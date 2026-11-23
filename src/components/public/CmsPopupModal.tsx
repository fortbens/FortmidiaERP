import React, { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { MediaFrame } from '../MediaFrame';

interface CmsPopupModalProps {
  onOpenProposal: (quotaTitle?: string) => void;
}

export const CmsPopupModal: React.FC<CmsPopupModalProps> = ({ onOpenProposal }) => {
  const { popupConfig, siteSettings, popupPreviewOpen, setPopupPreviewOpen } = useFortMidia();
  const [visible, setVisible] = useState(false);

  // Respect UX rule: wait at least 10s dwell + user scroll/interaction before auto-showing
  useEffect(() => {
    if (!popupConfig.enabled) {
      setVisible(false);
      return;
    }

    const storageKey = 'fortmidia_popup_dismissed';
    if (sessionStorage.getItem(storageKey) === '1' && !popupPreviewOpen) {
      return;
    }

    let hasInteracted = false;
    const onInteract = () => {
      hasInteracted = true;
    };
    window.addEventListener('scroll', onInteract, { once: true });
    window.addEventListener('pointerdown', onInteract, { once: true });

    const delayMs = Math.max(10, popupConfig.delaySeconds || 12) * 1000;
    const timer = window.setTimeout(() => {
      if (hasInteracted) {
        setVisible(true);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onInteract);
      window.removeEventListener('pointerdown', onInteract);
    };
  }, [popupConfig.enabled, popupConfig.delaySeconds, popupPreviewOpen]);

  const isShowing = popupPreviewOpen || visible;
  if (!isShowing) return null;

  const handleClose = () => {
    setVisible(false);
    setPopupPreviewOpen(false);
    try {
      sessionStorage.setItem('fortmidia_popup_dismissed', '1');
    } catch {
      // Ignore
    }
  };

  const handleAction = () => {
    handleClose();
    if (popupConfig.ctaAction === 'proposal') {
      onOpenProposal(popupConfig.title);
    } else if (popupConfig.ctaAction === 'whatsapp') {
      const cleanPhone = siteSettings.whatsappNumber.replace(/\D/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        siteSettings.whatsappMessage
      )}`;
      window.location.href = url;
    }
  };

  const isExternalLink =
    popupConfig.ctaAction === 'news' || popupConfig.ctaAction === 'custom_url';
  const externalHref =
    popupConfig.ctaAction === 'news' ? siteSettings.newsPortalUrl : popupConfig.customUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cms-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/15 bg-[#121215] shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar aviso"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 border border-white/15 text-zinc-200 hover:bg-black cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {popupConfig.imageUrl && (
          <div className="h-48 w-full overflow-hidden border-b border-white/10">
            <MediaFrame
              src={popupConfig.imageUrl}
              alt={popupConfig.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <p className="text-xs font-medium text-[#D4AF37]">{popupConfig.eyebrow}</p>
          <h3 id="cms-popup-title" className="mt-1 font-display text-xl font-bold text-white">
            {popupConfig.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{popupConfig.message}</p>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Agora não
            </button>

            {isExternalLink ? (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500]"
              >
                {popupConfig.ctaLabel}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                {popupConfig.ctaLabel}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
