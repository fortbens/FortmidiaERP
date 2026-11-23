import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { EditorialPauta } from '../../types/fortmidia';
import { matchesPautaQuery } from '../../utils/pautaCode';

interface PautaSearchPickerProps {
  pautas: EditorialPauta[];
  selectedPautaId: string;
  onSelect: (pautaId: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const PautaSearchPicker: React.FC<PautaSearchPickerProps> = ({
  pautas,
  selectedPautaId,
  onSelect,
  placeholder = 'Digitar nº (ex: 3 ou FN-0003), título ou cidade...',
  ariaLabel = 'Buscar e importar matéria por número interno, título ou cidade',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedPauta = useMemo(
    () => pautas.find((p) => p.id === selectedPautaId) ?? null,
    [pautas, selectedPautaId]
  );

  const filtered = useMemo(
    () => pautas.filter((p) => matchesPautaQuery(p, query)),
    [pautas, query]
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleChoose = (pauta: EditorialPauta) => {
    onSelect(pauta.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-500"
          aria-hidden="true"
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            } else if (e.key === 'Enter' && open && filtered.length > 0) {
              e.preventDefault();
              handleChoose(filtered[0]);
            }
          }}
          placeholder={
            selectedPauta
              ? `${selectedPauta.internalCode || ''} · ${selectedPauta.title}`
              : placeholder
          }
          className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] pl-8 pr-14 py-2 text-xs text-white placeholder:text-zinc-400 focus:border-[#fa6607] focus:outline-none"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {(query || selectedPautaId) && (
            <button
              type="button"
              aria-label="Limpar busca de matéria"
              onClick={() => {
                setQuery('');
                if (selectedPautaId && !query) {
                  onSelect('');
                }
                setOpen(true);
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Abrir lista de matérias"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-white cursor-pointer"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Active selection subtle indicator */}
      {selectedPauta && !open && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-400">
          <span className="truncate">
            Importada:{' '}
            <strong className="font-mono font-bold text-[#fa6607] tabular-nums">
              {selectedPauta.internalCode}
            </strong>{' '}
            · {selectedPauta.city} · {selectedPauta.seal}
          </span>
        </div>
      )}

      {/* Searchable Dropdown List */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-[#121216] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#17171C] px-3 py-1.5 text-[10px] text-zinc-400">
            <span>Controle Interno (nº não aparece nos sites)</span>
            <span className="font-mono tabular-nums">
              {filtered.length} de {pautas.length}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-zinc-400">
                Nenhuma matéria encontrada para &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === selectedPautaId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChoose(p)}
                    className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected ? 'bg-[#fa6607]/15' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#fa6607] tabular-nums shrink-0">
                          {p.internalCode || 'FN-0000'}
                        </span>
                        <span className="truncate text-xs font-medium text-white">
                          {p.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
                        <span>{p.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.seal}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            p.approvalStatus === 'Publicada no Site'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {p.approvalStatus}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#fa6607]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
