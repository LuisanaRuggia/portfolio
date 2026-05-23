import { useCallback, useEffect, useState } from 'react';

/**
 * Routing minimalista basado en `window.location.hash`.
 *
 * Solo conoce un patrón: `#/project/<id>`.
 *
 * - `projectId`: el id extraído del hash, o `null` si no hay match.
 * - `navigate(id | null)`: setea el hash. `null` lo limpia.
 *
 * Sin dependencias. Compatible con GitHub Pages porque el hash no se
 * propaga al servidor (no hace falta SPA fallback).
 */

const PROJECT_HASH_PREFIX = '#/project/';

function parseHash(hash: string): string | null {
  if (!hash.startsWith(PROJECT_HASH_PREFIX)) return null;
  const id = hash.slice(PROJECT_HASH_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export function useHashRoute() {
  const [projectId, setProjectId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : parseHash(window.location.hash),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setProjectId(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: string | null) => {
    if (typeof window === 'undefined') return;
    if (id === null) {
      // Limpiar el hash sin generar una entrada extra en el historial.
      const url = window.location.pathname + window.location.search;
      window.history.pushState(null, '', url);
      setProjectId(null);
      return;
    }
    window.location.hash = `${PROJECT_HASH_PREFIX}${id}`;
  }, []);

  return { projectId, navigate };
}
