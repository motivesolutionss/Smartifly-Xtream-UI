import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { mergeStyle, movieCardArt, movieCardFallback, movieCardFallbackSpan, movieCardFallbackStrong, movieCardImg } from '../styles/lgTvStyles';
import { formatFallbackTitle } from '../utils/fallbackText';

type BrowsePosterArtProps = {
  artwork?: string;
  name: string;
  accent: string;
  badge?: string;
  imgStyle?: CSSProperties;
  artStyle?: CSSProperties;
};

export function BrowsePosterArt({
  artwork,
  name,
  accent,
  badge = 'HD',
  imgStyle = movieCardImg,
  artStyle = movieCardArt
}: BrowsePosterArtProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [artwork]);

  const showImage = Boolean(artwork?.trim()) && !imageFailed;

  return (
    <div style={artStyle}>
      {showImage ? (
        <img
          src={artwork}
          alt=""
          decoding="async"
          style={imgStyle}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div style={mergeStyle(movieCardFallback, { background: accent })}>
          <strong style={movieCardFallbackStrong}>{formatFallbackTitle(name, 4, 32)}</strong>
          <span style={movieCardFallbackSpan}>{badge}</span>
        </div>
      )}
    </div>
  );
}
