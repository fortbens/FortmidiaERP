import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';

export const WhatsAppBubble: React.FC = () => {
  const { siteSettings } = useFortMidia();

  if (!siteSettings.whatsappEnabled || !siteSettings.whatsappNumber.trim()) {
    return null;
  }

  const cleanPhone = siteSettings.whatsappNumber.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(siteSettings.whatsappMessage);
  const href = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={siteSettings.whatsappLabel || 'Atendimento via WhatsApp'}
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-[#062010] shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline whitespace-nowrap">
        {siteSettings.whatsappLabel || 'WhatsApp Comercial'}
      </span>
    </a>
  );
};
