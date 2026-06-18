/**
 * Genera la documentación PDF (4 variantes) de cada proyecto del manifest.
 *
 * Variantes producidas por proyecto:
 *   - light/documentation.es.pdf + light/pages-es/page-N.png
 *   - light/documentation.en.pdf + light/pages-en/page-N.png
 *   - dark/documentation.es.pdf  + dark/pages-es/page-N.png
 *   - dark/documentation.en.pdf  + dark/pages-en/page-N.png
 *
 * Una sola llamada al LLM (Llama 70B) genera los 4 bloques dinámicos en
 * ambos idiomas. Después compila 4 veces combinando plantilla ES/EN con
 * paleta light/dark.
 *
 * Requiere `xelatex` y `pdftoppm` instalados en el sistema:
 *   sudo apt install texlive-xetex texlive-fonts-recommended \
 *                    texlive-latex-extra fonts-dejavu poppler-utils
 *
 * Local: `pnpm script:docs`
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  cleanCommits,
  gitLog,
  idempotentWrite,
  loadManifest,
  loadProjectsFromFrontend,
  REPO_ROOT_PATH,
  repoRelative,
  type ManifestEntry,
} from './lib/github.js';
import { callJsonAgent } from './lib/json-agent.js';
import { compileAndPlace, escapeLatex, itemize, renderTemplate } from './lib/latex.js';
import type { Project } from './lib/types.js';
import { resolveLocalized } from './lib/types.js';

const SYSTEM_PROMPT = `Eres un asistente que escribe documentación técnica concisa para un poster A3 de un proyecto técnico. Generas el contenido EN AMBOS IDIOMAS (español neutro + inglés) en una sola respuesta.

REGLAS DE CONTENIDO:
- Tono profesional, técnico pero accesible.
- Español neutro: usa tuteo neutro (tú, sabes, puedes), nunca voseo (vos, sabés, podés) ni formas de España (vosotros).
- Inglés natural y profesional, traducción equivalente (no literal palabra-por-palabra).
- No uses guiones largos retóricos. Sin emojis. Sin hashtags.
- No inventes datos: usa solo lo que está en el contexto.

REGLAS DE LONGITUD:
- "overview": 2-3 oraciones describiendo el proyecto.
- "features": 4-6 puntos breves (máximo 12 palabras cada uno).
- "roadmap": 3-4 puntos de próximos pasos.
- "recentChanges": 2-3 oraciones resumiendo qué se hizo recientemente.

REGLAS DE FORMATO TEXTUAL:
- No incluyas comandos LaTeX. El sistema los formatea aparte.
- No menciones que el contexto viene de README o git log.

SALIDA:
- Devuelve EXCLUSIVAMENTE un JSON válido con shape:
  {
    "overview": { "es": "...", "en": "..." },
    "features": { "es": ["...", "..."], "en": ["...", "..."] },
    "roadmap": { "es": ["...", "..."], "en": ["...", "..."] },
    "recentChanges": { "es": "...", "en": "..." }
  }
- Sin backticks. Sin explicaciones. Sin texto antes ni después.`;

interface BilingualString {
  es: string;
  en: string;
}
interface BilingualStringList {
  es: string[];
  en: string[];
}
interface DocBlocks {
  overview: BilingualString;
  features: BilingualStringList;
  roadmap: BilingualStringList;
  recentChanges: BilingualString;
}

type Lang = 'es' | 'en';
type Theme = 'light' | 'dark';

function isBilingualString(v: unknown): v is BilingualString {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as BilingualString).es === 'string' &&
    typeof (v as BilingualString).en === 'string' &&
    (v as BilingualString).es.length > 10 &&
    (v as BilingualString).en.length > 10
  );
}
function isBilingualList(v: unknown, min: number, max: number): v is BilingualStringList {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as BilingualStringList;
  if (!Array.isArray(o.es) || !Array.isArray(o.en)) return false;
  if (o.es.length < min || o.es.length > max) return false;
  if (o.en.length < min || o.en.length > max) return false;
  return o.es.every(s => typeof s === 'string') && o.en.every(s => typeof s === 'string');
}

function validateBlocks(parsed: unknown): asserts parsed is DocBlocks {
  if (typeof parsed !== 'object' || parsed === null) throw new Error('expected object');
  const p = parsed as Partial<DocBlocks>;
  if (!isBilingualString(p.overview)) throw new Error('overview missing or invalid bilingual shape');
  if (!isBilingualList(p.features, 3, 8)) throw new Error('features: expected 3-8 items in es and en');
  if (!isBilingualList(p.roadmap, 2, 6)) throw new Error('roadmap: expected 2-6 items in es and en');
  if (!isBilingualString(p.recentChanges)) throw new Error('recentChanges missing or invalid bilingual shape');
}

function readReadmeForProject(entry: ManifestEntry): string {
  if (entry.repo !== 'portfolio') return '';
  try {
    return readFileSync(join(REPO_ROOT_PATH, 'README.md'), 'utf8');
  } catch {
    return '';
  }
}

function getRepoUrl(entry: ManifestEntry): string {
  return `https://github.com/${entry.owner}/${entry.repo}`;
}

function getDemoUrl(entry: ManifestEntry, project: Project): string {
  if (entry.repo === 'portfolio') return 'https://luisanaruggia.github.io/portfolio/';
  return `https://luisanaruggia.github.io/portfolio/#/project/${project.id}`;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date: Date, lang: Lang): string {
  const months = lang === 'es' ? MONTHS_ES : MONTHS_EN;
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getVersion(): string {
  try {
    const tag = execFileSync('git', ['-C', REPO_ROOT_PATH, 'describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (tag) return tag.replace(/^v/, '');
  } catch {
    // sin tags
  }
  const sha = execFileSync('git', ['-C', REPO_ROOT_PATH, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  return `dev-${sha}`;
}

function stripUrlPrefix(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Paletas por tema. Accent naranja se mantiene; el resto se invierte. */
const PALETTES: Record<Theme, Record<string, string>> = {
  light: {
    COLOR_ACCENT_DARK: 'D45A00',
    COLOR_ACCENT_LIGHT: 'FFE6CC',
    COLOR_BODY_TEXT: '1A1A1A',
    COLOR_MUTED_TEXT: '6B6B6B',
    COLOR_CARD_BG: 'FAFAFA',
    COLOR_PAGE_BG: 'FFFFFF',
  },
  dark: {
    // Paleta dark con foco en legibilidad:
    // - page_bg `121212` y card_bg `1F1F1F` (Material Design dark surface) en lugar
    //   de negros casi-puros (`0A0A0A` cansaba la vista, no diferenciaba bloques).
    // - body_text `F1F1F1` blanco cálido (contraste ~14:1 sobre card_bg).
    // - muted_text `C5C5C5` subió de A0A0A0 para que la metadata del header
    //   y los \posterheading sean cómodos de leer.
    // - accent_dark `FFB870` naranja cálido (más legible sobre fondo oscuro
    //   que el naranja saturado original F97316 que vibra).
    COLOR_ACCENT_DARK: 'FFB870',
    COLOR_ACCENT_LIGHT: '2A1E12',
    COLOR_BODY_TEXT: 'F1F1F1',
    COLOR_MUTED_TEXT: 'C5C5C5',
    COLOR_CARD_BG: '1F1F1F',
    COLOR_PAGE_BG: '121212',
  },
};

