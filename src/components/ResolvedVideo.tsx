import React, { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { isLocalVideoUri, resolveVideoUrl } from '../utils/videoUpload';

interface ResolvedVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src?: string | null;
}

export const ResolvedVideo: React.FC<ResolvedVideoProps> = ({ src, className, ...rest }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    src && !isLocalVideoUri(src) ? src : null
  );
  const [missingLocal, setMissingLocal] = useState(false);

  useEffect(() => {
    let active = true;
    setMissingLocal(false);

    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!isLocalVideoUri(src)) {
      setResolvedSrc(src);
      return;
    }

    void resolveVideoUrl(src).then((url) => {
      if (!active) return;
      if (url) {
        setResolvedSrc(url);
      } else {
        setResolvedSrc(null);
        setMissingLocal(true);
      }
    });

    return () => {
      active = false;
    };
  }, [src]);

  if (missingLocal) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-zinc-950 p-4 text-center text-xs text-zinc-400 ${className || ''}`}
      >
        <Film className="h-6 w-6 text-[#FF6600]" aria-hidden="true" />
        <p>
          Este vídeo foi salvo localmente no dispositivo de envio. Para reproduzir em outros aparelhos,
          reenvie o arquivo ou vincule um link YouTube/MP4.
        </p>
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-black text-xs text-zinc-400 ${className || ''}`}
      >
        Carregando vídeo...
      </div>
    );
  }

  return <video {...rest} src={resolvedSrc} className={className} />;
};
