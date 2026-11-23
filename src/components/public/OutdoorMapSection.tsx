import React, { useMemo, useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { CIMBAJU_CITIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CimbajuCity, OutdoorAvailability, OutdoorPoint } from '../../types/fortmidia';
import { OUTDOOR_PIN_STYLES, OutdoorMapView } from '../admin/OutdoorMapView';

interface OutdoorMapSectionProps {
  onSelectOutdoor: (quotaTitle: string) => void;
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const OutdoorMapSection: React.FC<OutdoorMapSectionProps> = ({ onSelectOutdoor }) => {
  const { outdoorPoints, siteSettings } = useFortMidia();
  const [statusFilter, setStatusFilter] = useState<'Todos' | OutdoorAvailability>('Todos');
  const [cityFilter, setCityFilter] = useState<'Todas' | CimbajuCity>('Todas');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    outdoorPoints[0]?.id ?? null
  );

  const showPrices = siteSettings.showPublicPrices !== false;
  const consultLabel = siteSettings.consultPriceLabel?.trim() || 'Consulte';

  const filteredPoints = useMemo(() => {
    return outdoorPoints.filter((pt) => {
      const mStatus = statusFilter === 'Todos' || pt.availability === statusFilter;
      const mCity = cityFilter === 'Todas' || pt.city === cityFilter;
      return mStatus && mCity;
    });
  }, [outdoorPoints, statusFilter, cityFilter]);

  const counts = useMemo(
    () => ({
      total: outdoorPoints.length,
      Disponível: outdoorPoints.filter((p) => p.availability === 'Disponível').length,
      Reservado: outdoorPoints.filter((p) => p.availability === 'Reservado').length,
      Ocupado: outdoorPoints.filter((p) => p.availability === 'Ocupado').length,
    }),
    [outdoorPoints]
  );

  const handleRequestPoint = (pt: OutdoorPoint) => {
    onSelectOutdoor(`Outdoor ${pt.code} — ${pt.title} (${pt.city})`);
  };

  const statusPillClass = (avail: OutdoorAvailability) => {
    switch (avail) {
      case 'Disponível':
        return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
      case 'Reservado':
        return 'border-yellow-400/50 bg-yellow-400/15 text-yellow-300';
      case 'Ocupado':
        return 'border-red-500/50 bg-red-500/15 text-red-400';
      default:
        return 'border-zinc-500/40 bg-zinc-500/15 text-zinc-300';
    }
  };

  return (
    <section
      id="mapa-outdoors"
      className="border-b border-white/10 bg-[#0A0A0A] py-14 sm:py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl min-w-0">
            <p className="text-xs font-medium" style={{ color: siteSettings.primaryColor }}>
              Rede FortMídia OOH · Mapa em Tempo Real
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance] break-words">
              Mapa de Outdoors & Painéis Disponíveis no CIMBAJU
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
              Visualize a localização exata de cada ponto por código de cor: <strong className="text-emerald-400">Verde (Livre)</strong>, <strong className="text-yellow-400">Amarelo (Reservado)</strong> e <strong className="text-red-400">Vermelho (Ocupado)</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              aria-label="Filtrar outdoors por cidade"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value as 'Todas' | CimbajuCity)}
              className="rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Todas">Todas as Cidades</option>
              {CIMBAJU_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('Todos')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Todos'
                ? 'border-[#FF6600] bg-[#FF6600] text-white'
                : 'border-white/10 bg-[#121215] text-zinc-300 hover:border-white/25'
            }`}
          >
            Todos ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Disponível')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Disponível'
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Livres · Verde ({counts.Disponível})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Reservado')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Reservado'
                ? 'border-yellow-400 bg-yellow-500 text-zinc-950'
                : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            Reservados · Amarelo ({counts.Reservado})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Ocupado')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'Ocupado'
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Ocupados · Vermelho ({counts.Ocupado})
          </button>
        </div>

        {/* Map + Interactive List */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 min-w-0">
            <OutdoorMapView
              points={filteredPoints}
              selectedPointId={selectedPointId}
              onSelectPoint={(pt) => setSelectedPointId(pt ? pt.id : null)}
              showPrices={showPrices}
              consultPriceLabel={consultLabel}
              onRequestReserve={handleRequestPoint}
              heightClassName="h-[420px] sm:h-[510px]"
            />
          </div>

          <div className="lg:col-span-4 space-y-3 max-h-[568px] overflow-y-auto pr-1 min-w-0">
            {filteredPoints.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#121215] p-6 text-center text-xs text-zinc-400">
                Nenhum ponto de outdoor encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredPoints.map((pt) => {
                const isSelected = selectedPointId === pt.id;
                const dotColor = OUTDOOR_PIN_STYLES[pt.availability]?.bg || '#16A34A';

                return (
                  <article
                    key={pt.id}
                    onClick={() => setSelectedPointId(pt.id)}
                    className={`rounded-xl border p-4 transition-colors cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'border-[#FF6600] bg-[#16161B]'
                        : 'border-white/10 bg-[#121215] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#D4AF37]">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        {pt.code}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(
                          pt.availability
                        )}`}
                      >
                        {pt.availability}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-sm font-bold text-white leading-snug break-words">
                        {pt.title}
                      </h3>
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-zinc-400 leading-snug">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500 mt-0.5" aria-hidden="true" />
                        <span>
                          {pt.address} · <strong className="text-zinc-300">{pt.city}</strong>
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-[11px]">
                      <div className="text-zinc-400">
                        <span className="font-mono text-zinc-200">{pt.dimensions}</span> ·{' '}
                        <span>{pt.lighting.split(' ')[0]}</span>
                      </div>
                      <div className="font-mono font-bold text-white tabular-nums">
                        {showPrices ? `${formatBRL(pt.bimonthlyPrice)} / ciclo` : consultLabel}
                      </div>
                    </div>

                    {pt.availableFrom && pt.availability !== 'Disponível' && (
                      <div className="text-[11px] text-zinc-400">
                        Previsão de liberação:{' '}
                        <span className="font-mono text-zinc-200">{pt.availableFrom}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestPoint(pt);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white hover:border-[#FF6600] hover:text-[#FF6600] cursor-pointer"
                    >
                      <span>
                        {pt.availability === 'Disponível'
                          ? 'Reservar Este Outdoor'
                          : 'Consultar Disponibilidade'}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
