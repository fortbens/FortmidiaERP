import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface FramedVideoExportProgress {
  percent: number;
  phase: string;
  currentSec: number;
  totalSec: number;
}

export interface FramedVideoExportOptions {
  videoUrl: string;
  width: number;
  height: number;
  renderVideoLayer: (
    ctx: CanvasRenderingContext2D,
    media: HTMLVideoElement | HTMLCanvasElement
  ) => void;
  overlayCanvas: HTMLCanvasElement;
  onProgress?: (progress: FramedVideoExportProgress) => void;
  signal?: AbortSignal;
}

export interface FramedVideoExportResult {
  blob: Blob;
  extension: 'mp4' | 'webm';
  hasAudio: boolean;
  engine: 'webcodecs-mp4' | 'silent-recorder';
}

export interface PreloadedVideoFrame {
  duration: number;
  width: number;
  height: number;
  posterCanvas: HTMLCanvasElement;
}

interface SupportedVideoCodecChoice {
  muxerCodec: 'avc' | 'vp9';
  config: VideoEncoderConfig;
}

interface SupportedAudioCodecChoice {
  muxerCodec: 'aac' | 'opus';
  config: AudioEncoderConfig;
  buffer: AudioBuffer;
}

// Ordered by universal MP4 compatibility (Instagram Reels, WhatsApp, iOS, CapCut, Premiere).
// Includes Level 5.0 (0x32) and prefer-software fallbacks so portrait 1080x1920 never fails hardware checks.
const MP4_VIDEO_CANDIDATES: Array<{
  muxerCodec: 'avc' | 'vp9';
  codec: string;
  hardwareAcceleration: HardwareAcceleration;
}> = [
  { muxerCodec: 'avc', codec: 'avc1.64002a', hardwareAcceleration: 'no-preference' }, // High L4.2
  { muxerCodec: 'avc', codec: 'avc1.4d002a', hardwareAcceleration: 'no-preference' }, // Main L4.2
  { muxerCodec: 'avc', codec: 'avc1.42e02a', hardwareAcceleration: 'no-preference' }, // Constrained Baseline L4.2
  { muxerCodec: 'avc', codec: 'avc1.640032', hardwareAcceleration: 'no-preference' }, // High L5.0 (portrait-safe)
  { muxerCodec: 'avc', codec: 'avc1.4d0032', hardwareAcceleration: 'no-preference' }, // Main L5.0
  { muxerCodec: 'avc', codec: 'avc1.640028', hardwareAcceleration: 'no-preference' }, // High L4.0
  { muxerCodec: 'avc', codec: 'avc1.4d0028', hardwareAcceleration: 'no-preference' }, // Main L4.0
  { muxerCodec: 'avc', codec: 'avc1.420028', hardwareAcceleration: 'no-preference' }, // Baseline L4.0
  { muxerCodec: 'avc', codec: 'avc1.64002a', hardwareAcceleration: 'prefer-software' },
  { muxerCodec: 'avc', codec: 'avc1.4d002a', hardwareAcceleration: 'prefer-software' },
  { muxerCodec: 'avc', codec: 'avc1.420028', hardwareAcceleration: 'prefer-software' },
  { muxerCodec: 'vp9', codec: 'vp09.00.41.08', hardwareAcceleration: 'no-preference' }, // VP9 in MP4 fallback
  { muxerCodec: 'vp9', codec: 'vp09.00.50.08', hardwareAcceleration: 'no-preference' },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function createAbortError(): DOMException {
  return new DOMException('Exportação cancelada pelo usuário.', 'AbortError');
}

function waitForDecodedVideoPaint(vid: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const anyVid = vid as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    if (typeof anyVid.requestVideoFrameCallback === 'function') {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 350);
      anyVid.requestVideoFrameCallback(() => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve();
        }
      });
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function seekVideoFrame(vid: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    const safeTarget = Math.max(0, Math.min(targetTime, Math.max(0, (vid.duration || 0) - 0.004)));
    if (Math.abs(vid.currentTime - safeTarget) < 0.002 && vid.readyState >= 2) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      vid.removeEventListener('seeked', finish);
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, 2000);
    vid.addEventListener('seeked', finish, { once: true });
    vid.currentTime = safeTarget;
  });
}

/**
 * Mounts an offscreen <video> element asynchronously and warms up the GPU decoder
 * on the initial frame so frame 0 is guaranteed decoded (never black).
 */
