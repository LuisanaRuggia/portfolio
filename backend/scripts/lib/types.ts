/**
 * Tipos mínimos re-declarados localmente para evitar arrastrar el typecheck
 * del backend al frontend (con sus imports de @/lib/i18n y @/lib/theme).
 *
 * Si el shape de `Project` cambia en frontend/src/data/projects.ts, mantener
 * esto en sync — los agentes que escriben generated/*.json deben respetar el
 * shape que el frontend espera al consumirlo.
 */

export type LocalizedString = string | { es: string; en: string };
export type ProjectStatus = 'in-progress' | 'finished-open' | 'finished';
export type ConceptGroup = 'arch' | 'data' | 'ops' | 'ml';

export interface ProjectConcept {
  id: string;
  label: LocalizedString;
  group: ConceptGroup;
}

export interface ProjectConceptEdge {
  from: string;
  to: string;
}

export interface ProjectConcepts {
  nodes: ProjectConcept[];
  edges: ProjectConceptEdge[];
}

export interface Update {
  date: string;
  description: LocalizedString;
}

export interface Project {
  id: string;
  title: LocalizedString;
  description?: LocalizedString;
  tags?: string[];
  status?: ProjectStatus;
  updates?: Update[];
  concepts?: ProjectConcepts;
}

export interface Category {
  /** Translation key, p.ej. "category.ingenieriaDeDatos". */
  title: string;
  projects: Project[];
}

/** Resuelve un LocalizedString al idioma pedido. */
export function resolveLocalized(s: LocalizedString | undefined, lang: 'es' | 'en'): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s[lang];
}
