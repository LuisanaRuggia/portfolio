/**
 * Genera el system prompt del chat worker a partir de portfolioData del frontend.
 *
 * Lee:  frontend/src/data/projects.ts (vía loadProjectsFromFrontend)
 * Escribe: backend/workers/chat/src/portfolio-context.generated.ts
 *
 * Idempotente. Se llama en cada deploy del worker.
 */

import { dirname, join } from 'node:path';

import { idempotentWrite, loadProjectsFromFrontend } from './lib/github.js';
import type { Category, ProjectStatus } from './lib/types.js';
import { resolveLocalized } from './lib/types.js';

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  'category.cienciaDeDatos': { es: 'Ciencia de datos', en: 'Data science' },
  'category.ingenieriaDeDatos': { es: 'Ingeniería de datos', en: 'Data engineering' },
  'category.analisisDeDatos': { es: 'Análisis de datos', en: 'Data analysis' },
  'category.inteligenciaArtificial': { es: 'Inteligencia artificial', en: 'Artificial intelligence' },
  'category.iaAutomatizacion': { es: 'IA y automatización', en: 'AI & automation' },
  'category.computacionCuantica': { es: 'Computación cuántica', en: 'Quantum computing' },
  'category.algoritmia': { es: 'Algoritmia', en: 'Algorithmics' },
  'category.algoritmosYRetos': { es: 'Algoritmos y retos', en: 'Algorithms & challenges' },
  'category.desarrollo': { es: 'Desarrollo de software', en: 'Software development' },
};

const STATUS_LABELS: Record<ProjectStatus, { es: string; en: string }> = {
  'in-progress': { es: 'en progreso', en: 'in progress' },
  published: { es: 'publicado, activo', en: 'published, active' },
  'finished-open': { es: 'terminado, open-source', en: 'finished, open-source' },
  finished: { es: 'terminado', en: 'finished' },
};

const ABOUT_ME = {
  es: `Soy Luisana Ruggia, estudiante de Ingeniería en Ciencia de Datos en el Politécnico Grancolombiano. Vivo en Bogotá, Colombia. Actualmente trabajo en Paynet como Analista Junior de Datos. Construí este portafolio para mostrar los proyectos en los que he trabajado. Los que están publicados aquí son proyectos personales que hago por interés propio fuera de la carrera. Tengo además proyectos académicos de análisis de datos y dashboards que aún no he subido al portafolio. Por ahora no estoy buscando empleo activamente; el portafolio es para enseñar lo que sé hacer.

### Stack técnico con el que tengo experiencia
- **Lenguajes**: Python, SQL
- **Ingeniería de datos**: Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow, MinIO, ClickHouse, Iceberg
- **ML / MLOps**: Feast (feature store), pipelines de training, serving de modelos
- **BI / Visualización**: Power BI, Apache Superset (creo charts y dashboards para mis proyectos)
- **Automatizaciones e IA**: agentes de IA, pipelines automatizados, integración con LLMs
- **Cloud / contenedores**: Docker, Cloudflare Workers

### Experiencia
- Trabajo actualmente en Paynet como Analista Junior de Datos.
- He trabajado como analista de datos.
- Tengo fundamentos sólidos en estadística y matemáticas.
- Áreas en las que tengo proyectos y experiencia práctica: ingeniería de datos, ciencia de datos, análisis de datos, inteligencia artificial.

### Cómo trabajo
- Aprendo rápido herramientas nuevas cuando un proyecto lo requiere.
- Pienso en arquitectura y trade-offs antes de codear.
- Trabajo end-to-end: del dato crudo al producto final.
- Documento y comunico bien lo que construyo (este portafolio es prueba).`,
  en: `I'm Luisana Ruggia, a Data Science Engineering student at Politécnico Grancolombiano. I live in Bogotá, Colombia. I currently work at Paynet as a Junior Data Analyst. I built this portfolio to showcase the projects I've worked on. The ones published here are personal projects I do out of interest, outside the degree. I also have academic projects on data analysis and dashboards that I haven't uploaded to the portfolio yet. I'm not actively looking for a job right now; the portfolio is to share what I can do.

### Tech stack I have hands-on experience with
- **Languages**: Python, SQL
- **Data engineering**: Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow, MinIO, ClickHouse, Iceberg
- **ML / MLOps**: Feast (feature store), training pipelines, model serving
- **BI / Visualization**: Power BI, Apache Superset (I build charts and dashboards for my projects)
- **Automation and AI**: AI agents, automated pipelines, LLM integration
- **Cloud / containers**: Docker, Cloudflare Workers

### Experience
- I currently work at Paynet as a Junior Data Analyst.
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
      const title = resolveLocalized(p.title, lang);
      const status = p.status ? ` (${STATUS_LABELS[p.status][lang]})` : '';
      sections.push(`\n- **${title}** [id: ${p.id}]${status}`);

      const desc = resolveLocalized(p.description, lang);
      if (desc) sections.push(`  ${desc}`);

      if (p.tags && p.tags.length > 0) {
        sections.push(`  Stack: ${p.tags.join(', ')}`);
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

async function main(): Promise<void> {
  const portfolioData = await loadProjectsFromFrontend();

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

  const wrote = idempotentWrite(outPath, newContent);
  if (wrote) {
    console.log(`Escrito ${outPath} (${es.length + en.length} caracteres total).`);
  } else {
    console.log('portfolio-context.generated.ts ya está actualizado, no se hicieron cambios.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
