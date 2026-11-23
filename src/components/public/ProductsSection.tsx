import React, { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { QuotaCategory } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

interface ProductsSectionProps {
  onSelectQuota: (quotaTitle: string) => void;
}

const FILTERS: { id: 'all' | QuotaCategory; label: string }[] = [
  { id: 'all', label: 'Todos os Planos' },
  { id: 'podcast', label: 'Podcast 16h–20h' },
  { id: 'ooh', label: 'Mídia OOH Bimestral' },
  { id: 'editorial', label: 'Reportagens & Revista' },
  { id: 'agencia', label: 'Social Media & Branding' },
];

export const ProductsSection: React.FC<ProductsSectionProps> = ({ onSelectQuota }) => {
  const { quotas, siteSettings } = useFortMidia();
  const [activeFilter, setActiveFilter] = useState<'all' | QuotaCategory>('all');

  const filteredQuotas =
    activeFilter === 'all' ? quotas : quotas.filter((q) => q.category === activeFilter);

  const showPrices = siteSettings.showPublicPrices !== false;
  const consultLabel = siteSettings.consultPriceLabel?.trim() || 'Consulte';

  return (
    <section id="cotas" className="border-b border-white/10 bg-[#0D0D0F] py-14 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl min-w-0">
            <p className="text-xs font-medium" style={{ color: siteSettings.primaryColor }}>
              Vitrine Comercial & Cotas
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance] break-words">
              Formatos comerciais desenhados para retorno recorrente
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
              Cotas de patrocínio para o horário nobre do podcast (16h às 20h), circuitos bimestrais de outdoor, reportagens investigativas e gestão de reputação para empresas e lideranças.
            </p>
          </div>

          {/* Interactive Filter Tabs + Outdoor Map Shortcut */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 max-w-full">
            <div
              role="tablist"
              aria-label="Filtrar planos comerciais"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#141416] p-1 max-w-full"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f.id}
                  onClick={() => setActiveFilter(f.id)}
                  style={
                    activeFilter === f.id
                      ? { backgroundColor: siteSettings.primaryColor }
                      : undefined
                  }
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors sm:whitespace-nowrap cursor-pointer ${
                    activeFilter === f.id ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <a
              href="#mapa-outdoors"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Mapa dos Outdoors
            </a>
          </div>
        </div>

        {/* Asymmetric Bento / Commercial Grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {filteredQuotas.map((quota, idx) => {
            const isLeadCard = activeFilter === 'all' && idx === 0;
            return (
              <article
                key={quota.id}
                className={`glass-surface flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-white/25 min-w-0 ${
                  isLeadCard
                    ? 'lg:col-span-7'
                    : activeFilter === 'all' && idx === 1
                      ? 'lg:col-span-5'
                      : 'lg:col-span-4'
                }`}
              >
                <div className="min-w-0">
                  <div className="relative h-52 w-full overflow-hidden border-b border-white/10 bg-[#141416]">
                    <MediaFrame
                      src={quota.image}
                      alt={quota.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 sm:left-5 sm:right-5 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: siteSettings.goldColor }}>
                          {quota.categoryLabel}
                          {quota.highlight ? ` · ${quota.highlight}` : ''}
                        </p>
                        <h3 className="mt-0.5 font-display text-lg sm:text-xl font-bold text-white break-words">
                          {quota.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-4">
                      <div className="min-w-0">
                        {showPrices ? (
                          <>
                            <span className="font-mono text-2xl font-bold text-white tabular-nums">
                              {quota.priceLabel}
                            </span>
                            <span className="ml-2 text-xs text-zinc-400">{quota.billingCycle}</span>
                          </>
                        ) : (
                          <>
                            <span
                              className="font-display text-xl font-bold"
                              style={{ color: siteSettings.primaryColor }}
                            >
                              {consultLabel}
                            </span>
                            <span className="ml-2 text-xs text-zinc-400">
                              Plano personalizado sob medida
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 break-words">{quota.audience}</span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-300 break-words">
                      {quota.summary}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 border-y border-white/10 py-3">
                      {quota.specs.map((spec) => (
                        <div key={spec.label} className="min-w-0">
                          <div className="text-[11px] text-zinc-500">{spec.label}</div>
                          <div className="mt-0.5 font-mono text-xs font-medium text-zinc-200 tabular-nums break-words">
                            {!showPrices && spec.value.includes('R$') ? consultLabel : spec.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <ul className="mt-4 space-y-1.5 text-xs text-zinc-300">
                      {quota.deliverables.map((item) => (
                        <li key={item} className="break-words">— {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-6 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectQuota(quota.title)}
                    style={{ backgroundColor: siteSettings.primaryColor }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer text-center"
                  >
                    <span>
                      {showPrices ? 'Solicitar Proposta desta Cota' : `${consultLabel} · Solicitar Orçamento`}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Compliance & Revenue Split Transparency Note */}
        <div className="mt-10 rounded-xl border border-white/10 bg-[#121215] p-5 sm:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: siteSettings.goldColor }}>
              Modelo de Parcerias & Estúdio
            </p>
            <p className="mt-1 text-sm text-zinc-300 leading-relaxed break-words">
              {showPrices
                ? 'Apresentadores e parceiros comerciais contam com política transparente de repasse 50/50 em captações próprias ou locação avulsa de estúdio por R$ 300,00/hora com 100% dos patrocínios retidos pelo contratante.'
                : 'Apresentadores e parceiros comerciais contam com política transparente de repasse 50/50 em captações próprias ou locação avulsa de estúdio com 100% dos patrocínios retidos pelo contratante. Consulte condições exclusivas.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectQuota('Locação de Estúdio Profissional')}
            className="w-full md:w-auto shrink-0 sm:whitespace-nowrap rounded-lg border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer text-center"
          >
            {showPrices ? 'Reservar Estúdio (R$ 300/h)' : `Reservar Estúdio (${consultLabel})`}
          </button>
        </div>
      </div>
    </section>
  );
};