async function loadAndWarmupOffscreenVideo(
  videoUrl: string,
  signal?: AbortSignal
): Promise<HTMLVideoElement> {
  if (signal?.aborted) throw createAbortError();

  const vid = document.createElement('video');
  vid.muted = true;
  vid.playsInline = true;
  vid.preload = 'auto';
  vid.crossOrigin = 'anonymous';
  // Keep video mounted offscreen (never display:none) so hardware decoding stays active
  vid.style.position = 'fixed';
  vid.style.left = '-9999px';
  vid.style.top = '0';
  vid.style.width = '2px';
  vid.style.height = '2px';
  vid.style.opacity = '0.01';
  vid.style.pointerEvents = 'none';
  document.body.appendChild(vid);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        vid.removeEventListener('loadeddata', onReady);
        vid.removeEventListener('canplay', onReady);
        vid.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
      };
      const onReady = () => {
        if (settled) return;
        if (
          vid.readyState >= 2 &&
          vid.videoWidth > 0 &&
          vid.videoHeight > 0 &&
          Number.isFinite(vid.duration) &&
          vid.duration > 0
        ) {
          settled = true;
          cleanup();
          resolve();
        }
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Não foi possível carregar o vídeo para exportação.'));
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(createAbortError());
      };

      signal?.addEventListener('abort', onAbort, { once: true });
      vid.addEventListener('loadeddata', onReady);
      vid.addEventListener('canplay', onReady);
      vid.addEventListener('error', onError);
      vid.src = videoUrl;
      vid.load();
    });

    if (signal?.aborted) throw createAbortError();

    // Warm up decoder by stepping slightly forward and back to 0 so frame 0 texture is guaranteed flushed
    const warmupTime = Math.min(0.04, Math.max(0.005, vid.duration * 0.01));
    await seekVideoFrame(vid, warmupTime);
    await waitForDecodedVideoPaint(vid);
    await seekVideoFrame(vid, 0);
    await nextAnimationFrame();

    return vid;
  } catch (err) {
    vid.pause();
    vid.removeAttribute('src');
    vid.load();
    vid.remove();
    throw err;
  }
}

/**
 * Asynchronously preloads a video file and captures its decoded first frame
 * onto an offscreen canvas so the UI never displays a black screen on load or seek.
 */
export async function preloadVideoFirstFrame(
  videoUrl: string,
  signal?: AbortSignal
): Promise<PreloadedVideoFrame> {
  const vid = await loadAndWarmupOffscreenVideo(videoUrl, signal);
  try {
    const posterTime = Math.min(0.08, Math.max(0, vid.duration * 0.02));
    if (posterTime > 0.005) {
      await seekVideoFrame(vid, posterTime);
      await nextAnimationFrame();
    }

    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = Math.max(2, vid.videoWidth);
    posterCanvas.height = Math.max(2, vid.videoHeight);
    const pCtx = posterCanvas.getContext('2d', { alpha: false });
    if (pCtx) {
      pCtx.drawImage(vid, 0, 0, posterCanvas.width, posterCanvas.height);
    }

    return {
      duration: vid.duration,
      width: vid.videoWidth,
      height: vid.videoHeight,
      posterCanvas,
    };
  } finally {
    vid.pause();
    vid.removeAttribute('src');
    vid.load();
    vid.remove();
  }
}

async function pickSupportedMp4VideoCodec(
  width: number,
  height: number,
  fps: number
): Promise<SupportedVideoCodecChoice | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  for (const cand of MP4_VIDEO_CANDIDATES) {
    const config: VideoEncoderConfig = {
      codec: cand.codec,
      width,
      height,
      bitrate: 6_500_000,
      framerate: fps,
      hardwareAcceleration: cand.hardwareAcceleration,
      ...(cand.muxerCodec === 'avc' ? { avc: { format: 'avc' as const } } : {}),
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) {
        return {
          muxerCodec: cand.muxerCodec,
          config: support.config || config,
        };
      }
    } catch {
      // Try next MP4 codec candidate
    }
  }
  return null;
}

