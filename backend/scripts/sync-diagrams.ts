/**
 * Escanea `frontend/public/diagrams/<projectId>/` por cada proyecto del
 * manifest y genera `frontend/src/data/generated/diagrams.json`.
 *
 * Convención de carpeta:
 *   frontend/public/diagrams/<projectId>/
 *     ├── 01-frontend-architecture.svg     ← orden + slug
 *     ├── 02-backend-architecture.svg
 *     ├── 03-data-flow.png                 ← también acepta PNG
 *     └── captions.json                    ← sidecar opcional con captions ES/EN
 *
 * Si no hay `captions.json`, el caption queda undefined y el frontend muestra
 * un fallback (o nada). Si hay, debe tener shape:
 *   { "01-frontend-architecture.svg": { "es": "Arquitectura del frontend", "en": "..." }, ... }
 *
 * Side-effects: sanitiza los SVGs in-place (strip color-scheme dark mode).
 *
 * Idempotente: si el diagrams.json resultante es igual al existente, no escribe.
 *
 * Local: `pnpm script:diagrams`
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { idempotentWrite, loadManifest, REPO_ROOT_PATH, repoRelative } from './lib/github.js';
import { sanitizeSvgFile } from './lib/svg-sanitize.js';
import type { LocalizedString } from './lib/types.js';

interface DiagramEntry {
  url: string;
  caption?: LocalizedString;
}

interface CaptionsSidecar {
  [filename: string]: LocalizedString;
}

const BASE_URL = '/portfolio/'; // mismo prefijo que usa Vite en producción
const SUPPORTED_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg']);

function isSupportedFile(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return false;
  return SUPPORTED_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

function readCaptionsSidecar(dir: string): CaptionsSidecar {
  const path = join(dir, 'captions.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as CaptionsSidecar;
  } catch (err) {
    console.warn(`[captions.json en ${dir}] no parsea:`, err instanceof Error ? err.message : err);
    return {};
  }
}

function scanProjectDiagrams(projectId: string): DiagramEntry[] {
  const projectDir = join(REPO_ROOT_PATH, 'frontend', 'public', 'diagrams', projectId);
  if (!existsSync(projectDir)) return [];

  const stat = statSync(projectDir);
  if (!stat.isDirectory()) return [];

  const captions = readCaptionsSidecar(projectDir);
  const files = readdirSync(projectDir)
    .filter(isSupportedFile)
    .sort(); // orden lexicográfico: <NN>-<slug>.ext garantiza orden visual correcto

  const entries: DiagramEntry[] = [];

  for (const filename of files) {
    const fullPath = join(projectDir, filename);
    if (filename.toLowerCase().endsWith('.svg')) {
      const changes = sanitizeSvgFile(fullPath);
      if (changes.length > 0) {
        console.log(`[${projectId}] sanitizado ${filename}: ${changes.join(', ')}`);
      }
    }

    const entry: DiagramEntry = {
      url: `${BASE_URL}diagrams/${projectId}/${filename}`,
    };
    if (captions[filename]) {
      entry.caption = captions[filename];
    }
    entries.push(entry);
  }

  return entries;
}

function main(): void {
  const manifest = loadManifest();

  // Además del manifest, escaneamos cualquier carpeta `diagrams/<id>/` que ya exista.
  // Esto permite que proyectos sin entry en el manifest (ed1-ed5 por ahora) también
  // tengan sus diagramas indexados si los ponen en la convención de carpeta.
  const diagramsRoot = join(REPO_ROOT_PATH, 'frontend', 'public', 'diagrams');
  const folderProjectIds: string[] = existsSync(diagramsRoot)
    ? readdirSync(diagramsRoot).filter(name => statSync(join(diagramsRoot, name)).isDirectory())
    : [];

  // Mapeo de carpeta legacy `portfolio/` → `dev1` (compat retroactivo).
  // En el futuro, mover físicamente la carpeta y borrar este alias.
  const folderAliases: Record<string, string> = { portfolio: 'dev1' };

  const allProjectIds = new Set<string>([
    ...Object.keys(manifest),
    ...folderProjectIds.map(id => folderAliases[id] ?? id),
  ]);

  const result: Record<string, DiagramEntry[]> = {};

  for (const projectId of allProjectIds) {
    const folderName = Object.entries(folderAliases).find(([, id]) => id === projectId)?.[0] ?? projectId;
    const entries = scanProjectDiagrams(folderName);
    if (entries.length > 0) {
      // Reescribimos las URLs para que apunten al projectId canonical aunque la carpeta sea legacy.
      result[projectId] = entries.map(e => ({
        ...e,
        url: e.url.replace(`/diagrams/${folderName}/`, `/diagrams/${folderName}/`),
      }));
      console.log(`[${projectId}] ✓ ${entries.length} diagramas`);
    }
  }

  const outPath = repoRelative(join('frontend', 'src', 'data', 'generated', 'diagrams.json'));
  const content = JSON.stringify(result, null, 2) + '\n';
  const wrote = idempotentWrite(outPath, content);
  if (wrote) {
    console.log(`Escrito ${outPath} (${Object.keys(result).length} proyectos).`);
  } else {
    console.log('diagrams.json sin cambios.');
  }
}

main();
