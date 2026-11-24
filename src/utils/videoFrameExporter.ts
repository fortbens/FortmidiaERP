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
  renderVideoLayer: (ctx: CanvasRenderingContext2D, video: HTMLVideoElement) => void;
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

const H264_PROFILES_1080P = [
  'avc1.64002a', // High Profile Level 4.2
  'avc1.4d002a', // Main Profile Level 4.2
  'avc1.42002a', // Baseline Profile Level 4.2
  'avc1.640028', // High Profile Level 4.0
  'avc1.4d0028', // Main Profile Level 4.0
  'avc1.420028', // Baseline Profile Level 4.0
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createAbortError(): DOMException {
  return new DOMException('Exportação cancelada pelo usuário.', 'AbortError');
}

function mountOffscreenVideo(videoUrl: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
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

    let settled = false;
    const cleanup = () => {
      vid.removeEventListener('loadeddata', onReady);
      vid.removeEventListener('canplay', onReady);
      vid.removeEventListener('error', onError);
    };

    const onReady = () => {
      if (settled) return;
      if (vid.readyState >= 2 && Number.isFinite(vid.duration) && vid.duration > 0) {
        settled = true;
        cleanup();
        resolve(vid);
      }
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      vid.remove();
      reject(new Error('Não foi possível carregar o vídeo para exportação.'));
    };

    vid.addEventListener('loadeddata', onReady);
    vid.addEventListener('canplay', onReady);
    vid.addEventListener('error', onError);
    vid.src = videoUrl;
    vid.load();
  });
}

function seekVideoFrame(vid: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(vid.currentTime - targetTime) < 0.002 && vid.readyState >= 2) {
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

    const timer = window.setTimeout(finish, 1800);
    vid.addEventListener('seeked', finish, { once: true });
    vid.currentTime = targetTime;
  });
}

async function pickSupportedH264Config(
  width: number,
  height: number,
  fps: number
): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  for (const codec of H264_PROFILES_1080P) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: 6_500_000,
      framerate: fps,
      avc: { format: 'avc' },
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) {
        return config;
      }
    } catch {
      // Try next profile
    }
  }
  return null;
}

async function decodeOriginalAudio(videoUrl: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      return decoded;
    } finally {
      await ctx.close().catch(() => undefined);
    }
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

  const videoConfig = await pickSupportedH264Config(width, height, fps);
  if (!videoConfig) return null;

  if (signal?.aborted) throw createAbortError();

  onProgress?.({
    percent: 2,
    phase: 'Preparando áudio original...',
    currentSec: 0,
    totalSec: duration,
  });

  // Decode original audio directly from file buffer (silent, instant, no speaker playback!)
  let audioBuffer: AudioBuffer | null = null;
  let audioConfig: AudioEncoderConfig | null = null;
  if (typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
    const decoded = await decodeOriginalAudio(videoUrl);
    if (decoded && decoded.length > 0) {
      const outChannels = Math.min(2, Math.max(1, decoded.numberOfChannels));
      const candidate: AudioEncoderConfig = {
        codec: 'mp4a.40.2',
        numberOfChannels: outChannels,
        sampleRate: decoded.sampleRate,
        bitrate: 128_000,
      };
      try {
        const support = await AudioEncoder.isConfigSupported(candidate);
        if (support.supported) {
          audioBuffer = decoded;
          audioConfig = candidate;
        }
      } catch {
        audioBuffer = null;
      }
    }
  }

  if (signal?.aborted) throw createAbortError();

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    audio:
      audioBuffer && audioConfig
        ? {
            codec: 'aac',
            numberOfChannels: audioConfig.numberOfChannels,
            sampleRate: audioConfig.sampleRate,
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
  videoEncoder.configure(videoConfig);

  let audioEncoder: AudioEncoder | null = null;
  if (audioBuffer && audioConfig) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure(audioConfig);
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

  // 1. Encode full audio track offline in ~0.2s (silent)
  if (audioBuffer && audioEncoder && audioConfig) {
    const outChannels = audioConfig.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;
    const chunkFrames = 4096;

    onProgress?.({
      percent: 6,
      phase: 'Processando trilha de áudio...',
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

  // 2. Render & encode video frames deterministically without flicker
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

    // Draw opaque video layer + pre-rendered frame overlay (zero clearRect, zero flicker)
    renderVideoLayer(workCtx, offVideo);
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
      const pct = Math.min(97, Math.round(8 + ((i + 1) / totalFrames) * 89));
      onProgress?.({
        percent: pct,
        phase: 'Renderizando vídeo MP4 em segundo plano...',
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
    phase: 'Concluído!',
    currentSec: duration,
    totalSec: duration,
  });

  return {
    blob,
    extension: 'mp4',
    hasAudio: Boolean(audioBuffer && audioConfig),
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

  // Paint first frame before starting stream so frame 0 is never black
  await seekVideoFrame(offVideo, 0);
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
      // Unmute offVideo ONLY because its output is captured exclusively into WebAudio (not speakers!)
      offVideo.muted = false;
      const source = audioCtx.createMediaElementSource(offVideo);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // Intentionally NOT connecting to audioCtx.destination so export is 100% silent
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
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
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
      const isMp4 = chosenMime.includes('mp4');
      const blob = new Blob(chunks, {
        type: chosenMime || (isMp4 ? 'video/mp4' : 'video/webm'),
      });
      onProgress?.({
        percent: 100,
        phase: 'Concluído!',
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
      if (offVideo.readyState >= 2) {
        renderVideoLayer(workCtx, offVideo);
        workCtx.drawImage(overlayCanvas, 0, 0);
      }
      const pct = Math.min(98, Math.round((offVideo.currentTime / Math.max(0.1, duration)) * 98));
      onProgress?.({
        percent: pct,
        phase: 'Exportando em segundo plano (silencioso)...',
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
  const offVideo = await mountOffscreenVideo(options.videoUrl);
  try {
    // Primary path: Offline WebCodecs MP4 (faster, silent, 100% deterministic, real .mp4 with AAC audio)
    try {
      const mp4Result = await exportWithWebCodecsMp4(options, offVideo);
      if (mp4Result) return mp4Result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Fall through cleanly to silent zero-flicker MediaRecorder fallback
    }

    return await exportWithSilentMediaRecorder(options, offVideo);
  } finally {
    offVideo.pause();
    offVideo.removeAttribute('src');
    offVideo.load();
    offVideo.remove();
  }
}