async function resampleAudioBuffer(
  source: AudioBuffer,
  targetSampleRate: number,
  targetChannels: number
): Promise<AudioBuffer> {
  if (
    source.sampleRate === targetSampleRate &&
    source.numberOfChannels === targetChannels
  ) {
    return source;
  }
  const length = Math.max(1, Math.ceil(source.duration * targetSampleRate));
  const offlineCtx = new OfflineAudioContext(targetChannels, length, targetSampleRate);
  const srcNode = offlineCtx.createBufferSource();
  srcNode.buffer = source;
  srcNode.connect(offlineCtx.destination);
  srcNode.start(0);
  return offlineCtx.startRendering();
}

async function decodeAndPickMp4AudioCodec(
  videoUrl: string
): Promise<SupportedAudioCodecChoice | null> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    let decoded: AudioBuffer | null = null;
    try {
      decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      await ctx.close().catch(() => undefined);
    }

    if (!decoded || decoded.length === 0) return null;
    const outChannels = Math.min(2, Math.max(1, decoded.numberOfChannels));

    // Priority 1: AAC (mp4a.40.2) — universal MP4 audio standard
    const aacRates = Array.from(new Set([decoded.sampleRate, 48000, 44100]));
    for (const rate of aacRates) {
      const candidate: AudioEncoderConfig = {
        codec: 'mp4a.40.2',
        numberOfChannels: outChannels,
        sampleRate: rate,
        bitrate: 128_000,
      };
      try {
        const support = await AudioEncoder.isConfigSupported(candidate);
        if (support.supported) {
          const buffer = await resampleAudioBuffer(decoded, rate, outChannels);
          return {
            muxerCodec: 'aac',
            config: support.config || candidate,
            buffer,
          };
        }
      } catch {
        // Try next rate
      }
    }

    // Priority 2: Opus inside MP4 (works on open-source Chromium builds without AAC encoder)
    const opusConfig: AudioEncoderConfig = {
      codec: 'opus',
      numberOfChannels: outChannels,
      sampleRate: 48000,
      bitrate: 128_000,
    };
    try {
      const support = await AudioEncoder.isConfigSupported(opusConfig);
      if (support.supported) {
        const buffer = await resampleAudioBuffer(decoded, 48000, outChannels);
        return {
          muxerCodec: 'opus',
          config: support.config || opusConfig,
          buffer,
        };
      }
    } catch {
      // No audio encoder supported
    }

    return null;
  } catch {
    return null;
  }
}

