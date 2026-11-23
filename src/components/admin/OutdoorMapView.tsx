import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMapCanvas,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';
import { configApi } from '../../services/api';
import { OutdoorAvailability, OutdoorPoint } from '../../types/fortmidia';

interface OutdoorMapViewProps {
  points: OutdoorPoint[];
  selectedPointId?: string | null;
  onSelectPoint?: (point: OutdoorPoint | null) => void;
  onQuickStatusChange?: (id: string, availability: OutdoorAvailability) => void;
  onRequestReserve?: (point: OutdoorPoint) => void;
  showPrices?: boolean;
  consultPriceLabel?: string;
  pickMode?: boolean;
  pickedCoords?: { lat: number; lng: number } | null;
  onPickCoords?: (coords: { lat: number; lng: number }) => void;
  heightClassName?: string;
}

export const OUTDOOR_PIN_STYLES: Record<
  OutdoorAvailability,
  { bg: string; border: string; glyph: string; shortLabel: string }
> = {
  Disponível: {
    bg: '#16A34A',
    border: '#14532D',
    glyph: '#DCFCE7',
    shortLabel: 'Livre (Verde)',
  },
  Reservado: {
    bg: '#EAB308',
    border: '#854D0E',
    glyph: '#422006',
    shortLabel: 'Reservado (Amarelo)',
  },
  Ocupado: {
    bg: '#DC2626',
    border: '#7F1D1D',
    glyph: '#FEE2E2',
    shortLabel: 'Ocupado (Vermelho)',
  },
  'Em Manutenção': {
    bg: '#71717A',
    border: '#3F3F46',
    glyph: '#F4F4F5',
    shortLabel: 'Manutenção',
  },
};

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MapCameraSync: React.FC<{ activePoint: OutdoorPoint | null }> = ({ activePoint }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !activePoint) return;
    map.panTo({ lat: activePoint.lat, lng: activePoint.lng });
  }, [map, activePoint?.id, activePoint?.lat, activePoint?.lng]);

  return null;
};

interface OutdoorMarkerItemProps {
  point: OutdoorPoint;
  isSelected: boolean;
  showPrices: boolean;
  consultPriceLabel: string;
  onSelect: () => void;
  onClose: () => void;
  onQuickStatusChange?: (id: string, availability: OutdoorAvailability) => void;
  onRequestReserve?: (point: OutdoorPoint) => void;
}

