import { useCallback, useEffect, useState } from 'react';

/**
 * Routing minimalista basado en `window.location.hash`.
 *
 * Rutas conocidas:
 *   - (home, sin hash)        → `projectId = null`, `isCv = false`, `blogSlug = null`, `isBlogIndex = false`
 *   - `#/project/<id>`        → `projectId = <id>`
 *   - `#/cv`                  → `isCv = true`
 *   - `#/blog`                → `isBlogIndex = true`
 *   - `#/blog/<slug>`         → `blogSlug = <slug>`
 *
 * API:
 *   - `projectId`: id del proyecto cuando matchea `#/project/<id>`, sino `null`.
 *   - `isCv`: true si la ruta es `#/cv`.
 *   - `isBlogIndex`: true si la ruta es `#/blog`.
 *   - `blogSlug`: slug del post cuando matchea `#/blog/<slug>`, sino `null`.
 *   - `navigate(id | null)`: navega a `#/project/<id>` (o limpia si es null).
 *   - `navigateCv()`: navega a `#/cv`.
 *   - `navigateBlogIndex()`: navega a `#/blog`.
 *   - `navigateBlogPost(slug)`: navega a `#/blog/<slug>`.
 *   - `navigateHome()`: limpia el hash (vuelve a la grilla del portafolio).
 *
 * Sin dependencias. Compatible con GitHub Pages porque el hash no se
 * propaga al servidor (no hace falta SPA fallback).
 */

const PROJECT_HASH_PREFIX = '#/project/';
const CV_HASH = '#/cv';
const BLOG_INDEX_HASH = '#/blog';
const BLOG_POST_HASH_PREFIX = '#/blog/';

interface ParsedHash {
  projectId: string | null;
  isCv: boolean;
  isBlogIndex: boolean;
  blogSlug: string | null;
}

function parseHash(hash: string): ParsedHash {
  const base: ParsedHash = { projectId: null, isCv: false, isBlogIndex: false, blogSlug: null };
  if (hash === CV_HASH) return { ...base, isCv: true };
  if (hash === BLOG_INDEX_HASH) return { ...base, isBlogIndex: true };
  if (hash.startsWith(BLOG_POST_HASH_PREFIX)) {
    const slug = hash.slice(BLOG_POST_HASH_PREFIX.length).trim();
    if (slug.length > 0) return { ...base, blogSlug: slug };
  }
  if (hash.startsWith(PROJECT_HASH_PREFIX)) {
    const id = hash.slice(PROJECT_HASH_PREFIX.length).trim();
    if (id.length > 0) return { ...base, projectId: id };
  }
  return base;
}

export function useHashRoute() {
  const [parsed, setParsed] = useState<ParsedHash>(() =>
    typeof window === 'undefined'
      ? { projectId: null, isCv: false, isBlogIndex: false, blogSlug: null }
      : parseHash(window.location.hash),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setParsed(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const clearHash = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = window.location.pathname + window.location.search;
    window.history.pushState(null, '', url);
    setParsed({ projectId: null, isCv: false, isBlogIndex: false, blogSlug: null });
  }, []);

  const navigate = useCallback(
    (id: string | null) => {
      if (typeof window === 'undefined') return;
      if (id === null) {
        clearHash();
        return;
      }
      window.location.hash = `${PROJECT_HASH_PREFIX}${id}`;
    },
    [clearHash],
  );

  const navigateCv = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.location.hash = CV_HASH;
  }, []);

  const navigateBlogIndex = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.location.hash = BLOG_INDEX_HASH;
  }, []);

  const navigateBlogPost = useCallback((slug: string) => {
    if (typeof window === 'undefined') return;
    window.location.hash = `${BLOG_POST_HASH_PREFIX}${slug}`;
  }, []);

  return {
    projectId: parsed.projectId,
    isCv: parsed.isCv,
    isBlogIndex: parsed.isBlogIndex,
    blogSlug: parsed.blogSlug,
    navigate,
    navigateCv,
    navigateBlogIndex,
    navigateBlogPost,
    navigateHome: clearHash,
  };
}