async function exportWithWebCodecsMp4(
  options: FramedVideoExportOptions,
  offVideo: HTMLVideoElement
): Promise<FramedVideoExportResult | null> {
  const { videoUrl, width, height, renderVideoLayer, overlayCanvas, onProgress, signal } = options;
  const duration = offVideo.duration;
  const fps = duration > 75 ? 24 : 30;

  const videoChoice = await pickSupportedMp4VideoCodec(width, height, fps);
  if (!videoChoice) return null;

  if (signal?.aborted) throw createAbortError();

  onProgress?.({
    percent: 5,
    phase: 'Preparando áudio original para MP4...',
    currentSec: 0,
    totalSec: duration,
  });

  const audioChoice = await decodeAndPickMp4AudioCodec(videoUrl);
  if (signal?.aborted) throw createAbortError();

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: videoChoice.muxerCodec,
      width,
      height,
      frameRate: fps,
    },
    audio: audioChoice
      ? {
          codec: audioChoice.muxerCodec,
          numberOfChannels: audioChoice.config.numberOfChannels,
          sampleRate: audioChoice.config.sampleRate,
        }
      : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });
  videoEncoder.configure(videoChoice.config);

  let audioEncoder: AudioEncoder | null = null;
  if (audioChoice) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure(audioChoice.config);
  }

  // Dedicated opaque work canvas — created ONCE and NEVER resized!
  const workCanvas = document.createElement('canvas');
  workCanvas.width = width;
  workCanvas.height = height;
  const workCtx = workCanvas.getContext('2d', { alpha: false });
  if (!workCtx) {
    videoEncoder.close();
    audioEncoder?.close();
    return null;
  }

  // Safety last-good-frame buffer so no transient seek can ever emit a black frame
  const lastGoodCanvas = document.createElement('canvas');
  lastGoodCanvas.width = Math.max(2, offVideo.videoWidth);
  lastGoodCanvas.height = Math.max(2, offVideo.videoHeight);
  const lastGoodCtx = lastGoodCanvas.getContext('2d', { alpha: false });
  let hasLastGoodFrame = false;

  if (lastGoodCtx && offVideo.readyState >= 2 && offVideo.videoWidth > 0) {
    lastGoodCtx.drawImage(offVideo, 0, 0, lastGoodCanvas.width, lastGoodCanvas.height);
    hasLastGoodFrame = true;
  }

  // 1. Encode full audio track offline in ~0.2s (silent)
  if (audioChoice && audioEncoder) {
    const audioBuffer = audioChoice.buffer;
    const outChannels = audioChoice.config.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;
    const chunkFrames = 4096;

    onProgress?.({
      percent: 9,
      phase: 'Codificando áudio em MP4...',
      currentSec: 0,
      totalSec: duration,
    });

    for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
      if (signal?.aborted) {
        videoEncoder.close();
        audioEncoder.close();
        throw createAbortError();
      }
      if (encoderError) throw encoderError;

      const frames = Math.min(chunkFrames, totalSamples - offset);
      const planar = new Float32Array(frames * outChannels);
      for (let ch = 0; ch < outChannels; ch++) {
        const srcCh = Math.min(ch, audioBuffer.numberOfChannels - 1);
        const chData = audioBuffer.getChannelData(srcCh);
        planar.set(chData.subarray(offset, offset + frames), ch * frames);
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: outChannels,
        timestamp: Math.round((offset / sampleRate) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();

      while (audioEncoder.encodeQueueSize > 10) {
        await sleep(5);
      }
    }
    await audioEncoder.flush();
    audioEncoder.close();
    audioEncoder = null;
  }

  // 2. Render & encode video frames deterministically without black frames
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) {
      videoEncoder.close();
      throw createAbortError();
    }
    if (encoderError) {
      videoEncoder.close();
      throw encoderError;
    }

    const targetTime = Math.min(Math.max(0, duration - 0.004), i / fps);
    await seekVideoFrame(offVideo, targetTime);

    if (offVideo.readyState >= 2 && offVideo.videoWidth > 0 && lastGoodCtx) {
      lastGoodCtx.drawImage(offVideo, 0, 0, lastGoodCanvas.width, lastGoodCanvas.height);
      hasLastGoodFrame = true;
    }

    // Draw guaranteed valid video frame + pre-rendered moldura overlay
    const sourceFrame: HTMLVideoElement | HTMLCanvasElement =
      offVideo.readyState >= 2 && offVideo.videoWidth > 0
        ? offVideo
        : hasLastGoodFrame
          ? lastGoodCanvas
          : offVideo;

    renderVideoLayer(workCtx, sourceFrame);
    workCtx.drawImage(overlayCanvas, 0, 0);

    const frame = new VideoFrame(workCanvas, {
      timestamp: Math.round((i * 1_000_000) / fps),
      duration: frameDurationUs,
    });
    videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    while (videoEncoder.encodeQueueSize > 6) {
      await sleep(8);
    }

    if (i % 3 === 0 || i === totalFrames - 1) {
      const pct = Math.min(97, Math.round(10 + ((i + 1) / totalFrames) * 87));
      onProgress?.({
        percent: pct,
        phase: 'Renderizando vídeo MP4 com moldura...',
        currentSec: targetTime,
        totalSec: duration,
      });
      await sleep(0);
    }
  }

  onProgress?.({
    percent: 98,
    phase: 'Finalizando arquivo MP4...',
    currentSec: duration,
    totalSec: duration,
  });

  await videoEncoder.flush();
  videoEncoder.close();
  if (encoderError) throw encoderError;

  muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });

  onProgress?.({
    percent: 100,
    phase: 'MP4 pronto! Iniciando download...',
    currentSec: duration,
    totalSec: duration,
  });

  return {
    blob,
    extension: 'mp4',
    hasAudio: Boolean(audioChoice),
    engine: 'webcodecs-mp4',
  };
}

