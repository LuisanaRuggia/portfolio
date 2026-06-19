/**
 * Tipos del JSON Resume bilingüe que usamos como single source of truth del CV.
 *
 * Convención: los campos textuales que se traducen son `LocalizedString`
 * (string | { es, en }); datos no traducibles (nombre, email, fechas, URLs,
 * keywords técnicas) son string crudo.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT_PATH } from './github.js';
import { resolveLocalized, type LocalizedString } from './types.js';

export interface ResumeProfile {
  network: string;
  username?: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  label: LocalizedString;
  email: string;
  phone?: string;
  location: { city: string; country?: string; countryCode?: string };
  summary: LocalizedString;
  profiles?: ResumeProfile[];
}

export interface ResumeWork {
  /** Nombre de la empresa, no traducible. */
  name: string;
  position: LocalizedString;
  location?: { city?: string; country?: string };
  /** YYYY-MM o YYYY. */
  startDate: string;
  /** YYYY-MM o YYYY. `null` significa actualidad. */
  endDate: string | null;
  summary?: LocalizedString;
  highlights?: LocalizedString[];
}

export interface ResumeEducation {
  institution: string;
  location?: { city?: string; country?: string };
  area: LocalizedString;
  studyType: LocalizedString;
  startDate: string;
  endDate?: string;
  note?: LocalizedString;
}

export interface ResumeSkill {
  name: LocalizedString;
  keywords: string[];
}

export interface ResumeLanguage {
  language: LocalizedString;
  fluency: LocalizedString;
}

export interface ResumeProject {
  name: string;
  description: LocalizedString;
  url?: string;
  keywords?: string[];
  /** Si está marcado, aparece en el PDF (los demás son contexto pero no visibles). */
  highlight?: boolean;
}

export interface Resume {
  basics: ResumeBasics;
  work: ResumeWork[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
  languages: ResumeLanguage[];
  projects: ResumeProject[];
}

const RESUME_PATH = join(REPO_ROOT_PATH, 'backend', 'data', 'resume.json');

export function loadResume(): Resume {
  const raw = readFileSync(RESUME_PATH, 'utf8');
  return JSON.parse(raw) as Resume;
}

export function resumePath(): string {
  return RESUME_PATH;
}

/**
 * Resuelve todos los campos LocalizedString de un Resume al idioma pedido,
 * devolviendo un objeto plano (sin objetos { es, en }) listo para inyectar en
 * la plantilla LaTeX.
 */
export interface FlatResume {
  basics: {
    name: string;
    label: string;
    email: string;
    phone?: string;
    location: { city: string; country?: string; countryCode?: string };
    summary: string;
    profiles: ResumeProfile[];
  };
  work: Array<{
    name: string;
    position: string;
    location?: { city?: string; country?: string };
    startDate: string;
    endDate: string | null;
    summary?: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    location?: { city?: string; country?: string };
    area: string;
    studyType: string;
    startDate: string;
    endDate?: string;
    note?: string;
  }>;
  skills: Array<{ name: string; keywords: string[] }>;
  languages: Array<{ language: string; fluency: string }>;
  projects: Array<{
    name: string;
    description: string;
    url?: string;
    keywords?: string[];
    highlight?: boolean;
  }>;
}

export function flattenResume(resume: Resume, lang: 'es' | 'en'): FlatResume {
  return {
    basics: {
      name: resume.basics.name,
      label: resolveLocalized(resume.basics.label, lang),
      email: resume.basics.email,
      phone: resume.basics.phone,
      location: resume.basics.location,
      summary: resolveLocalized(resume.basics.summary, lang),
      profiles: resume.basics.profiles ?? [],
    },
    work: resume.work.map(w => ({
      name: w.name,
      position: resolveLocalized(w.position, lang),
      location: w.location,
      startDate: w.startDate,
      endDate: w.endDate,
      summary: w.summary ? resolveLocalized(w.summary, lang) : undefined,
      highlights: (w.highlights ?? []).map(h => resolveLocalized(h, lang)),
    })),
    education: resume.education.map(e => ({
      institution: e.institution,
      location: e.location,
      area: resolveLocalized(e.area, lang),
      studyType: resolveLocalized(e.studyType, lang),
      startDate: e.startDate,
      endDate: e.endDate,
      note: e.note ? resolveLocalized(e.note, lang) : undefined,
    })),
    skills: resume.skills.map(s => ({
      name: resolveLocalized(s.name, lang),
      keywords: s.keywords,
    })),
    languages: resume.languages.map(l => ({
      language: resolveLocalized(l.language, lang),
      fluency: resolveLocalized(l.fluency, lang),
    })),
    projects: resume.projects.map(p => ({
      name: p.name,
      description: resolveLocalized(p.description, lang),
      url: p.url,
      keywords: p.keywords,
      highlight: p.highlight,
    })),
  };
}
