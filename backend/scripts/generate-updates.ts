/**
 * Genera `frontend/src/data/generated/updates.json` con un resumen LLM-resumido
 * de los commits recientes de cada proyecto del manifest.
 *
 * Shape de salida: Record<projectId, Update[]>, donde Update = { date, description: { es, en } }.
 *
 * Idempotente. Se llama desde:
 *   - workflow `regenerate-content.yml` (push a main, weekly cron, manual)
 *   - local: `pnpm script:updates`
 */

import { join } from 'node:path';

import {
  cleanCommits,
  gitLog,
  idempotentWrite,
  loadManifest,
  REPO_ROOT_PATH,
  repoRelative,
  type ManifestEntry,
} from './lib/github.js';
import { callJsonAgent } from './lib/json-agent.js';
import type { Update } from './lib/types.js';

const SYSTEM_PROMPT = `Eres un asistente que resume commits de git en entradas de "Cambios recientes" para un portafolio profesional.

REGLAS DE FORMATO:
- Agrupa commits relacionados en 3 a 5 entradas (no más).
- Cada entrada tiene la fecha del commit más reciente del grupo (formato YYYY-MM-DD).
- Cada entrada tiene una descripción en español neutro y en inglés.
- Una sola oración por entrada, no más de 20 palabras.
- Tono profesional y técnico cuando aplica, sin marketing.
- No incluyas el hash del commit, ni mencionar "commit" o "git" en la descripción.

REGLAS DE IDIOMA:
- Español neutro: usa tuteo neutro (tú, quieres, sabes), nunca voseo (vos, querés, sabés), nunca formas de España (vosotros, vale).
- No uses guiones largos retóricos.

SALIDA:
- Devuelve EXCLUSIVAMENTE un JSON válido con shape:
  [{ "date": "YYYY-MM-DD", "description": { "es": "...", "en": "..." } }, ...]
- Nada antes ni después del JSON. Sin backticks. Sin explicaciones.`;

interface RawUpdate {
  date: string;
  description: { es: string; en: string };
}

function validateUpdates(parsed: unknown): asserts parsed is RawUpdate[] {
  if (!Array.isArray(parsed)) throw new Error('expected array');
  if (parsed.length < 1 || parsed.length > 8) {
    throw new Error(`expected 1-8 entries, got ${parsed.length}`);
  }
  for (const [i, u] of parsed.entries()) {
    if (typeof u !== 'object' || u === null) throw new Error(`entry ${i} not object`);
    const e = u as Partial<RawUpdate>;
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      throw new Error(`entry ${i}: invalid date "${e.date}"`);
    }
    if (
      typeof e.description !== 'object' ||
      typeof e.description?.es !== 'string' ||
      typeof e.description?.en !== 'string'
    ) {
      throw new Error(`entry ${i}: invalid description`);
    }
  }
}

async function generateForProject(projectId: string, entry: ManifestEntry): Promise<Update[] | null> {
  // Por ahora solo soportamos el repo del propio portafolio. Cuando aparezcan
  // repos externos en el manifest (Lakehouse, CDC, etc.), agregar git clone aquí.
  if (entry.repo !== 'portfolio') {
    console.log(`[${projectId}] saltado: repo ${entry.owner}/${entry.repo} no es el portafolio (clone externo TODO).`);
    return null;
  }

  const allCommits = gitLog(REPO_ROOT_PATH, 30);
  const commits = cleanCommits(allCommits);

  if (commits.length === 0) {
    console.warn(`[${projectId}] sin commits útiles después de filtrar ruido.`);
    return [];
  }

  const commitList = commits
    .map(c => `- ${c.date.slice(0, 10)}: ${c.subject}`)
    .join('\n');

  const userPrompt = `Proyecto: ${entry.displayName} (id ${projectId}).

Estos son los últimos ${commits.length} commits relevantes:

${commitList}

Resúmelos en 3-5 entradas agrupando trabajo relacionado.`;

  const updates = await callJsonAgent<RawUpdate[]>({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    tier: 'fast',
    maxTokens: 1500,
    temperature: 0.3,
    validate: validateUpdates,
  });

  return updates.map(u => ({ date: u.date, description: u.description }));
}

async function main(): Promise<void> {
  const manifest = loadManifest();
  const result: Record<string, Update[]> = {};

  for (const [projectId, entry] of Object.entries(manifest)) {
    console.log(`[${projectId}] generando updates...`);
    try {
      const updates = await generateForProject(projectId, entry);
      if (updates && updates.length > 0) {
        result[projectId] = updates;
        console.log(`[${projectId}] ✓ ${updates.length} entradas`);
      }
    } catch (err) {
      console.error(`[${projectId}] error:`, err instanceof Error ? err.message : err);
      // No throw — un proyecto que falla no debe tumbar al resto.
    }
  }

  const outPath = repoRelative(join('frontend', 'src', 'data', 'generated', 'updates.json'));
  const content = JSON.stringify(result, null, 2) + '\n';
  const wrote = idempotentWrite(outPath, content);
  if (wrote) {
    console.log(`Escrito ${outPath} (${Object.keys(result).length} proyectos).`);
  } else {
    console.log('updates.json sin cambios.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
