import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface MediaFrameProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackTitle?: string;
}

export const MediaFrame: React.FC<MediaFrameProps> = ({
  src,
  alt,
  className = '',
  style,
  fallbackTitle,
}) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div
        style={style}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#18181B] via-[#111113] to-[#0A0A0A] border border-white/10 p-6 text-center ${className}`}
      >
        <ImageOff className="w-7 h-7 text-[#FF6600] mb-2 opacity-80" aria-hidden="true" />
        <p className="text-xs font-medium text-zinc-300">{fallbackTitle || alt}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
