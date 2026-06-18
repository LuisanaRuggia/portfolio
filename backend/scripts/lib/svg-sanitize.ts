/**
 * Limpieza de SVGs exportados de draw.io / Excalidraw / Figma.
 *
 * Problemas conocidos que sanitizamos:
 * - `color-scheme: light dark` en el `<svg style="...">` raíz rompe nuestro
 *   filtro CSS `invert(1) hue-rotate(180deg)` en dark mode (el browser
 *   intenta auto-invertir y el resultado choca con nuestro filtro).
 * - `style="background-color: ..."` con un color hardcoded blanco que se ve
 *   horrible en dark mode. Lo dejamos transparente.
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Reglas de regex aplicadas a contenido SVG. Cada una elimina un anti-patrón. */
const SANITIZERS: { name: string; apply: (svg: string) => string }[] = [
  {
    name: 'strip color-scheme',
    apply: svg => svg.replace(/color-scheme\s*:\s*light\s+dark\s*;?/gi, ''),
  },
  {
    name: 'strip background-color',
    apply: svg => svg.replace(/background-color\s*:\s*(?:#fff|#ffffff|white)\s*;?/gi, ''),
  },
  {
    name: 'collapse empty style',
    apply: svg => svg.replace(/style\s*=\s*"\s*"/gi, ''),
  },
];

export function sanitizeSvg(content: string): { sanitized: string; changes: string[] } {
  const changes: string[] = [];
  let current = content;
  for (const rule of SANITIZERS) {
    const next = rule.apply(current);
    if (next !== current) {
      changes.push(rule.name);
      current = next;
    }
  }
  return { sanitized: current, changes };
}

/** Versión file-system: lee, sanitiza, escribe si hubo cambios. Devuelve los cambios aplicados. */
export function sanitizeSvgFile(path: string): string[] {
  const original = readFileSync(path, 'utf8');
  const { sanitized, changes } = sanitizeSvg(original);
  if (changes.length > 0) {
    writeFileSync(path, sanitized, 'utf8');
  }
  return changes;
}
