/**
 * Genera el CV bilingüe (cv.es.pdf + cv.en.pdf) a partir de:
 *   - backend/data/resume.json: datos del perfil (basics, work, education,
 *     skills, languages). El campo `projects[]` queda como placeholder de
 *     futuros proyectos NO-portfolio (trabajos privados, etc.).
 *   - frontend/src/data/projects.ts: proyectos del portafolio. Solo los que
 *     tienen status ∈ {published, finished-open, finished} entran al CV.
 *     Los `in-progress` no aparecen — el CV no muestra trabajos a medio hacer.
 *
 * Requiere `xelatex` y `pdftoppm` instalados:
 *   sudo apt install texlive-xetex texlive-fonts-recommended \
 *                    texlive-latex-extra fonts-dejavu poppler-utils
 *
 * Local: `pnpm script:cv`
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadProjectsFromFrontend, REPO_ROOT_PATH, repoRelative } from './lib/github.js';
import { resolveLocalized, type Category, type ProjectStatus } from './lib/types.js';
import { compileAndPlace, escapeLatex, renderTemplate } from './lib/latex.js';
import { flattenResume, loadResume, type FlatResume } from './lib/resume.js';

type Lang = 'es' | 'en';

/**
 * Status que SÍ aparecen en el CV. Los `in-progress` quedan fuera porque el
 * CV no muestra trabajos en desarrollo. Si cambian de status (por edición
 * manual de projects.ts o por release tag → detect-status), la próxima
 * regeneración del CV los toma automáticamente.
 */
const CV_VISIBLE_STATUSES: ReadonlySet<ProjectStatus> = new Set<ProjectStatus>([
  'published',
  'finished-open',
  'finished',
]);

/** Convierte los proyectos del portafolio al shape de proyectos del CV. */
function projectsFromPortfolio(portfolioData: Category[], lang: Lang): FlatResume['projects'] {
  const out: FlatResume['projects'] = [];
  for (const cat of portfolioData) {
    for (const p of cat.projects) {
      if (!p.status || !CV_VISIBLE_STATUSES.has(p.status)) continue;
      const url =
        p.tags && p.tags.length > 0
          ? `https://luisanaruggia.github.io/portfolio/#/project/${p.id}`
          : undefined;
      // Si el proyecto tiene `cvDescription`, la usamos: es la versión agnóstica
      // al portafolio (sin frases tipo "este mismo sitio"). Sino, fallback a la
      // `description` general.
      const desc = p.cvDescription ?? p.description;
      out.push({
        name: resolveLocalized(p.title, lang),
        description: resolveLocalized(desc, lang),
        url,
        keywords: p.tags,
        highlight: true,
      });
    }
  }
  return out;
}

const LABELS = {
  es: {
    present: 'Presente',
    stack: 'Stack',
  },
  en: {
    present: 'Present',
    stack: 'Stack',
  },
};

/** Formatea YYYY-MM o YYYY a "Mes Año" o "Año". */
function formatDate(date: string | null | undefined, lang: Lang, ifNull: string): string {
  if (!date) return ifNull;
  const monthsEs = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const months = lang === 'es' ? monthsEs : monthsEn;

  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(date);
  if (!m) return date;
  const year = m[1];
  if (!m[2]) return year;
  const month = months[parseInt(m[2], 10) - 1] ?? '';
  return `${month} ${year}`;
}

function dateRange(start: string, end: string | null | undefined, lang: Lang): string {
  const s = formatDate(start, lang, '');
  const e = formatDate(end, lang, LABELS[lang].present);
  return `${s} -- ${e}`;
}

function locationString(loc?: { city?: string; country?: string }): string {
  if (!loc) return '';
  const parts = [loc.city, loc.country].filter(Boolean);
  return parts.join(', ');
}

function contactLine(flat: FlatResume, lang: Lang): string {
  const bits: string[] = [];
  bits.push(`${escapeLatex(locationString(flat.basics.location))}`);
  bits.push(`\\href{mailto:${flat.basics.email}}{${escapeLatex(flat.basics.email)}}`);
  if (flat.basics.phone) bits.push(escapeLatex(flat.basics.phone));
  for (const p of flat.basics.profiles) {
    const label = p.network === 'Portfolio' ? (lang === 'es' ? 'Portafolio' : 'Portfolio') : p.network;
    // En el label visible mostramos solo el dominio + path para ahorrar espacio.
    const display = p.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    bits.push(`${label}: \\href{${escapeLatex(p.url)}}{${escapeLatex(display)}}`);
  }
  return bits.filter(Boolean).join(' \\; \\textbullet \\; ');
}

function workBlock(flat: FlatResume, lang: Lang): string {
  if (flat.work.length === 0) return '';
  return flat.work
    .map(w => {
      const position = escapeLatex(w.position);
      const company = escapeLatex(w.name);
      const dates = escapeLatex(dateRange(w.startDate, w.endDate, lang));
      const loc = escapeLatex(locationString(w.location));
      let block = `\\entry{${position}}{${company}}{${dates}}{${loc}}\n`;
      if (w.summary) {
        block += `${escapeLatex(w.summary)}\n\n`;
      }
      if (w.highlights.length > 0) {
        block += '\\begin{itemize}\n';
        for (const h of w.highlights) {
          block += `  \\item ${escapeLatex(h)}\n`;
        }
        block += '\\end{itemize}\n';
      }
      return block;
    })
    .join('\n\\vspace{2pt}\n');
}