async function exportWithSilentMediaRecorder(
  options: FramedVideoExportOptions,
  offVideo: HTMLVideoElement
): Promise<FramedVideoExportResult> {
  const { width, height, renderVideoLayer, overlayCanvas, onProgress, signal } = options;
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Navegador sem suporte à exportação de vídeo.');
  }

  const duration = offVideo.duration;
  const workCanvas = document.createElement('canvas');
  workCanvas.width = width;
  workCanvas.height = height;
  const workCtx = workCanvas.getContext('2d', { alpha: false });
  if (!workCtx) {
    throw new Error('Não foi possível inicializar o canvas de exportação.');
  }

  // Paint guaranteed decoded first frame before starting stream so frame 0 is never black
  await seekVideoFrame(offVideo, 0);
  await nextAnimationFrame();
  renderVideoLayer(workCtx, offVideo);
  workCtx.drawImage(overlayCanvas, 0, 0);

  const canvasStream = workCanvas.captureStream(30);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  // Capture audio silently: route ONLY to MediaStreamDestination (NOT to speakers!)
  let audioCtx: AudioContext | null = null;
  let hasAudio = false;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      offVideo.muted = false;
      const source = audioCtx.createMediaElementSource(offVideo);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // Intentionally NOT connected to audioCtx.destination so export is 100% silent
      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        tracks.push(...audioTracks);
        hasAudio = true;
      }
    }
  } catch {
    offVideo.muted = true;
    hasAudio = false;
  }

  const combinedStream = new MediaStream(tracks);
  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=vp9,opus',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const isMp4 = chosenMime.includes('mp4');
  const recorder = chosenMime
    ? new MediaRecorder(combinedStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 6_500_000,
      })
    : new MediaRecorder(combinedStream);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  return new Promise<FramedVideoExportResult>((resolve, reject) => {
    let rafId = 0;
    let finished = false;

    const cleanup = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      offVideo.pause();
      tracks.forEach((t) => t.stop());
      if (audioCtx) {
        audioCtx.close().catch(() => undefined);
      }
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      if (finished) return;
      finished = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanup();
      reject(createAbortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    recorder.onerror = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('Falha durante a gravação do vídeo.'));
    };

    recorder.onstop = () => {
      if (finished) return;
      finished = true;
      cleanup();
      const blob = new Blob(chunks, {
        type: chosenMime || (isMp4 ? 'video/mp4' : 'video/webm'),
      });
      onProgress?.({
        percent: 100,
        phase: 'Concluído! Iniciando download...',
        currentSec: duration,
        totalSec: duration,
      });
      resolve({
        blob,
        extension: isMp4 ? 'mp4' : 'webm',
        hasAudio,
        engine: 'silent-recorder',
      });
    };

    const renderTick = () => {
      if (finished) return;
      if (offVideo.readyState >= 2 && offVideo.videoWidth > 0) {
        renderVideoLayer(workCtx, offVideo);
        workCtx.drawImage(overlayCanvas, 0, 0);
      }
      const pct = Math.min(98, Math.round((offVideo.currentTime / Math.max(0.1, duration)) * 98));
      onProgress?.({
        percent: pct,
        phase: isMp4
          ? 'Exportando MP4 em segundo plano...'
          : 'Exportando vídeo em segundo plano...',
        currentSec: offVideo.currentTime,
        totalSec: duration,
      });
      if (!offVideo.ended) {
        rafId = window.requestAnimationFrame(renderTick);
      }
    };

    offVideo.addEventListener(
      'ended',
      () => {
        if (!finished && recorder.state !== 'inactive') {
          recorder.stop();
        }
      },
      { once: true }
    );

    recorder.start(250);
    offVideo
      .play()
      .then(() => {
        rafId = window.requestAnimationFrame(renderTick);
      })
      .catch((err) => {
        if (!finished) {
          finished = true;
          cleanup();
          reject(err);
        }
      });
  });
}

export async function exportFramedVideo(
  options: FramedVideoExportOptions
): Promise<FramedVideoExportResult> {
  options.onProgress?.({
    percent: 2,
    phase: 'Carregando vídeo e decodificando primeiro quadro...',
    currentSec: 0,
    totalSec: 0,
  });

  const offVideo = await loadAndWarmupOffscreenVideo(options.videoUrl, options.signal);
  try {
    // Primary path: Offline WebCodecs MP4 (H.264/VP9 + AAC/Opus in .mp4 container)
    try {
      const mp4Result = await exportWithWebCodecsMp4(options, offVideo);
      if (mp4Result) return mp4Result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Fall through cleanly to silent MediaRecorder (prefers MP4 first)
    }

    return await exportWithSilentMediaRecorder(options, offVideo);
  } finally {
    offVideo.pause();
    offVideo.removeAttribute('src');
    offVideo.load();
    offVideo.remove();
  }
}
