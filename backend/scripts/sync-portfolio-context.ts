/**
 * Genera el system prompt del chat worker a partir de portfolioData del frontend.
 *
 * Lee:  frontend/src/data/projects.ts (dynamic import, type-stripped por tsx)
 * Escribe: backend/workers/chat/src/portfolio-context.generated.ts
 *
 * Idempotente: si el output es igual al existente, no toca el archivo.
 * Se llama en cada deploy del worker (ver .github/workflows/deploy-workers.yml).
 */

import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

// Tipos mínimos re-declarados localmente para evitar arrastrar el typecheck del
// frontend al backend. Mantener en sync con frontend/src/data/projects.ts si
// el shape cambia (es rare — el shape de Project es estable).
type LocalizedString = string | { es: string; en: string };
type ProjectStatus = 'in-progress' | 'finished-open' | 'finished';

interface Project {
  id: string;
  title: LocalizedString;
  description?: LocalizedString;
  tags?: string[];
  status?: ProjectStatus;
}

interface Category {
  /** Translation key, p.ej. "category.ingenieriaDeDatos". */
  title: string;
  projects: Project[];
}

/** Resuelve un LocalizedString al idioma pedido. Acepta string crudo. */
function resolve(s: LocalizedString | undefined, lang: 'es' | 'en'): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s[lang];
}

/** Traducción de las categorías (sus translation keys vienen del i18n del frontend). */
const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  'category.cienciaDeDatos': { es: 'Ciencia de datos', en: 'Data science' },
  'category.ingenieriaDeDatos': { es: 'Ingeniería de datos', en: 'Data engineering' },
  'category.analisisDeDatos': { es: 'Análisis de datos', en: 'Data analysis' },
  'category.inteligenciaArtificial': { es: 'Inteligencia artificial', en: 'Artificial intelligence' },
  'category.computacionCuantica': { es: 'Computación cuántica', en: 'Quantum computing' },
  'category.algoritmia': { es: 'Algoritmia', en: 'Algorithmics' },
  'category.desarrollo': { es: 'Desarrollo de software', en: 'Software development' },
};

/** Estados localizados. */
const STATUS_LABELS: Record<ProjectStatus, { es: string; en: string }> = {
  'in-progress': { es: 'en progreso', en: 'in progress' },
  'finished-open': { es: 'terminado, open-source', en: 'finished, open-source' },
  finished: { es: 'terminado', en: 'finished' },
};

/** Cabecera del prompt — "Sobre mí". Habla en primera persona como Luisana. */
const ABOUT_ME = {
  es: `Soy Luisana Ruggia, estudiante de Ingeniería en Ciencia de Datos en el Politécnico Grancolombiano. Vivo en Bogotá, Colombia. Actualmente trabajo en GSE — Gestión de Seguridad Electrónica S.A. Construí este portafolio para mostrar los proyectos en los que he trabajado. Los que están publicados aquí son proyectos personales que hago por interés propio fuera de la carrera. Tengo además proyectos académicos de análisis de datos y dashboards que aún no he subido al portafolio. Por ahora no estoy buscando empleo activamente; el portafolio es para enseñar lo que sé hacer.

### Stack técnico con el que tengo experiencia
- **Lenguajes**: Python, SQL
- **Ingeniería de datos**: Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow, MinIO, ClickHouse, Iceberg
- **ML / MLOps**: Feast (feature store), pipelines de training, serving de modelos
- **BI / Visualización**: Power BI, Apache Superset (creo charts y dashboards para mis proyectos)
- **Automatizaciones e IA**: agentes de IA, pipelines automatizados, integración con LLMs
- **Cloud / contenedores**: Docker, Cloudflare Workers

### Experiencia
- Trabajo actualmente en GSE (Gestión de Seguridad Electrónica S.A).
- He trabajado como analista de datos.
- Tengo fundamentos sólidos en estadística y matemáticas.
- Áreas en las que tengo proyectos y experiencia práctica: ingeniería de datos, ciencia de datos, análisis de datos, inteligencia artificial.

### Cómo trabajo
- Aprendo rápido herramientas nuevas cuando un proyecto lo requiere.
- Pienso en arquitectura y trade-offs antes de codear.
- Trabajo end-to-end: del dato crudo al producto final.
- Documento y comunico bien lo que construyo (este portafolio es prueba).`,
  en: `I'm Luisana Ruggia, a Data Science Engineering student at Politécnico Grancolombiano. I live in Bogotá, Colombia. I currently work at GSE — Gestión de Seguridad Electrónica S.A. I built this portfolio to showcase the projects I've worked on. The ones published here are personal projects I do out of interest, outside the degree. I also have academic projects on data analysis and dashboards that I haven't uploaded to the portfolio yet. I'm not actively looking for a job right now; the portfolio is to share what I can do.

### Tech stack I have hands-on experience with
- **Languages**: Python, SQL
- **Data engineering**: Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow, MinIO, ClickHouse, Iceberg
- **ML / MLOps**: Feast (feature store), training pipelines, model serving
- **BI / Visualization**: Power BI, Apache Superset (I build charts and dashboards for my projects)
- **Automation and AI**: AI agents, automated pipelines, LLM integration
- **Cloud / containers**: Docker, Cloudflare Workers

### Experience
- I currently work at GSE (Gestión de Seguridad Electrónica S.A).
- I've worked as a data analyst.
- I have solid foundations in statistics and mathematics.
- Areas where I have projects and practical experience: data engineering, data science, data analysis, artificial intelligence.

### How I work
- I learn new tools quickly when a project requires it.
- I think about architecture and trade-offs before coding.
- I work end-to-end: from raw data to the final product.
- I document and communicate clearly what I build (this portfolio is proof).`,
};

