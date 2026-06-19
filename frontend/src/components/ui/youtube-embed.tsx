import React from 'react';

/**
 * Extrae el ID de un video de YouTube desde varios formatos de URL:
 *   - https://www.youtube.com/watch?v=ABC123
 *   - https://youtu.be/ABC123
 *   - https://www.youtube.com/embed/ABC123
 *   - https://www.youtube.com/shorts/ABC123
 * Devuelve `null` si la URL no es de YouTube.
 */
export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).trim();
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      const m = /^\/(embed|shorts|live)\/([^/?#]+)/.exec(u.pathname);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

interface YoutubeEmbedProps {
  /** URL completa de YouTube (cualquier formato soportado). */
  url: string;
  /** Texto alternativo para accesibilidad. */
  title: string;
}

/**
 * Embed responsive de YouTube con aspect-ratio 16:9.
 *
 * Params del player:
 *   - rel=0: no muestra "videos relacionados" de OTROS canales al final.
 *   - modestbranding=1: marca de YouTube menos prominente.
 *   - loading="lazy": solo carga el iframe cuando entra al viewport.
 */
export const YoutubeEmbed: React.FC<YoutubeEmbedProps> = ({ url, title }) => {
  const id = extractYoutubeId(url);
  if (!id) return null;
  const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted shadow-md">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};