const OutdoorMarkerItem: React.FC<OutdoorMarkerItemProps> = ({
  point,
  isSelected,
  showPrices,
  consultPriceLabel,
  onSelect,
  onClose,
  onQuickStatusChange,
  onRequestReserve,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const palette = OUTDOOR_PIN_STYLES[point.availability] || OUTDOOR_PIN_STYLES['Disponível'];

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.lat, lng: point.lng }}
        title={`${point.code} — ${point.title} (${point.availability})`}
        onClick={onSelect}
      >
        <Pin
          background={palette.bg}
          borderColor={palette.border}
          glyphColor={palette.glyph}
          scale={isSelected ? 1.32 : 1.12}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={310} onCloseClick={onClose}>
          <div className="p-1 text-zinc-900 space-y-2 min-w-[235px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-zinc-900">
                {point.code}
              </span>
              <span
                className="rounded px-2 py-0.5 text-[10px] font-bold shadow-xs"
                style={{
                  backgroundColor: palette.bg,
                  color: point.availability === 'Reservado' ? '#18181B' : '#FFFFFF',
                }}
              >
                {point.availability}
              </span>
            </div>

            <div className="text-xs font-bold text-zinc-950 leading-snug">{point.title}</div>
            <div className="text-[11px] text-zinc-600 leading-snug">{point.address}</div>

            <div className="grid grid-cols-2 gap-1.5 border-t border-zinc-200 pt-2 text-[11px]">
              <div>
                <span className="text-zinc-500">Praça:</span>{' '}
                <strong className="text-zinc-900">{point.city}</strong>
              </div>
              <div>
                <span className="text-zinc-500">Formato:</span>{' '}
                <strong className="font-mono text-zinc-900">{point.dimensions}</strong>
              </div>
              <div>
                <span className="text-zinc-500">Iluminação:</span>{' '}
                <strong className="text-zinc-900">{point.lighting.split(' ')[0]}</strong>
              </div>
              <div>
                <span className="text-zinc-500">Ciclo:</span>{' '}
                <strong className="font-mono text-zinc-950">
                  {showPrices ? formatBRL(point.bimonthlyPrice) : consultPriceLabel}
                </strong>
              </div>
            </div>

            {point.currentAdvertiser && (
              <div className="rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700">
                {point.availability === 'Reservado' ? 'Reservado para:' : 'Anunciante:'}{' '}
                <strong>{point.currentAdvertiser}</strong>
              </div>
            )}

            {onQuickStatusChange && (
              <div className="border-t border-zinc-200 pt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-zinc-500">Alterar status:</span>
                <select
                  aria-label={`Status rápido para ${point.code}`}
                  value={point.availability}
                  onChange={(e) =>
                    onQuickStatusChange(point.id, e.target.value as OutdoorAvailability)
                  }
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-900"
                >
                  <option value="Disponível">Disponível (Verde)</option>
                  <option value="Reservado">Reservado (Amarelo)</option>
                  <option value="Ocupado">Ocupado (Vermelho)</option>
                  <option value="Em Manutenção">Em Manutenção</option>
                </select>
              </div>
            )}

            {onRequestReserve && (
              <button
                type="button"
                onClick={() => onRequestReserve(point)}
                className="w-full rounded-lg bg-[#FF6600] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                {point.availability === 'Disponível'
                  ? 'Solicitar Reserva deste Ponto'
                  : point.availability === 'Reservado'
                    ? 'Consultar Lista de Espera'
                    : 'Consultar Próxima Disponibilidade'}
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const OutdoorMapView: React.FC<OutdoorMapViewProps> = ({
  points,
  selectedPointId,
  onSelectPoint,
  onQuickStatusChange,
  onRequestReserve,
  showPrices = true,
  consultPriceLabel = 'Consulte',
  pickMode = false,
  pickedCoords,
  onPickCoords,
  heightClassName = 'h-[460px]',
}) => {
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
  const [apiKey, setApiKey] = useState<string>(envKey);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedPointId ?? points[0]?.id ?? null
  );

  useEffect(() => {
    if (selectedPointId !== undefined) {
      setInternalSelectedId(selectedPointId);
    }
  }, [selectedPointId]);

  useEffect(() => {
    if (envKey) {
      setApiKey(envKey);
      return;
    }
    let cancelled = false;
    configApi
      .getPublicConfig()
      .then((res) => {
        if (!cancelled && res.ok && res.data?.mapsApiKey) {
          setApiKey(res.data.mapsApiKey);
        }
      })
      .catch(() => {
        // Static build fallback when no backend exists
      });
    return () => {
      cancelled = true;
    };
  }, [envKey]);

  const activeId = selectedPointId !== undefined ? selectedPointId : internalSelectedId;
  const activePoint = points.find((p) => p.id === activeId) ?? null;

  const defaultCenter =
    pickedCoords ??
    (points.length > 0
      ? { lat: points[0].lat, lng: points[0].lng }
      : { lat: -23.3219, lng: -46.7272 });

  const handleSelect = (pt: OutdoorPoint | null) => {
    setInternalSelectedId(pt ? pt.id : null);
    if (onSelectPoint) onSelectPoint(pt);
  };

  const countByStatus: Record<OutdoorAvailability, number> = {
    Disponível: points.filter((p) => p.availability === 'Disponível').length,
    Reservado: points.filter((p) => p.availability === 'Reservado').length,
    Ocupado: points.filter((p) => p.availability === 'Ocupado').length,
    'Em Manutenção': points.filter((p) => p.availability === 'Em Manutenção').length,
  };

  const legendItems: OutdoorAvailability[] =
    countByStatus['Em Manutenção'] > 0
      ? ['Disponível', 'Reservado', 'Ocupado', 'Em Manutenção']
      : ['Disponível', 'Reservado', 'Ocupado'];

  return (
    <div className="rounded-xl border border-white/10 bg-[#121215] overflow-hidden">
      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-white">
          <MapPin className="h-4 w-4 text-[#FF6600] shrink-0" aria-hidden="true" />
          <span>Mapa Georreferenciado de Outdoors ({points.length} pontos)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-200">
          {legendItems.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0A0A0A] px-2.5 py-1"
            >
              <span
                className="h-2.5 w-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: OUTDOOR_PIN_STYLES[st].bg }}
              />
              <span className="font-medium">{OUTDOOR_PIN_STYLES[st].shortLabel}</span>
              <span className="font-mono text-zinc-400 tabular-nums">
                ({countByStatus[st]})
              </span>
            </span>
          ))}
        </div>
      </div>

      {pickMode && (
        <div className="border-b border-[#FF6600]/30 bg-[#FF6600]/10 px-4 py-2 text-[11px] text-amber-200 flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-[#FF6600] shrink-0" aria-hidden="true" />
          <span>
            Modo de Posicionamento Ativo: clique em qualquer lugar do mapa para definir a latitude e longitude exatas do novo Outdoor.
          </span>
        </div>
      )}

      {/* Map Canvas */}
      <div className={`relative w-full ${heightClassName}`}>
        {!apiKey ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#0D0D0F] p-6 text-center">
            <MapPin className="h-8 w-8 text-[#FF6600] mb-3" aria-hidden="true" />
            <div className="font-display text-sm font-bold text-white">
              Carregando Mapa Interativo de Outdoors
            </div>
            <p className="mt-1 max-w-md text-xs text-zinc-400">
              A chave do Google Maps está sendo inicializada. Enquanto isso, consulte os {points.length} pontos e sua disponibilidade em Verde (Livre), Amarelo (Reservado) e Vermelho (Ocupado) na lista ao lado.
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey} libraries={['marker']} language="pt-BR" region="BR">
            <GoogleMapCanvas
              mapId="DEMO_MAP_ID"
              defaultCenter={defaultCenter}
              defaultZoom={11}
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onClick={(ev) => {
                if (pickMode && onPickCoords && ev.detail.latLng) {
                  onPickCoords({
                    lat: Number(ev.detail.latLng.lat.toFixed(6)),
                    lng: Number(ev.detail.latLng.lng.toFixed(6)),
                  });
                }
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraSync activePoint={activePoint} />

              {points.map((point) => (
                <OutdoorMarkerItem
                  key={point.id}
                  point={point}
                  isSelected={activeId === point.id}
                  showPrices={showPrices}
                  consultPriceLabel={consultPriceLabel}
                  onSelect={() => handleSelect(point)}
                  onClose={() => handleSelect(null)}
                  onQuickStatusChange={onQuickStatusChange}
                  onRequestReserve={onRequestReserve}
                />
              ))}

              {pickMode && pickedCoords && (
                <AdvancedMarker position={pickedCoords} title="Novo ponto selecionado">
                  <Pin background="#2563EB" borderColor="#1E3A8A" glyphColor="#EFF6FF" scale={1.25} />
                </AdvancedMarker>
              )}
            </GoogleMapCanvas>
          </APIProvider>
        )}
      </div>
    </div>
  );
};
