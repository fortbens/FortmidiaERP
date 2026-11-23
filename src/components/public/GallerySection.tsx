import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { GalleryCategory } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

interface GallerySectionProps {
  onOpenProposal: (quotaTitle?: string) => void;
}

const GALLERY_FILTERS: ('Todos' | GalleryCategory)[] = [
  'Todos',
  'Estúdio & Podcast',
  'Mídia OOH',
  'Impressos & Eventos',
  'Agência & Corporativo',
];

export const GallerySection: React.FC<GallerySectionProps> = ({ onOpenProposal }) => {
  const { galleryItems } = useFortMidia();
  const [filter, setFilter] = useState<'Todos' | GalleryCategory>('Todos');

  const items =
    filter === 'Todos'
      ? galleryItems
      : galleryItems.filter((item) => item.category === filter);

  return (
    <section id="galeria" className="border-b border-white/10 bg-[#0A0A0A] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#FF6600]">Portfólio & Estrutura</p>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
              Galeria de Fotos & Serviços em Operação
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
              Registros reais da nossa estrutura audiovisual, pontos de mídia exterior no CIMBAJU, divisões impressas e entregas corporativas gerenciadas pelo CMS.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar galeria de fotos e serviços"
            className="flex w-full sm:w-auto overflow-x-auto items-center gap-1 rounded-lg border border-white/10 bg-[#141416] p-1"
          >
            {GALLERY_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={filter === cat}
                onClick={() => setFilter(cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === cat ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="glass-surface group flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-[#FF6600]/45"
            >
              <div className="min-w-0">
                <div className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-[#141416]">
                  <MediaFrame
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 truncate text-[11px] font-medium text-[#D4AF37]">
                    {item.category} · {item.serviceTag}
                  </div>
                </div>

                <div className="p-4 sm:p-5 min-w-0">
                  <h3 className="font-display text-lg font-bold text-white break-words">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400 break-words">{item.description}</p>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-5">
                <button
                  type="button"
                  onClick={() => onOpenProposal(item.title)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6600] hover:underline underline-offset-4 cursor-pointer"
                >
                  Contratar serviço semelhante
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
