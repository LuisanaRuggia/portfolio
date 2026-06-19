/**
 * Detecta el status de un proyecto a partir de un GitHub release tag y
 * actualiza el campo `status` del proyecto correspondiente en
 * `frontend/src/data/projects.ts`.
 *
 * Reglas:
 *   - tag `v1.x.y` (no prerelease) → "finished"
 *   - tag `v0.x.y` (no prerelease) → "finished-open"
 *   - prerelease (`v1.0.0-beta`, etc.) → no cambia el status
 *
 * El workflow `.github/workflows/detect-status.yml` lo dispara con dos env:
 *   GITHUB_REPOSITORY=owner/repo
 *   GITHUB_REF=refs/tags/v1.0.0
 *
 * Local (para probar):
 *   GITHUB_REPOSITORY=LuisanaRuggia/portfolio \
 *   GITHUB_REF=refs/tags/v0.5.0 \
 *     pnpm script:status
 *
 * Idempotente: si el status ya es el correcto, no escribe.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { loadManifest, REPO_ROOT_PATH } from './lib/github.js';
import { join } from 'node:path';

type Status = 'in-progress' | 'finished-open' | 'finished';

function parseTagToStatus(rawTag: string): Status | null {
  // refs/tags/v1.0.0 → v1.0.0
  const tag = rawTag.replace(/^refs\/tags\//, '');
  // Prerelease: anything with `-` after the version (v1.0.0-beta, v0.5.0-rc1).
  if (/-/.test(tag)) {
    console.log(`Tag "${tag}" es prerelease, no cambia status.`);
    return null;
  }
  const m = /^v?(\d+)\./.exec(tag);
  if (!m) {
    console.log(`Tag "${tag}" no matchea el patrón vX.Y.Z, ignorado.`);
    return null;
  }
  const major = parseInt(m[1], 10);
  return major >= 1 ? 'finished' : 'finished-open';
}

function findProjectIdByRepo(owner: string, repo: string): string | null {
  const manifest = loadManifest();
  for (const [projectId, entry] of Object.entries(manifest)) {
    if (entry.owner === owner && entry.repo === repo) return projectId;
  }
  return null;
}

/**
 * Reemplaza el campo `status: "..."` del proyecto con id `projectId` en
 * projects.ts. Usa regex que busca el `id: "<projectId>"` y después el
 * primer `status: "..."` dentro de ese mismo objeto.
 */
function updateStatusInProjectsTs(projectId: string, newStatus: Status): boolean {
  const path = join(REPO_ROOT_PATH, 'frontend', 'src', 'data', 'projects.ts');
  const source = readFileSync(path, 'utf8');

  // Localiza el bloque del proyecto. El id puede estar entre comillas " o '.
  // Después busca el primer status: "..." dentro de las próximas ~80 líneas.
  const idPattern = new RegExp(`id:\\s*["']${projectId}["']`);
  const idMatch = idPattern.exec(source);
  if (!idMatch) {
    console.warn(`Project id "${projectId}" no encontrado en projects.ts.`);
    return false;
  }

  // A partir del match del id, busca el siguiente `status: "..."`.
  // Si no hay, el proyecto no tiene campo status declarado.
  const tail = source.slice(idMatch.index);
  const statusPattern = /(status:\s*)["']([^"']+)["']/;
  const statusMatch = statusPattern.exec(tail);
  if (!statusMatch) {
    console.warn(`Project "${projectId}" no tiene campo status declarado. No se hace cambio.`);
    return false;
  }
  const currentStatus = statusMatch[2];
  if (currentStatus === newStatus) {
    console.log(`Project "${projectId}" ya tiene status="${newStatus}", no se hace cambio.`);
    return false;
  }

  // Reemplaza solo el primer match dentro del bloque.
  const before = source.slice(0, idMatch.index);
  const newTail = tail.replace(statusPattern, `$1"${newStatus}"`);
  const newSource = before + newTail;

  writeFileSync(path, newSource, 'utf8');
  console.log(`Project "${projectId}" status: "${currentStatus}" → "${newStatus}"`);
  return true;
}

function main(): void {
  const repository = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_REF;

  if (!repository) {
    console.error('GITHUB_REPOSITORY no está definido.');
    process.exit(1);
  }
  if (!ref) {
    console.error('GITHUB_REF no está definido.');
    process.exit(1);
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    console.error(`GITHUB_REPOSITORY inválido: "${repository}"`);
    process.exit(1);
  }

  const projectId = findProjectIdByRepo(owner, repo);
  if (!projectId) {
    console.log(`Repo ${owner}/${repo} no está en el manifest, ignorado.`);
    return;
  }

  const newStatus = parseTagToStatus(ref);
  if (!newStatus) return;

  updateStatusInProjectsTs(projectId, newStatus);
}

main();