function buildContext(portfolioData: Category[], lang: 'es' | 'en'): string {
  const sections: string[] = [];

  sections.push(lang === 'es' ? '## SOBRE MÍ\n' : '## ABOUT ME\n');
  sections.push(ABOUT_ME[lang]);

  sections.push('\n' + (lang === 'es' ? '## PROYECTOS DEL PORTAFOLIO' : '## PORTFOLIO PROJECTS'));

  for (const cat of portfolioData) {
    if (cat.projects.length === 0) continue;
    const catLabel = CATEGORY_LABELS[cat.title]?.[lang] ?? cat.title;
    sections.push(`\n### ${catLabel}`);

    for (const p of cat.projects) {
      const title = resolve(p.title, lang);
      const status = p.status ? ` (${STATUS_LABELS[p.status][lang]})` : '';
      sections.push(`\n- **${title}** [id: ${p.id}]${status}`);

      const desc = resolve(p.description, lang);
      if (desc) sections.push(`  ${desc}`);

      if (p.tags && p.tags.length > 0) {
        const label = lang === 'es' ? 'Stack' : 'Stack';
        sections.push(`  ${label}: ${p.tags.join(', ')}`);
      }
    }
  }

  return sections.join('\n');
}

const HEADER = `// AUTO-GENERATED — no editar manualmente.
// Generado por backend/scripts/sync-portfolio-context.ts desde frontend/src/data/projects.ts.
// Para regenerar: pnpm script:context

`;

function buildFileContent(es: string, en: string): string {
  return (
    HEADER +
    'export const PORTFOLIO_CONTEXT = {\n' +
    `  es: ${JSON.stringify(es)},\n` +
    `  en: ${JSON.stringify(en)},\n` +
    '} as const;\n'
  );
}

/**
 * Carga `portfolioData` del frontend sin depender de Vite.
 *
 * `projects.ts` usa `import.meta.env.BASE_URL` (inyectado por Vite en build-time)
 * para construir rutas de assets. En Node puro no existe. Como solo necesitamos
 * los campos textuales (id, title, description, tags, status) y no las URLs de
 * assets, hacemos un copy temporal del archivo reemplazando esa referencia por
 * un literal y lo importamos dinámicamente.
 */
async function loadPortfolioData(): Promise<Category[]> {
  const projectsPath = join(
    dirname(new URL(import.meta.url).pathname),
    '..',
    '..',
    'frontend',
    'src',
    'data',
    'projects.ts',
  );
  const source = readFileSync(projectsPath, 'utf8');
  const patched = source.replace(/import\.meta\.env\.BASE_URL/g, "'/portfolio/'");

  const tmpDir = mkdtempSync(join(tmpdir(), 'portfolio-context-'));
  const tmpFile = join(tmpDir, 'projects.ts');
  writeFileSync(tmpFile, patched);

  try {
    const mod = await import(pathToFileURL(tmpFile).href);
    return (mod as { portfolioData: Category[] }).portfolioData;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const portfolioData = await loadPortfolioData();

  const es = buildContext(portfolioData, 'es');
  const en = buildContext(portfolioData, 'en');
  const newContent = buildFileContent(es, en);

  const outPath = join(
    dirname(new URL(import.meta.url).pathname),
    '..',
    'workers',
    'chat',
    'src',
    'portfolio-context.generated.ts',
  );

  if (existsSync(outPath)) {
    const current = readFileSync(outPath, 'utf8');
    if (current === newContent) {
      console.log('portfolio-context.generated.ts ya está actualizado, no se hicieron cambios.');
      return;
    }
  }

  writeFileSync(outPath, newContent, 'utf8');
  console.log(`Escrito ${outPath} (${es.length + en.length} caracteres total).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
