import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface SafeCardImageProps {
  src: string;
  isLiveRail: boolean;
  fallback: ReactNode;
  name?: string;
  accent?: string;
  objectFit?: 'cover' | 'contain';
  priority?: boolean;
}

export function SafeCardImage({
  src,
  isLiveRail,
  name,
  objectFit,
  priority = false
}: SafeCardImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoadedSrc(null);
    setHasError(false);

    const url = src?.trim();
    if (!url) {
      setHasError(true);
      return;
    }

    let active = true;
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = priority ? 'high' : 'auto';
    img.src = url;
    img.onload = () => {
      if (active) {
        setLoadedSrc(url);
      }
    };
    img.onerror = () => {
      if (active) {
        setHasError(true);
      }
    };

    return () => {
      active = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [priority, src]);

  const isLive = isLiveRail;
  const fit = objectFit || (isLiveRail ? 'contain' : 'cover');

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 'inherit', overflow: 'hidden' }}>
      {isLive ? (
        /* Base Light Card Background - with subtle depth shadow and thin border */
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F7FA 100%)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            boxSizing: 'border-box',
            borderRadius: 'inherit',
            opacity: loadedSrc ? 0.35 : 1,
            transition: 'opacity 0.25s ease-in-out',
            zIndex: 1
          }}
        />
      ) : (
        /* Base Dark Cinematic Card Background - Premium three-tone slate to deep black gradient */
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: 'linear-gradient(to bottom, #23293B 0%, #171B26 50%, #0B0D13 100%)',
            boxSizing: 'border-box',
            borderRadius: 'inherit',
            opacity: loadedSrc ? 0.35 : 1,
            transition: 'opacity 0.25s ease-in-out',
            zIndex: 1
          }}
        />
      )}

      {/* Floating LIVE badge sticker in the top-left */}
      {isLive && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: '#E50914',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            zIndex: 5,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
          }}
        >
          Live
        </span>
      )}

      {/* 2. Text Overlay/Initials Layer */}
      {!loadedSrc && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 3 }}>
          {isLive ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              {/* Retro-Modern TV Screen SVG Icon - Charcoal frame with Red play button */}
              <svg
                viewBox="0 0 24 24"
                width="34"
                height="34"
                fill="none"
                stroke="#1E2230"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: '8px' }}
              >
                <rect x="2" y="6" width="20" height="13" rx="2" ry="2" />
                <path d="M17 2l-5 4-5-4" />
                <polygon points="10 9.5 15 12.5 10 15.5" fill="#E50914" stroke="#E50914" strokeWidth="1" />
              </svg>
              {/* Centered Bold Charcoal Title Text */}
              <strong style={{
                color: '#1E2230',
                fontSize: '18px',
                lineHeight: 1.25,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                maxWidth: '95%',
                marginTop: '6px',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                {name || ''}
              </strong>
            </div>
          ) : (
            /* Premium Cinematic Movie/Series Fallback */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              {/* Premium Clapperboard SVG Icon - Red highlights on all diagonal slats & central play button */}
              <svg
                viewBox="0 0 24 24"
                width="40"
                height="40"
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: '16px' }}
              >
                {/* Main clapper base box - Silver */}
                <rect x="3" y="7" width="18" height="13" rx="2" ry="2" stroke="rgba(255, 255, 255, 0.6)" />
                {/* Middle horizontal line - Silver */}
                <path d="M3 11h18" stroke="rgba(255, 255, 255, 0.6)" />
                {/* All three top clapper bar stripes colored in brand red */}
                <path d="M6 7l3-3" stroke="#E50914" strokeWidth="2" />
                <path d="M11 7l3-3" stroke="#E50914" strokeWidth="2" />
                <path d="M16 7l3-3" stroke="#E50914" strokeWidth="2" />
                {/* Central Play Triangle - Solid Red */}
                <polygon points="11 13.5 15 15.5 11 17.5" fill="#E50914" stroke="#E50914" strokeWidth="1" />
              </svg>
              {/* Centered Bold Movie/Series Title (Wrapped up to 3 lines) */}
              <strong style={{
                color: '#FFFFFF',
                fontSize: '18px',
                lineHeight: 1.3,
                fontWeight: 700,
                textAlign: 'center',
                wordBreak: 'break-word',
                letterSpacing: '-0.01em',
                maxWidth: '95%',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {name || ''}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* 3. High-Quality Loaded Image */}
      {loadedSrc && (
        <>
          {/* Blurred Background Poster to fill letterbox bars */}
          {fit === 'contain' && !isLiveRail && (
            <img
              src={loadedSrc}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(20px) brightness(0.4)',
                opacity: 0.85,
                zIndex: 3
              }}
            />
          )}

          {/* Sharp Centered Poster */}
          <img
            src={loadedSrc}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
              objectFit: fit,
              display: 'block',
              padding: isLiveRail ? '18px' : undefined,
              backgroundColor: isLiveRail ? '#FFFFFF' : undefined,
              boxSizing: 'border-box',
              opacity: 1,
              transition: 'opacity 0.22s ease-in-out',
              zIndex: 4
            }}
          />
        </>
      )}
    </div>
  );
}
