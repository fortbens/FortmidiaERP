import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CimbajuCity } from '../../types/fortmidia';

interface ProposalModalProps {
  isOpen: boolean;
  initialQuota: string;
  onClose: () => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  initialQuota,
  onClose,
}) => {
  const { submitCommercialLead, quotas, siteSettings } = useFortMidia();
  const [companyOrName, setCompanyOrName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [quotaTitle, setQuotaTitle] = useState(
    initialQuota || quotas[0]?.title || 'Cota Comercial FortMídia'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialQuota) {
      setQuotaTitle(initialQuota);
    }
    setSubmitted(false);
    setError('');
  }, [initialQuota, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyOrName.trim() || !contact.trim()) {
      setError('Informe seu nome ou empresa e um contato de WhatsApp ou e-mail.');
      return;
    }

    submitCommercialLead({
      companyOrName: companyOrName.trim(),
      contact: contact.trim(),
      city,
      quotaTitle,
      notes: notes.trim() || 'Solicitação via Vitrine Comercial FortMídia.',
    });

    setSubmitted(true);
    setError('');
    setCompanyOrName('');
    setContact('');
    setNotes('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium text-[#FF6600]">Atendimento Comercial FortMídia</p>
            <h3 id="proposal-modal-title" className="mt-1 font-display text-xl font-bold text-white">
              Solicitar Proposta Personalizada
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h4 className="mt-4 font-display text-lg font-bold text-white">
              Solicitação registrada com sucesso
            </h4>
            <p className="mt-2 text-sm text-zinc-300">
              Nossa diretoria comercial recebeu seu interesse para <strong className="text-white">{quotaTitle}</strong>. Este lead já está visível no Painel Administrativo e entraremos em contato por {siteSettings.contactEmail} ou WhatsApp.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg bg-[#FF6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              Voltar ao Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nome ou Razão Social *
              </label>
              <input
                type="text"
                value={companyOrName}
                onChange={(e) => setCompanyOrName(e.target.value)}
                placeholder="Ex: Construtora Horizonte / Gabinete..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  WhatsApp ou E-mail *
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Cidade de Atuação
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as CimbajuCity)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#FF6600] focus:outline-none"
                >
                  {NEWS_TERRITORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Cota / Produto de Interesse
              </label>
              <select
                value={quotaTitle}
                onChange={(e) => setQuotaTitle(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#FF6600] focus:outline-none"
              >
                {quotas.map((q) => (
                  <option key={q.id} value={q.title}>
                    {q.title} (
                    {siteSettings.showPublicPrices !== false
                      ? q.priceLabel
                      : siteSettings.consultPriceLabel || 'Consulte'}
                    )
                  </option>
                ))}
                <option value="Pacote Integrado 4 Pilares">Pacote Integrado 4 Pilares (360°)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Objetivo da Campanha
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva prazo desejado, pontos de outdoor ou formato de interesse..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                Enviar Solicitação
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
