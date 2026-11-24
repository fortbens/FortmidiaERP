export function isSafeMediaUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:video/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = parsed.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{6,20}$/.test(v)) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (
        (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') &&
        parts[1] &&
        /^[A-Za-z0-9_-]{6,20}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getYouTubeThumbnailUrl(rawUrl?: string): string | null {
  const id = extractYouTubeVideoId(rawUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function getVideoEmbedUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  const ytId = extractYouTubeVideoId(url);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}`;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[0] === 'video' ? parts[1] : parts[0];
      if (id && /^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }

    if (host === 'instagram.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'reel' || parts[0] === 'p') && parts[1] && /^[A-Za-z0-9_-]+$/.test(parts[1])) {
        return `https://www.instagram.com/${parts[0]}/${parts[1]}/embed`;
      }
    }
  } catch {
    // Non-URL / relative / data URI -> fallback to native HTML5 <video>
  }

  return null;
}

export function isVideoArticle(article?: { mediaType?: string; videoUrl?: string } | null): boolean {
  if (!article) return false;
  return Boolean(article.videoUrl?.trim()) && isSafeMediaUrl(article.videoUrl);
}

export function getArticlePosterUrl(article?: {
  imageUrl?: string;
  videoUrl?: string;
} | null): string | undefined {
  if (!article) return undefined;
  if (article.imageUrl?.trim() && isSafeMediaUrl(article.imageUrl)) {
    return article.imageUrl.trim();
  }
  return getYouTubeThumbnailUrl(article.videoUrl) || undefined;
}
