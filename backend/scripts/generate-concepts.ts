/**
 * Genera `frontend/src/data/generated/concepts.json` con el grafo de conceptos
 * (nodos + edges) auto-derivado del README + tags + descripción de cada proyecto.
 *
 * Shape de salida: Record<projectId, ProjectConcepts>.
 *
 * Idempotente. Se llama desde:
 *   - workflow `regenerate-content.yml` (push a main, weekly cron, manual)
 *   - local: `pnpm script:concepts`
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  cleanupClone,
  cloneShallow,
  idempotentWrite,
  isLocalRepo,
  loadManifest,
  loadProjectsFromFrontend,
  REPO_ROOT_PATH,
  repoRelative,
  type ManifestEntry,
} from './lib/github.js';
import { callJsonAgent } from './lib/json-agent.js';
import type { ConceptGroup, Project, ProjectConcepts } from './lib/types.js';
import { resolveLocalized } from './lib/types.js';

const VALID_GROUPS: readonly ConceptGroup[] = ['arch', 'data', 'ops', 'ml'] as const;

const SYSTEM_PROMPT = `Eres un asistente que extrae conceptos clave de un proyecto técnico para renderizar un grafo conceptual (tipo Obsidian) en un portafolio.

REGLAS DE EXTRACCIÓN:
- Devuelve entre 6 y 10 nodos.
- Cada nodo representa un concepto técnico relevante (ej. "Arquitectura Medallion", "Stream processing", "Feature Store").
- NO incluyas el nombre del proyecto como nodo.
- NO incluyas tecnologías específicas como nodo único (ej. "React", "Postgres") — usa conceptos abstractos.
- Devuelve entre 5 y 12 edges que conecten conceptos relacionados.
- No incluyas edges redundantes ni autorreferencias.

REGLAS DE GRUPOS (controla el color del nodo):
- "arch": patrones arquitectónicos (medallion, kappa, lakehouse, jamstack, event-driven).
- "data": conceptos de datos (CDC, ACID, schemas, particionado, modelado).
- "ops": operación, infraestructura, observabilidad (orquestación, IaC, monitoring, CI/CD).
- "ml": machine learning (features, training, serving, drift).

REGLAS DE IDIOMA:
- Cada label tiene { es, en } con la traducción.
- Español neutro: tuteo neutro, sin voseo ni regionalismos.

REGLAS DE FORMATO DEL ID:
- id es un slug en inglés, lowercase, palabras separadas por guiones (ej. "medallion-architecture").

SALIDA:
- Devuelve EXCLUSIVAMENTE un JSON válido con shape:
  { "nodes": [{ "id": "...", "label": { "es": "...", "en": "..." }, "group": "arch|data|ops|ml" }], "edges": [{ "from": "...", "to": "..." }] }
- Nada antes ni después del JSON. Sin backticks. Sin explicaciones.`;

function validateConcepts(parsed: unknown): asserts parsed is ProjectConcepts {
  if (typeof parsed !== 'object' || parsed === null) throw new Error('expected object');
  const p = parsed as Partial<ProjectConcepts>;
  if (!Array.isArray(p.nodes)) throw new Error('nodes not array');
  if (!Array.isArray(p.edges)) throw new Error('edges not array');
  if (p.nodes.length < 4 || p.nodes.length > 12) {
    throw new Error(`expected 4-12 nodes, got ${p.nodes.length}`);
  }
  const ids = new Set<string>();
  for (const n of p.nodes) {
    if (typeof n.id !== 'string' || !n.id) throw new Error('node id missing');
    if (ids.has(n.id)) throw new Error(`duplicate node id ${n.id}`);
    ids.add(n.id);
    if (typeof n.label !== 'object' || typeof n.label?.es !== 'string' || typeof n.label?.en !== 'string') {
      throw new Error(`node ${n.id}: invalid label`);
    }
    if (!VALID_GROUPS.includes(n.group)) {
      throw new Error(`node ${n.id}: invalid group "${n.group}"`);
    }
  }
  for (const [i, e] of p.edges.entries()) {
    if (typeof e.from !== 'string' || typeof e.to !== 'string') {
      throw new Error(`edge ${i}: missing from/to`);
    }
    if (!ids.has(e.from)) throw new Error(`edge ${i}: from "${e.from}" not in nodes`);
    if (!ids.has(e.to)) throw new Error(`edge ${i}: to "${e.to}" not in nodes`);
  }
}

/**
 * Lee el README. Si el repo es el propio del portafolio, lo lee del filesystem.
 * Si es externo, clona shallow (depth=1), lee y devuelve el contenido + el
 * tmpDir para que el caller lo limpie.
 */
