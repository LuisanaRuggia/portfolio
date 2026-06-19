import { useCallback, useEffect, useState } from 'react';

/**
 * Routing minimalista basado en `window.location.hash`.
 *
 * Rutas conocidas:
 *   - (home, sin hash)        → `projectId = null`, `isCv = false`
 *   - `#/project/<id>`        → `projectId = <id>`, `isCv = false`
 *   - `#/cv`                  → `projectId = null`, `isCv = true`
 *
 * API:
 *   - `projectId`: id del proyecto cuando matchea `#/project/<id>`, sino `null`.
 *   - `isCv`: true si la ruta es `#/cv`.
 *   - `navigate(id | null)`: navega a `#/project/<id>` (o limpia si es null).
 *   - `navigateCv()`: navega a `#/cv`.
 *   - `navigateHome()`: limpia el hash (vuelve a la grilla del portafolio).
 *
 * Sin dependencias. Compatible con GitHub Pages porque el hash no se
 * propaga al servidor (no hace falta SPA fallback).
 */

const PROJECT_HASH_PREFIX = '#/project/';
const CV_HASH = '#/cv';

type ParsedHash = { projectId: string | null; isCv: boolean };

function parseHash(hash: string): ParsedHash {
  if (hash === CV_HASH) return { projectId: null, isCv: true };
  if (hash.startsWith(PROJECT_HASH_PREFIX)) {
    const id = hash.slice(PROJECT_HASH_PREFIX.length).trim();
    if (id.length > 0) return { projectId: id, isCv: false };
  }
  return { projectId: null, isCv: false };
}

export function useHashRoute() {
  const [parsed, setParsed] = useState<ParsedHash>(() =>
    typeof window === 'undefined' ? { projectId: null, isCv: false } : parseHash(window.location.hash),
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
    setParsed({ projectId: null, isCv: false });
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

  return { projectId: parsed.projectId, isCv: parsed.isCv, navigate, navigateCv, navigateHome: clearHash };
}
