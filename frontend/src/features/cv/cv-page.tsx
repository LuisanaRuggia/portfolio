import React from 'react';
import { ArrowLeft, FileDown, Mail, MapPin, Github, Linkedin, Globe, type LucideIcon } from 'lucide-react';

import { playSound } from '@/lib/sounds';
import { useTranslation } from '@/lib/i18n';
import resumeData from '@/data/resume.json';
import type {
  Resume,
  ResumeWork,
  ResumeEducation,
  ResumeSkill,
  ResumeLanguage,
  ResumeProfile,
} from './cv-types';

const resume = resumeData as Resume;

interface CvPageProps {
  onBack: () => void;
}

const PROFILE_ICONS: Record<string, LucideIcon> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Portfolio: Globe,
};

function formatDate(date: string | null | undefined, lang: 'es' | 'en', ifNull: string): string {
  if (!date) return ifNull;
  const months = {
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  }[lang];
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(date);
  if (!m) return date;
  if (!m[2]) return m[1];
  return `${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function dateRange(start: string, end: string | null | undefined, lang: 'es' | 'en'): string {
  const presentLabel = lang === 'es' ? 'Presente' : 'Present';
  const s = formatDate(start, lang, '');
  const e = formatDate(end, lang, presentLabel);
  return `${s} — ${e}`;
}

function locationString(loc?: { city?: string; country?: string }): string {
  if (!loc) return '';
  return [loc.city, loc.country].filter(Boolean).join(', ');
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-10 first:mt-6">
    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-accent border-b border-border pb-2 mb-5">
      {title}
    </h2>
    {children}
  </section>
);

const EntryHeader: React.FC<{
  title: string;
  subtitle: string;
  right: string;
  rightSub?: string;
}> = ({ title, subtitle, right, rightSub }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-2">
    <div className="min-w-0">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground italic">{subtitle}</p>
    </div>
    <div className="flex flex-col sm:items-end text-sm flex-shrink-0">
      <span className="font-medium text-foreground">{right}</span>
      {rightSub && <span className="text-muted-foreground italic">{rightSub}</span>}
    </div>
  </div>
);

const WorkEntry: React.FC<{ work: ResumeWork; lang: 'es' | 'en' }> = ({ work, lang }) => {
  const position = typeof work.position === 'string' ? work.position : work.position[lang];
  const summary = work.summary
    ? typeof work.summary === 'string'
      ? work.summary
      : work.summary[lang]
    : null;
  return (
    <article className="mb-8 last:mb-0">
      <EntryHeader
        title={position}
        subtitle={work.name}
        right={dateRange(work.startDate, work.endDate, lang)}
        rightSub={locationString(work.location)}
      />
      {summary && <p className="text-sm text-foreground/90 mb-2">{summary}</p>}
      {work.highlights && work.highlights.length > 0 && (
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-foreground/90">
          {work.highlights.map((h, i) => (
            <li key={i}>{typeof h === 'string' ? h : h[lang]}</li>
          ))}
        </ul>
      )}
    </article>
  );
};

const EducationEntry: React.FC<{ edu: ResumeEducation; lang: 'es' | 'en' }> = ({ edu, lang }) => {
  const area = typeof edu.area === 'string' ? edu.area : edu.area[lang];
  const studyType = typeof edu.studyType === 'string' ? edu.studyType : edu.studyType[lang];
  const note = edu.note ? (typeof edu.note === 'string' ? edu.note : edu.note[lang]) : null;
  return (
    <article className="mb-6 last:mb-0">
      <EntryHeader
        title={`${area} · ${studyType}`}
        subtitle={edu.institution}
        right={dateRange(edu.startDate, edu.endDate ?? null, lang)}
        rightSub={locationString(edu.location)}
      />
      {note && <p className="text-sm text-muted-foreground italic">{note}</p>}
    </article>
  );
};

const SkillsTable: React.FC<{ skills: ResumeSkill[]; lang: 'es' | 'en' }> = ({ skills, lang }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
    {skills.map((s, i) => {
      const name = typeof s.name === 'string' ? s.name : s.name[lang];
      return (
        <React.Fragment key={i}>
          <dt className="font-bold text-foreground whitespace-nowrap">{name}</dt>
          <dd className="text-foreground/85">{s.keywords.join(', ')}</dd>
        </React.Fragment>
      );
    })}
  </dl>
);

const LanguagesList: React.FC<{ languages: ResumeLanguage[]; lang: 'es' | 'en' }> = ({
  languages,
  lang,
}) => (
  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
    {languages.map((l, i) => {
      const name = typeof l.language === 'string' ? l.language : l.language[lang];
      const fluency = typeof l.fluency === 'string' ? l.fluency : l.fluency[lang];
      return (
        <li key={i} className="text-foreground/90">
          <span className="font-bold text-foreground">{name}</span>
          <span className="text-muted-foreground"> · {fluency}</span>
        </li>
      );
    })}
  </ul>
);

const ProfileChip: React.FC<{ profile: ResumeProfile }> = ({ profile }) => {
  const Icon = PROFILE_ICONS[profile.network] ?? Globe;
  const display = profile.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted border border-border text-xs font-medium text-foreground transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{display}</span>
    </a>
  );
};

export const CvPage: React.FC<CvPageProps> = ({ onBack }) => {
  const { t, language } = useTranslation();

  const label =
    typeof resume.basics.label === 'string' ? resume.basics.label : resume.basics.label[language];
  const summary =
    typeof resume.basics.summary === 'string'
      ? resume.basics.summary
      : resume.basics.summary[language];

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Barra superior: Volver + Descargar PDF */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playSound('pop');
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('detail.back')}
        </button>

        <a
          href={`${import.meta.env.BASE_URL}cv/CV_Luisana_Ruggia_${language}.pdf`}
          download={`CV_Luisana_Ruggia_${language}.pdf`}
          onClick={() => playSound('pop')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 border border-accent text-sm font-bold text-accent-foreground transition-colors shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          {t('cv.downloadPdf')}
        </a>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <header className="border-b border-border pb-8 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            {resume.basics.name}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground">{label}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a
              href={`mailto:${resume.basics.email}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{resume.basics.email}</span>
            </a>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{locationString(resume.basics.location)}</span>
            </span>
          </div>

          {resume.basics.profiles && resume.basics.profiles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {resume.basics.profiles.map((p, i) => (
                <ProfileChip key={i} profile={p} />
              ))}
            </div>
          )}

          <p className="mt-6 text-sm sm:text-base text-foreground/90 leading-relaxed">{summary}</p>
        </header>

        {resume.work.length > 0 && (
          <Section title={t('cv.experience')}>
            {resume.work.map((w, i) => (
              <WorkEntry key={i} work={w} lang={language} />
            ))}
          </Section>
        )}

        {resume.education.length > 0 && (
          <Section title={t('cv.education')}>
            {resume.education.map((e, i) => (
              <EducationEntry key={i} edu={e} lang={language} />
            ))}
          </Section>
        )}

        {resume.skills.length > 0 && (
          <Section title={t('cv.skills')}>
            <SkillsTable skills={resume.skills} lang={language} />
          </Section>
        )}

        {resume.languages.length > 0 && (
          <Section title={t('cv.languages')}>
            <LanguagesList languages={resume.languages} lang={language} />
          </Section>
        )}

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground text-center">
          {t('cv.footerNote')}
        </footer>
      </article>
    </main>
  );
};