const SUBTITLE: Record<Lang, string> = {
  es: 'Documentación técnica del proyecto',
  en: 'Technical project documentation',
};

interface CompileTarget {
  lang: Lang;
  theme: Theme;
  templatePath: string;
}

async function generateForProject(
  projectId: string,
  entry: ManifestEntry,
  project: Project,
): Promise<{ pageCount: number; variants: string[] }> {
  // 1. Recolectar contexto
  const readme = readReadmeForProject(entry);
  const description = resolveLocalized(project.description, 'es');
  const tags = project.tags?.join(', ') ?? '';
  const commits = cleanCommits(gitLog(REPO_ROOT_PATH, 25));
  const commitList = commits.slice(0, 15).map(c => `- ${c.subject}`).join('\n');

  const userPrompt = `Proyecto: ${entry.displayName} (id ${projectId}).

Descripción del proyecto:
${description}

Stack: ${tags}

Últimos commits (más recientes primero):
${commitList}

README:
${readme.slice(0, 3500)}

Genera los bloques en ambos idiomas siguiendo las reglas.`;

  console.log(`[${projectId}] pidiendo bloques bilingües al LLM...`);
  const blocks = await callJsonAgent<DocBlocks>({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    tier: 'quality',
    maxTokens: 3000,
    temperature: 0.3,
    validate: validateBlocks,
  });

  // 2. Metadata común (versión y URLs son iguales para todas las variantes)
  const version = getVersion();
  const repoUrl = getRepoUrl(entry);
  const demoUrl = getDemoUrl(entry, project);
  const commitDate = new Date(commits[0]?.date ?? new Date().toISOString());

  // 3. Compilar las 4 variantes
  const targets: CompileTarget[] = [
    { lang: 'es', theme: 'light', templatePath: repoRelative('backend/templates/documentation-poster.es.tex') },
    { lang: 'es', theme: 'dark', templatePath: repoRelative('backend/templates/documentation-poster.es.tex') },
    { lang: 'en', theme: 'light', templatePath: repoRelative('backend/templates/documentation-poster.en.tex') },
    { lang: 'en', theme: 'dark', templatePath: repoRelative('backend/templates/documentation-poster.en.tex') },
  ];

  let pageCountSeen = 0;
  const variants: string[] = [];

  for (const target of targets) {
    const variantKey = `${target.theme}-${target.lang}`;
    console.log(`[${projectId}] compilando ${variantKey}...`);

    const titleText = resolveLocalized(project.title, target.lang);
    const template = readFileSync(target.templatePath, 'utf8');

    const values: Record<string, string> = {
      // Metadata
      TITLE: escapeLatex(titleText),
      SUBTITLE: escapeLatex(SUBTITLE[target.lang]),
      VERSION: escapeLatex(version),
      LAST_UPDATE: escapeLatex(formatDate(commitDate, target.lang)),
      REPO_URL: escapeLatex(repoUrl),
      REPO_LABEL: escapeLatex(stripUrlPrefix(repoUrl)),
      DEMO_URL: escapeLatex(demoUrl),
      DEMO_LABEL: escapeLatex(stripUrlPrefix(demoUrl)),
      // Bloques dinámicos del LLM
      OVERVIEW: escapeLatex(blocks.overview[target.lang]),
      FEATURES_LIST: itemize(blocks.features[target.lang]),
      RECENT_CHANGES: escapeLatex(blocks.recentChanges[target.lang]),
      ROADMAP_LIST: itemize(blocks.roadmap[target.lang]),
      // Paleta
      ...PALETTES[target.theme],
    };

    const rendered = renderTemplate(template, values);

    const destPdf = join(REPO_ROOT_PATH, 'frontend', 'public', 'docs', projectId, target.theme, `documentation.${target.lang}.pdf`);
    const destPages = join(REPO_ROOT_PATH, 'frontend', 'public', 'docs', projectId, target.theme, `pages-${target.lang}`);

    const { pageCount } = compileAndPlace(rendered, destPdf, destPages, { dpi: 300 });
    pageCountSeen = pageCount;
    variants.push(variantKey);
    console.log(`[${projectId}] ✓ ${variantKey}: ${pageCount} página(s)`);
  }

  return { pageCount: pageCountSeen, variants };
}

async function main(): Promise<void> {
  const manifest = loadManifest();
  const portfolioData = await loadProjectsFromFrontend();
  const projectsById = new Map<string, Project>();
  for (const cat of portfolioData) {
    for (const p of cat.projects) projectsById.set(p.id, p);
  }

  const docsMeta: Record<string, { pageCount: number; variants: string[] }> = {};

  for (const [projectId, entry] of Object.entries(manifest)) {
    const project = projectsById.get(projectId);
    if (!project) {
      console.warn(`[${projectId}] no aparece en projects.ts, saltado.`);
      continue;
    }
    try {
      const result = await generateForProject(projectId, entry, project);
      docsMeta[projectId] = result;
    } catch (err) {
      console.error(`[${projectId}] error:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }

  // Escribir docs.json con metadata para el frontend
  const outPath = repoRelative(join('frontend', 'src', 'data', 'generated', 'docs.json'));
  const content = JSON.stringify(docsMeta, null, 2) + '\n';
  const wrote = idempotentWrite(outPath, content);
  if (wrote) {
    console.log(`Escrito ${outPath}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