function educationBlock(flat: FlatResume, lang: Lang): string {
  if (flat.education.length === 0) return '';
  return flat.education
    .map(e => {
      const area = escapeLatex(`${e.area} (${e.studyType})`);
      const institution = escapeLatex(e.institution);
      const dates = escapeLatex(dateRange(e.startDate, e.endDate ?? null, lang));
      const loc = escapeLatex(locationString(e.location));
      let block = `\\entry{${area}}{${institution}}{${dates}}{${loc}}\n`;
      if (e.note) {
        block += `\\textit{\\color{mutedtext}${escapeLatex(e.note)}}\n\n`;
      }
      return block;
    })
    .join('\n\\vspace{2pt}\n');
}

function skillsBlock(flat: FlatResume): string {
  if (flat.skills.length === 0) return '';
  // Tabular con categoría a la izquierda y keywords a la derecha.
  // arraystretch local 1.35 (vs el 1.05 global) para que cada fila respire más.
  let block = '{\\renewcommand{\\arraystretch}{1.35}\n';
  block += '\\begin{tabularx}{\\linewidth}{@{}l X@{}}\n';
  for (const s of flat.skills) {
    const name = escapeLatex(s.name);
    const kws = s.keywords.map(escapeLatex).join(', ');
    block += `  \\textbf{${name}} & ${kws} \\\\\n`;
  }
  block += '\\end{tabularx}}\n';
  return block;
}

function projectsBlock(flat: FlatResume, lang: Lang): string {
  // Solo proyectos con highlight=true entran al PDF (los demás son contexto).
  const highlighted = flat.projects.filter(p => p.highlight);
  if (highlighted.length === 0) return '';
  return highlighted
    .map(p => {
      const name = escapeLatex(p.name);
      const url = p.url ? `\\hfill {\\small\\color{mutedtext}\\href{${escapeLatex(p.url)}}{${escapeLatex(p.url.replace(/^https?:\/\//, ''))}}}` : '';
      let block = `\\textbf{${name}}${url}\\par\n`;
      block += `${escapeLatex(p.description)}\n`;
      if (p.keywords && p.keywords.length > 0) {
        block += `\\par\\textit{\\color{mutedtext}${LABELS[lang].stack}: ${p.keywords.map(escapeLatex).join(', ')}}\n`;
      }
      return block;
    })
    .join('\n\\vspace{2pt}\n');
}

function languagesBlock(flat: FlatResume): string {
  if (flat.languages.length === 0) return '';
  let block = '\\begin{tabularx}{\\linewidth}{@{}l X@{}}\n';
  for (const l of flat.languages) {
    block += `  \\textbf{${escapeLatex(l.language)}} & ${escapeLatex(l.fluency)} \\\\\n`;
  }
  block += '\\end{tabularx}\n';
  return block;
}

function buildPlaceholders(flat: FlatResume, lang: Lang): Record<string, string> {
  return {
    NAME: escapeLatex(flat.basics.name),
    LABEL: escapeLatex(flat.basics.label),
    CONTACT_LINE: contactLine(flat, lang),
    SUMMARY: escapeLatex(flat.basics.summary),
    EDUCATION_BLOCK: educationBlock(flat, lang),
    WORK_BLOCK: workBlock(flat, lang),
    SKILLS_BLOCK: skillsBlock(flat),
    PROJECTS_BLOCK: projectsBlock(flat, lang),
    LANGUAGES_BLOCK: languagesBlock(flat),
  };
}

async function main(): Promise<void> {
  const resume = loadResume();
  const portfolioData = await loadProjectsFromFrontend();

  const targets: Array<{ lang: Lang; templatePath: string }> = [
    { lang: 'es', templatePath: repoRelative('backend/templates/cv.es.tex') },
    { lang: 'en', templatePath: repoRelative('backend/templates/cv.en.tex') },
  ];

  for (const target of targets) {
    console.log(`[cv.${target.lang}] compilando...`);
    const flat = flattenResume(resume, target.lang);
    // Concatena proyectos del portafolio (filtrados por status) + proyectos
    // declarados en resume.json (típicamente vacíos — placeholder para futuros
    // proyectos no-portfolio como trabajos privados de cliente).
    flat.projects = [...projectsFromPortfolio(portfolioData, target.lang), ...flat.projects];
    const template = readFileSync(target.templatePath, 'utf8');
    const placeholders = buildPlaceholders(flat, target.lang);
    const rendered = renderTemplate(template, placeholders);

    const destPdf = join(REPO_ROOT_PATH, 'frontend', 'public', 'cv', `cv.${target.lang}.pdf`);
    const destPages = join(REPO_ROOT_PATH, 'frontend', 'public', 'cv', `pages-${target.lang}`);

    const { pageCount } = compileAndPlace(rendered, destPdf, destPages, { dpi: 200 });
    console.log(`[cv.${target.lang}] ✓ ${pageCount} página(s) → ${destPdf}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
