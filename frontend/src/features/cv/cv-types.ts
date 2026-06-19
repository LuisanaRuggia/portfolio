/**
 * Tipos del JSON Resume bilingüe (versión frontend, sin dependencias de Node).
 * Espejo de backend/scripts/lib/resume.ts.
 *
 * El JSON vive en backend/data/resume.json y se copia a
 * frontend/src/data/resume.json cada vez que corre `pnpm script:cv`
 * (ver generate-cv.ts, función `main`).
 */

import type { LocalizedString } from '@/lib/i18n';

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
  name: string;
  position: LocalizedString;
  location?: { city?: string; country?: string };
  startDate: string;
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
