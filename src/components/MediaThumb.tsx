import { Film, ImageIcon, Music, Play } from 'lucide-react';
import { useState } from 'react';

interface MediaThumbProps {
  kind: 'video' | 'image' | 'audio' | 'film_export' | string;
  src: string;
  thumbnailUrl?: string | null;
  title: string;
  className?: string;
  playable?: boolean;
}

export function MediaThumb({
  kind,
  src,
  thumbnailUrl,
  title,
  className = 'w-full aspect-video',
  playable = false,
}: MediaThumbProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (kind === 'audio') {
    return (
      <div className={`${className} bg-[#0D1628] border border-[#1E3254] rounded-lg p-4 flex flex-col justify-between`}>
        <div className="flex items-center gap-2 text-[#A78BFA] text-xs font-medium">
          <Music className="w-4 h-4 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <audio controls src={src} className="w-full h-9 mt-3" preload="metadata" />
      </div>
    );
  }

  if ((kind === 'video' || kind === 'film_export') && playable) {
    if (playing) {
      return (
        <div className={`${className} bg-[#050811] rounded-lg overflow-hidden border border-[#1E3254]`}>
          <video
            src={src}
            poster={thumbnailUrl || undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Lire ${title}`}
        className={`${className} group relative rounded-lg overflow-hidden bg-[#0D1628] border border-[#1E3254] hover:border-[#3978FF] transition-colors block text-left`}
      >
        {thumbnailUrl && !imgFailed ? (
          <img
            src={thumbnailUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0E182D] via-[#14243D] to-[#1B2B4B] flex flex-col items-center justify-center p-4 text-center">
            <Film className="w-7 h-7 text-[#A78BFA] mb-2" />
            <span className="text-xs font-medium text-[#E2E8F0] line-clamp-2 max-w-[85%]">{title}</span>
          </div>
        )}
        <span className="absolute inset-0 bg-[#04070E]/20 group-hover:bg-[#04070E]/10 transition-colors flex items-center justify-center">
          <span className="w-11 h-11 rounded-full bg-[#080D19]/85 border border-[#3978FF]/70 flex items-center justify-center text-[#F4F7FB] group-hover:scale-105 group-hover:bg-[#3978FF] transition-all shadow-lg">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </span>
        </span>
      </button>
    );
  }

  const displayImg = kind === 'image' ? src : thumbnailUrl;

  if (!displayImg || imgFailed) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#0E182D] via-[#14243D] to-[#1B2B4B] border border-[#1E3254] flex flex-col items-center justify-center p-4 text-center`}
      >
        {kind === 'image' ? (
          <ImageIcon className="w-7 h-7 text-[#3978FF] mb-2" />
        ) : (
          <Film className="w-7 h-7 text-[#A78BFA] mb-2" />
        )}
        <span className="text-xs font-medium text-[#E2E8F0] line-clamp-2 max-w-[85%]">{title}</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-lg overflow-hidden bg-[#0D1628] border border-[#1E3254]`}>
      <img
        src={displayImg}
        alt={title}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
