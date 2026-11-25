export interface ProcessedPhotoResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  fileName: string;
}

export interface ProcessPhotoOptions {
  /**
   * Maximum character length of the resulting Data URL.
   * Defaults to 58000 (~56 KB) so it fits safely even in MySQL TEXT (65,535 bytes)
   * columns AND stays lightweight for localStorage persistence.
   */
  maxBytes?: number;
  /** Maximum width or height in pixels before downscaling. */
  maxDimension?: number;
}

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|bmp|avif|jfif)$/i;

function isLikelyImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSION_RE.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('Não foi possível ler o arquivo de imagem.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Formato de imagem não suportado pelo navegador.'));
    img.src = src;
  });
}

function detectWebpEncodingSupport(): boolean {
  try {
    const probe = document.createElement('canvas');
    probe.width = 2;
    probe.height = 2;
    return probe.toDataURL('image/webp', 0.8).startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Reads, resizes, and compresses an uploaded image file into an optimized Data URL
 * that fits safely inside both MySQL TEXT/LONGTEXT columns and browser localStorage.
 */
export async function processUploadedPhoto(
  file: File,
  options: ProcessPhotoOptions = {}
): Promise<ProcessedPhotoResult> {
  if (!isLikelyImageFile(file)) {
    throw new Error('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
  }

  const maxBytes = options.maxBytes ?? 58000;
  const initialMaxDim = options.maxDimension ?? 1280;

  let objectUrl: string | null = null;
  let img: HTMLImageElement;

  try {
    objectUrl = URL.createObjectURL(file);
    img = await loadImageElement(objectUrl);
  } catch {
    const fallbackDataUrl = await readFileAsDataUrl(file);
    try {
      img = await loadImageElement(fallbackDataUrl);
    } catch {
      throw new Error(
        'Não foi possível decodificar esta imagem. Converta para JPG ou PNG e tente novamente.'
      );
    }
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;

  // If the original file is already small enough and standard web format, try keeping crisp quality via canvas
  const supportsWebp = detectWebpEncodingSupport();
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
  const mimeCandidates: string[] = supportsWebp
    ? ['image/webp', 'image/jpeg']
    : ['image/jpeg'];

  const dimensionSteps = [initialMaxDim, 1024, 880, 740, 620, 500].filter(
    (d, i, arr) => d <= Math.max(natW, natH, 500) && arr.indexOf(d) === i
  );
  if (dimensionSteps.length === 0) {
    dimensionSteps.push(Math.max(natW, natH));
  }

  const qualitySteps = [0.84, 0.76, 0.68, 0.58, 0.48, 0.38];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const raw = await readFileAsDataUrl(file);
    return {
      dataUrl: raw,
      width: natW,
      height: natH,
      sizeKb: Math.max(1, Math.round(raw.length / 1024)),
      fileName: file.name,
    };
  }

  let bestUrl = '';
  let bestW = natW;
  let bestH = natH;

  for (const maxDim of dimensionSteps) {
    const scale = Math.min(1, maxDim / Math.max(natW, natH));
    const targetW = Math.max(1, Math.round(natW * scale));
    const targetH = Math.max(1, Math.round(natH * scale));

    canvas.width = targetW;
    canvas.height = targetH;

    for (const mime of mimeCandidates) {
      ctx.clearRect(0, 0, targetW, targetH);
      if (mime === 'image/jpeg') {
        // Fill white background behind transparent PNGs when exporting JPEG
        ctx.fillStyle = isPng ? '#FFFFFF' : '#000000';
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const quality of qualitySteps) {
        const encoded = canvas.toDataURL(mime, quality);
        if (!encoded.startsWith('data:image/')) continue;

        if (!bestUrl || encoded.length < bestUrl.length) {
          bestUrl = encoded;
          bestW = targetW;
          bestH = targetH;
        }

        if (encoded.length <= maxBytes) {
          return {
            dataUrl: encoded,
            width: targetW,
            height: targetH,
            sizeKb: Math.max(1, Math.round(encoded.length / 1024)),
            fileName: file.name,
          };
        }
      }
    }
  }

  if (bestUrl) {
    return {
      dataUrl: bestUrl,
      width: bestW,
      height: bestH,
      sizeKb: Math.max(1, Math.round(bestUrl.length / 1024)),
      fileName: file.name,
    };
  }

  const rawFallback = await readFileAsDataUrl(file);
  return {
    dataUrl: rawFallback,
    width: natW,
    height: natH,
    sizeKb: Math.max(1, Math.round(rawFallback.length / 1024)),
    fileName: file.name,
  };
}
