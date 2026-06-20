import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Category } from './types.js';

export type ManifestEntry = {
  owner: string;
  repo: string;
  branch: string;
  displayName: string;
};

export type Manifest = Record<string, ManifestEntry>;

export type Commit = {
  sha: string;
  date: string;
  subject: string;
};

const LIB_DIR = dirname(new URL(import.meta.url).pathname);

/** `app/` (la raíz del repo git). */
export const REPO_ROOT_PATH = join(LIB_DIR, '..', '..', '..');

/** `app/backend/data/manifest.json`. */
const MANIFEST_PATH = join(LIB_DIR, '..', '..', 'data', 'manifest.json');

/** `app/frontend/src/data/projects.ts`. */
const PROJECTS_TS_PATH = join(LIB_DIR, '..', '..', '..', 'frontend', 'src', 'data', 'projects.ts');

export function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

/**
 * Importa dinámicamente `frontend/src/data/projects.ts` sin necesitar Vite.
 *
 * `projects.ts` usa `import.meta.env.BASE_URL` que solo existe en builds de
 * Vite. Acá copiamos el archivo a un tmp dir reemplazando esa referencia por
 * un literal — los `import type` del frontend se eliminan al transpilar con
 * tsx, así que no hace falta resolver el alias `@/`.
 */
export async function loadProjectsFromFrontend(): Promise<Category[]> {
  const source = readFileSync(PROJECTS_TS_PATH, 'utf8');
  const patched = source
    // Vite-only en runtime de Node.
    .replace(/import\.meta\.env\.BASE_URL/g, "'/portfolio/'")
    // El bloque de override del final importa de ./generated/*.json que no
    // existen al copiar el archivo a un tmp dir. Solo necesitamos portfolioData
    // puro, así que cortamos desde el marker hasta el final.
    .replace(/\/\/ --- Auto-generated overrides[\s\S]*$/m, '');

  const tmp = mkdtempSync(join(tmpdir(), 'portfolio-projects-'));
  const tmpFile = join(tmp, 'projects.ts');
  writeFileSync(tmpFile, patched);

  try {
    const mod = await import(pathToFileURL(tmpFile).href);
    return (mod as { portfolioData: Category[] }).portfolioData;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function gitLog(repoPath: string, count: number = 30): Commit[] {
  const raw = execFileSync(
    'git',
    ['-C', repoPath, 'log', `--pretty=format:%h|%ai|%s`, `-n`, String(count)],
    { encoding: 'utf8' },
  );
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, date, ...subjectParts] = line.split('|');
      return { sha, date, subject: subjectParts.join('|') };
    });
}

export function gitLogSince(repoPath: string, since: string): Commit[] {
  const raw = execFileSync(
    'git',
    ['-C', repoPath, 'log', `--pretty=format:%h|%ai|%s`, `--since=${since}`],
    { encoding: 'utf8' },
  );
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, date, ...subjectParts] = line.split('|');
      return { sha, date, subject: subjectParts.join('|') };
    });
}

const NOISE_PATTERNS = [
  /\[skip ci\]/i,
  /^merge\b/i,
  /^chore:\s*$/i, // chore: vacío
  /^chore\(release\):/i,
  /^bump\s+/i,
];

/** Filtra commits que no son útiles para resumir en updates del portafolio. */
export function cleanCommits(commits: Commit[]): Commit[] {
  return commits.filter(c => !NOISE_PATTERNS.some(re => re.test(c.subject)));
}

/**
 * Escribe `content` a `path` solo si difiere del existente. Crea directorios
 * intermedios si hace falta. Devuelve `true` si escribió, `false` si saltó.
 */
export function idempotentWrite(path: string, content: string): boolean {
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') === content) return false;
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  writeFileSync(path, content, 'utf8');
  return true;
}

/** `app/<rel>`. */
export function repoRelative(rel: string): string {
  return join(REPO_ROOT_PATH, rel);
}

/**
 * Clona shallow un repo público de GitHub a un tmp dir y devuelve el path.
 * El caller es responsable de borrar el dir con `cleanupClone()` cuando
 * termine (idealmente en un `try/finally`).
 *
 * - `depth=30` para agentes que leen commits (generate-updates).
 * - `depth=1` para agentes que solo leen el README (generate-concepts, generate-docs).
 * - `--filter=blob:none` evita descargar contenidos de blobs viejos (más rápido).
 *
 * Usa el binario `git` del sistema. En CI (GitHub Actions) ya viene instalado.
 * En local, requiere `apt install git` (vino con casi cualquier setup).
 */
export function cloneShallow(
  entry: ManifestEntry,
  options: { depth?: number } = {},
): string {
  const depth = options.depth ?? 30;
  const tmpDir = mkdtempSync(join(tmpdir(), `portfolio-clone-${entry.repo}-`));
  const url = `https://github.com/${entry.owner}/${entry.repo}.git`;
  try {
    execFileSync(
      'git',
      [
        'clone',
        '--depth',
        String(depth),
        '--branch',
        entry.branch,
        '--filter=blob:none',
        '--single-branch',
        url,
        tmpDir,
      ],
      { stdio: 'pipe' },
    );
    return tmpDir;
  } catch (err) {
    // Si el clone falla, limpiamos el tmp dir antes de re-lanzar.
    cleanupClone(tmpDir);
    throw new Error(
      `cloneShallow falló para ${entry.owner}/${entry.repo}@${entry.branch}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** Borra recursivo el tmp dir creado por `cloneShallow()`. Idempotente. */
export function cleanupClone(tmpDir: string): void {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Si la limpieza falla, no es crítico — el SO eventualmente limpia /tmp.
  }
}

/**
 * Determina si una entry del manifest apunta al propio repo del portafolio
 * (donde ya tenemos el filesystem cargado) o a un repo externo (que hay que
 * clonar). Convención: si `repo === 'portfolio'`, es el local.
 */
export function isLocalRepo(entry: ManifestEntry): boolean {
  return entry.repo === 'portfolio';
}
