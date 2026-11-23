import React, { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { MediaFrame } from '../MediaFrame';

function formatSeconds(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PodcastSection: React.FC = () => {
  const { podcastShows } = useFortMidia();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(142);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const currentShow = podcastShows[activeIndex] ?? podcastShows[0];

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      try {
        oscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch {
        // Ignore cleanup error
      }
    };
  }, []);

  // Playback progress timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= currentShow.durationSec) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, currentShow.durationSec]);

  // Subtle Web Audio broadcast tone sync when user presses Play
  useEffect(() => {
    if (isPlaying) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current && AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx) {
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          oscRef.current?.stop();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(currentShow.baseFreqHz, ctx.currentTime);
          gain.gain.setValueAtTime(volume * 0.035, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          oscRef.current = osc;
          gainNodeRef.current = gain;
        }
      } catch {
        // Silent visual playback fallback if Web Audio is blocked
      }
    } else {
      try {
        oscRef.current?.stop();
        oscRef.current = null;
      } catch {
        // Ignore
      }
    }
  }, [isPlaying, activeIndex]);

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume * 0.035, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  const handleSelectShow = (index: number) => {
    setActiveIndex(index);
    setElapsedSec(65);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    const nextIdx = activeIndex === 0 ? podcastShows.length - 1 : activeIndex - 1;
    handleSelectShow(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % podcastShows.length;
    handleSelectShow(nextIdx);
  };

  const progressPct = Math.min(100, (elapsedSec / currentShow.durationSec) * 100);

  return (
    <section id="podcasts" className="border-b border-white/10 bg-[#0A0A0A] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#fa6607]">
            FortNews Podcast · Grade Diária 16h às 20h
          </p>
          <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
            Os 7 programas oficiais do nosso estúdio
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
            Transmissão autônoma com corte inteligente de câmeras, participação ao vivo e distribuição imediata em Reels e Shorts para todo o CIMBAJU.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Interactive Audio/Broadcast Player */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-[#121215] overflow-hidden">
            <div>
              <div className="relative h-56 w-full overflow-hidden border-b border-white/10">
                <MediaFrame
                  src="/assets/aistudio/Microfone_dc305011.jpg"
                  alt="Microfone oficial do estúdio FortNews Podcast"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/35 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#D4AF37]">
                    {currentShow.accentNote} · {currentShow.schedule}
                  </span>
                  {isPlaying && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#fa6607]">
                      <span className="h-2 w-2 rounded-full bg-[#fa6607]" />
                      Reproduzindo
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-zinc-400 min-w-0">
                    {currentShow.hostAvatarUrl ? (
                      <MediaFrame
                        src={currentShow.hostAvatarUrl}
                        alt={currentShow.host}
                        className="h-9 w-9 rounded-full object-cover border border-[#fa6607]/60 bg-black shrink-0"
                      />
                    ) : (
                      <Mic className="h-3.5 w-3.5 text-[#fa6607] shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Apresentação
                      </div>
                      <div className="truncate font-medium text-zinc-200">{currentShow.host}</div>
                    </div>
                  </div>
                  {currentShow.programLogoUrl && (
                    <div className="h-10 w-10 rounded-lg border border-white/15 bg-[#0A0A0A] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <MediaFrame
                        src={currentShow.programLogoUrl}
                        alt={`Logo ${currentShow.title}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </div>
                <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white break-words">
                  {currentShow.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed break-words">
                  {currentShow.episodeTitle}
                </p>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed break-words">{currentShow.focus}</p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="border-t border-white/10 bg-[#0E0E10] p-4 sm:p-6">
              {/* Scrubber */}
              <div className="space-y-2">
                <input
                  type="range"
                  aria-label="Progresso do episódio"
                  min={0}
                  max={currentShow.durationSec}
                  value={elapsedSec}
                  onChange={(e) => setElapsedSec(Number(e.target.value))}
                  className="w-full accent-[#fa6607] cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between font-mono text-[11px] text-zinc-400 tabular-nums">
                  <span>{formatSeconds(elapsedSec)}</span>
                  <span>{formatSeconds(currentShow.durationSec)}</span>
                </div>
              </div>

              {/* Transport + Volume */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Episódio anterior"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((prev) => !prev)}
                    aria-label={isPlaying ? 'Pausar episódio' : 'Reproduzir episódio'}
                    className="inline-flex h-11 px-4 sm:px-5 items-center justify-center gap-2 rounded-lg bg-[#fa6607] text-sm font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span>{isPlaying ? 'Pausar' : 'Ouvir Prévia'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Próximo episódio"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                  <input
                    type="range"
                    aria-label="Volume do player"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 accent-[#fa6607] cursor-pointer"
                  />
                </div>
              </div>

              {/* Subtle visual audio progress bar */}
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-[#fa6607] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 7 Official Podcasts Schedule List */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-between rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-white">
                  Grade Oficial de Programação
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecione qualquer programa para carregar o episódio em destaque no player
                </p>
              </div>
              <span className="font-mono text-xs text-[#D4AF37] tabular-nums shrink-0">16:00 — 20:00</span>
            </div>

            <div className="mt-4 divide-y divide-white/10">
              {podcastShows.map((show, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={show.id}
                    type="button"
                    onClick={() => handleSelectShow(idx)}
                    className={`w-full py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#fa6607]/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0 flex items-center">
                        {show.programLogoUrl && (
                          <div
                            className={`h-10 w-10 rounded-lg bg-[#0A0A0A] border p-1 flex items-center justify-center overflow-hidden ${
                              isSelected ? 'border-[#fa6607]' : 'border-white/15'
                            }`}
                          >
                            <MediaFrame
                              src={show.programLogoUrl}
                              alt={`Logo ${show.title}`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        {show.hostAvatarUrl ? (
                          <MediaFrame
                            src={show.hostAvatarUrl}
                            alt={`Apresentador ${show.host}`}
                            className={`h-8 w-8 rounded-full object-cover bg-black border-2 border-[#121215] ${
                              show.programLogoUrl ? '-ml-2.5 mt-3' : ''
                            }`}
                          />
                        ) : !show.programLogoUrl ? (
                          <div className="h-10 w-10 rounded-full border border-white/15 bg-[#1C1C21] flex items-center justify-center font-display text-xs font-bold text-[#fa6607]">
                            {show.host.slice(0, 2).toUpperCase()}
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-[#fa6607] tabular-nums shrink-0">
                            {show.daySlot}
                          </span>
                          <span className="font-display text-sm sm:text-base font-semibold text-white truncate">
                            {show.title}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400 truncate">
                          {show.host} · {show.accentNote}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        isSelected ? 'text-[#fa6607]' : 'text-zinc-400'
                      }`}
                    >
                      {isSelected && isPlaying ? 'No ar agora' : 'Ouvir episódio'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
