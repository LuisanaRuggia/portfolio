/**
 * Loader y parser de posts del blog self-hosted.
 *
 * Los posts viven en `src/content/blog/<slug>.md` (español, default) y
 * opcionalmente `<slug>.en.md` (inglés). Si la versión en otro idioma no
 * existe, el componente cae al ES como fallback con una nota.
 *
 * El frontmatter es YAML mínimo (key: value, listas inline). NO usamos
 * gray-matter para evitar el polyfill de Buffer en el bundle browser.
 */

import type { Language } from '@/lib/i18n';

// Vite import.meta.glob: carga todos los .md como string (raw) en build time.
// `eager: true` los incluye en el bundle inicial — los posts son chiquitos.
const POSTS_RAW = import.meta.glob('@/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  tags?: string[];
  cover?: string;
  /** Si está, el post se vincula a un proyecto del portafolio (ej. "dev1"). */
  projectId?: string;
}

export interface BlogPost {
  /** Slug derivado del nombre de archivo (sin .md ni sufijo de idioma). */
  slug: string;
  /** Idiomas disponibles. Si el post solo existe en ES, será `['es']`. */
  availableLanguages: Language[];
  /** Mapa idioma → contenido. */
  byLang: Record<Language, { frontmatter: PostFrontmatter; body: string } | undefined>;
}

/** Quita posibles comillas alrededor de un valor YAML simple. */
function unquote(s: string): string {
  const m = /^(['"])(.*)\1$/.exec(s);
  return m ? m[2] : s;
}

/**
 * Parser de YAML frontmatter mínimo. Acepta:
 *   - `key: "value"` / `key: 'value'` / `key: value`
 *   - `key: ["a", "b", "c"]` (listas inline)
 *
 * NO soporta listas en bloque (`- item`), mapas anidados, o multi-línea.
 * Para lo que necesitamos en un post (title, description, date, tags, cover,
 * projectId), alcanza.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, content: raw };
  const yamlBlock = m[1];
  const content = m[2];
  const data: Record<string, unknown> = {};
  for (const line of yamlBlock.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let val: unknown = kv[2].trim();
    if (typeof val === 'string') {
      if (val.startsWith('[') && val.endsWith(']')) {
        // Lista inline tipo ["a", "b"]
        val = val
          .slice(1, -1)
          .split(',')
          .map(s => unquote(s.trim()))
          .filter(s => s.length > 0);
      } else {
        val = unquote(val);
      }
    }
    data[key] = val;
  }
  return { data, content };
}

/** Extrae el slug y el idioma del path tipo `.../<slug>.md` o `.../<slug>.en.md`. */
function parseFilename(path: string): { slug: string; lang: Language } {
  const base = path.split('/').pop()!.replace(/\.md$/, '');
  // Detecta sufijo .en o .es. Si no hay, default a ES.
  const langMatch = /\.(es|en)$/.exec(base);
  if (langMatch) {
    return { slug: base.slice(0, -3), lang: langMatch[1] as Language };
  }
  return { slug: base, lang: 'es' };
}

/** Construye el catálogo de posts agrupando por slug. */
function buildCatalog(): Map<string, BlogPost> {
  const catalog = new Map<string, BlogPost>();
  for (const path in POSTS_RAW) {
    const raw = POSTS_RAW[path];
    const { slug, lang } = parseFilename(path);
    const { data, content } = parseFrontmatter(raw);
    const frontmatter = data as unknown as PostFrontmatter;

    const existing = catalog.get(slug);
    const entry = existing ?? {
      slug,
      availableLanguages: [],
      byLang: { es: undefined, en: undefined },
    };
    entry.byLang[lang] = { frontmatter, body: content };
    if (!entry.availableLanguages.includes(lang)) entry.availableLanguages.push(lang);
    catalog.set(slug, entry);
  }
  return catalog;
}

const CATALOG = buildCatalog();

/** Devuelve TODOS los posts ordenados por fecha desc, usando la versión del idioma pedido. */
export function listPosts(language: Language): Array<{
  slug: string;
  frontmatter: PostFrontmatter;
  availableLanguages: Language[];
}> {
  const out: Array<{ slug: string; frontmatter: PostFrontmatter; availableLanguages: Language[] }> =
    [];
  for (const post of CATALOG.values()) {
    const langContent = post.byLang[language] ?? post.byLang.es;
    if (!langContent) continue;
    out.push({
      slug: post.slug,
      frontmatter: langContent.frontmatter,
      availableLanguages: post.availableLanguages,
    });
  }
  out.sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
  return out;
}

/**
 * Devuelve el post con el slug pedido. Si el idioma solicitado no tiene
 * versión, devuelve ES como fallback (flag `fellBack: true` para que la UI
 * lo indique). Si el slug no existe, devuelve null.
 */
export function getPost(
  slug: string,
  language: Language,
): {
  frontmatter: PostFrontmatter;
  body: string;
  fellBack: boolean;
  availableLanguages: Language[];
} | null {
  const post = CATALOG.get(slug);
  if (!post) return null;
  const requested = post.byLang[language];
  if (requested) {
    return {
      frontmatter: requested.frontmatter,
      body: requested.body,
      fellBack: false,
      availableLanguages: post.availableLanguages,
    };
  }
  const fallback = post.byLang.es;
  if (!fallback) return null;
  return {
    frontmatter: fallback.frontmatter,
    body: fallback.body,
    fellBack: true,
    availableLanguages: post.availableLanguages,
  };
}
