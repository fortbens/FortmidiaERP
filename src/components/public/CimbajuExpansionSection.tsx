import React from 'react';
import { CIMBAJU_CITIES } from '../../data/initialData';
import { MediaFrame } from '../MediaFrame';

interface CimbajuExpansionSectionProps {
  onOpenProposal: (quota: string) => void;
}

export const CimbajuExpansionSection: React.FC<CimbajuExpansionSectionProps> = ({
  onOpenProposal,
}) => {
  return (
    <section className="border-b border-white/10 bg-[#0D0D0F] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          {/* Editorial & Events Authority Proof */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-[#D4AF37]">
                Presença Regional & Governança Executiva
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                Liderança multimídia integrada nos 5 municípios do CIMBAJU
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
                A notícia gera tráfego; o tráfego consolida autoridade; e a autoridade se converte em receita recorrente para nossos patrocinadores.
              </p>
            </div>

            {/* 5 Municipalities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-y border-white/10 py-5">
              {CIMBAJU_CITIES.map((city) => (
                <div key={city} className="text-sm font-medium text-zinc-200">
                  {city}
                </div>
              ))}
              <div className="text-sm font-medium text-[#FF6600]">Cobertura 24/7</div>
            </div>

            {/* Physical Expansion & Governance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Trio Elétrico FortNews & Eventos
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Unidade móvel audiovisual para praças e eventos populares, além da premiação anual Melhores do Ano FortNews no Complexo CIMBAJU.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Governança Corporativa
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Direção executiva de Emerson Carneiro, integrando Portal FortNews, impressos, rede OOH de outdoors e núcleo FortTech OS.
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => onOpenProposal('Pacote Integrado 4 Pilares')}
                className="w-full sm:w-auto rounded-lg border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/5 cursor-pointer"
              >
                Patrocinar Melhores do Ano ou Trio Elétrico
              </button>
            </div>
          </div>

          {/* Real Brand Mockups Showcase */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141416]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <MediaFrame
                  src="/assets/aistudio/Mockup_Revista_4c06e73a.jpg"
                  alt="Revista Mensal Grupo FortNews — Edição A Força do CIMBAJU"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 border-t border-white/10">
                <p className="text-xs text-[#FF6600] font-medium">Divisão de Impressos</p>
                <p className="mt-0.5 font-display text-sm font-bold text-white">
                  Revista A4 Mensal & Tabloide
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141416]">
              <div className="aspect-[3/4] w-full overflow-hidden">
                <MediaFrame
                  src="/assets/aistudio/Mockup_Trofeu_fec05b30.jpg"
                  alt="Troféu oficial Melhores do Ano Grupo FortNews"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 border-t border-white/10">
                <p className="text-xs text-[#D4AF37] font-medium">Premiação Corporativa</p>
                <p className="mt-0.5 font-display text-sm font-bold text-white">
                  Melhores do Ano FortNews
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