function fetchReadme(entry: ManifestEntry): { readme: string | null; tmpDir: string | null } {
  if (isLocalRepo(entry)) {
    try {
      return { readme: readFileSync(join(REPO_ROOT_PATH, 'README.md'), 'utf8'), tmpDir: null };
    } catch {
      return { readme: null, tmpDir: null };
    }
  }
  let tmpDir: string | null = null;
  try {
    tmpDir = cloneShallow(entry, { depth: 1 });
    const readme = readFileSync(join(tmpDir, 'README.md'), 'utf8');
    return { readme, tmpDir };
  } catch (err) {
    if (tmpDir) cleanupClone(tmpDir);
    console.warn(`[${entry.repo}] no se pudo leer README: ${err instanceof Error ? err.message : err}`);
    return { readme: null, tmpDir: null };
  }
}

async function generateForProject(
  projectId: string,
  entry: ManifestEntry,
  project: Project | undefined,
): Promise<ProjectConcepts | null> {
  if (!project) {
    console.warn(`[${projectId}] no aparece en projects.ts.`);
    return null;
  }

  const { readme, tmpDir } = fetchReadme(entry);
  try {
    return await generateConceptsFromReadme(projectId, entry, project, readme);
  } finally {
    if (tmpDir) cleanupClone(tmpDir);
  }
}

async function generateConceptsFromReadme(
  projectId: string,
  entry: ManifestEntry,
  project: Project,
  readme: string | null,
): Promise<ProjectConcepts | null> {
  const description = resolveLocalized(project.description, 'es');
  const tags = project.tags?.join(', ') ?? '';

  const userPrompt = `Proyecto: ${entry.displayName} (id ${projectId}).

Descripción:
${description}

Stack: ${tags}

README del repo (resumen):
${readme ? readme.slice(0, 4000) : '(no disponible)'}

Extrae el grafo de conceptos siguiendo las reglas.`;

  const concepts = await callJsonAgent<ProjectConcepts>({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    tier: 'quality',
    maxTokens: 2000,
    temperature: 0.3,
    validate: validateConcepts,
  });

  return concepts;
}

async function main(): Promise<void> {
  const manifest = loadManifest();
  const portfolioData = await loadProjectsFromFrontend();
  const projectsById = new Map<string, Project>();
  for (const cat of portfolioData) {
    for (const p of cat.projects) projectsById.set(p.id, p);
  }

  const result: Record<string, ProjectConcepts> = {};

  for (const [projectId, entry] of Object.entries(manifest)) {
    console.log(`[${projectId}] generando concepts...`);
    try {
      const concepts = await generateForProject(projectId, entry, projectsById.get(projectId));
      if (concepts && concepts.nodes.length > 0) {
        result[projectId] = concepts;
        console.log(`[${projectId}] ✓ ${concepts.nodes.length} nodos, ${concepts.edges.length} edges`);
      }
    } catch (err) {
      console.error(`[${projectId}] error:`, err instanceof Error ? err.message : err);
    }
  }

  const outPath = repoRelative(join('frontend', 'src', 'data', 'generated', 'concepts.json'));
  const content = JSON.stringify(result, null, 2) + '\n';
  const wrote = idempotentWrite(outPath, content);
  if (wrote) {
    console.log(`Escrito ${outPath} (${Object.keys(result).length} proyectos).`);
  } else {
    console.log('concepts.json sin cambios.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
