import React, { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Layers,
  FileText,
  Code2,
  Link as LinkIcon,
  ExternalLink,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  History,
  type LucideIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';
import type { Project, ProjectStatus } from '@/data/projects';
import { ConceptGraph } from './concept-graph';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SectionKey = 'diagrams' | 'documentation' | 'readme' | 'links' | 'blogVideo' | 'updates';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  canHover: boolean;
}

// --- Tarjeta de una sección (Diagramas / Documentación / README / Enlaces) ---

interface SectionCardProps {
  icon: LucideIcon;
  title: TranslationKey;
  description: TranslationKey;
  gradient: string;
  hasContent: boolean;
  onClick: () => void;
  canHover: boolean;
  delayMs: number;
}

const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  title,
  description,
  gradient,
  hasContent,
  onClick,
  canHover,
  delayMs,
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => {
        if (!hasContent) return;
        playSound('pop');
        onClick();
      }}
      onMouseEnter={canHover && hasContent ? () => playSound('whoosh') : undefined}
      disabled={!hasContent}
      className={cn(
        'group relative flex flex-col items-start text-left w-full p-6 rounded-2xl bg-card border border-border',
        'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'animate-in fade-in slide-in-from-bottom-4',
        hasContent
          ? 'cursor-pointer hover:shadow-2xl hover:shadow-accent/20 hover:border-accent/40 hover:-translate-y-1'
          : 'cursor-default opacity-60',
      )}
      style={{ animationDuration: '700ms', animationDelay: `${delayMs}ms`, animationFillMode: 'both' }}
    >
      {/* Glow del gradient en hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none"
        style={{ background: gradient }}
      />
      {/* Icono en círculo con gradient */}
      <div
        className="relative flex items-center justify-center w-14 h-14 rounded-xl shadow-lg mb-5"
        style={{ background: gradient }}
      >
        <Icon className="w-7 h-7 text-white" strokeWidth={2.2} />
      </div>
      <h3 className="relative text-lg sm:text-xl font-black uppercase tracking-tight text-foreground mb-1">
        {t(title)}
      </h3>
      <p className="relative text-sm text-muted-foreground">{t(description)}</p>
      {!hasContent && (
        <span className="relative mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          {t('project.comingSoon')}
        </span>
      )}
    </button>
  );
};

// --- Modal genérico que se reutiliza para las 4 secciones ---

interface SectionModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const SectionModal: React.FC<SectionModalProps> = ({ title, isOpen, onClose, children }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t('lightbox.close')}
        className="absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-muted/30 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground hover:bg-muted transition-all duration-300"
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <div
        className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-card border border-border shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-6 sm:px-8 py-5 border-b border-border">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
        </header>
        <div className="px-6 sm:px-8 py-6">{children}</div>
      </div>
    </div>
  );
};

// --- Galería de diagramas (carrusel simple) ---

const DiagramsGallery: React.FC<{ images: string[]; alt: string }> = ({ images, alt }) => {
  const [idx, setIdx] = useState(0);
  const { t } = useTranslation();
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/10]">
        <img src={images[idx]} alt={`${alt} ${idx + 1}`} className="w-full h-full object-contain" />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label={t('lightbox.previous')}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border shadow-lg hover:scale-110 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={3} />
            </button>
            <button
              onClick={next}
              aria-label={t('lightbox.next')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border shadow-lg hover:scale-110 transition-transform"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {idx + 1} / {images.length}
        </p>
      )}
    </div>
  );
};

// --- Vista principal del detalle del proyecto ---

const SECTION_GRADIENTS: Record<SectionKey, string> = {
  diagrams: 'linear-gradient(135deg, #00C6FF, #0072FF)',
  documentation: 'linear-gradient(135deg, #06D6A0, #118AB2)',
  readme: 'linear-gradient(to right, #871844, #682C44)',
  links: 'linear-gradient(135deg, #F97316, #FF8E3A)',
  blogVideo: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
  updates: 'linear-gradient(135deg, #F80759, #BC4E9C)',
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, canHover }) => {
  const { t, localize, language } = useTranslation();
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const has = {
    diagrams: (project.diagrams?.length ?? 0) > 0,
    documentation: !!project.documentationUrl,
    readme: !!project.readmeUrl || (project.tags?.length ?? 0) > 0,
    links: !!(project.links?.repo || project.links?.demo),
    blogVideo: !!(project.links?.blog || project.videoUrl),
    updates: (project.updates?.length ?? 0) > 0,
  };

  const titleText = localize(project.title);

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Botón Volver */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
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
      </div>

      {/* Hero del proyecto: info a la izquierda, grafo de conceptos a la derecha */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] gap-8 lg:gap-12 items-start">
          {/* Columna izquierda: título + descripción + tags + status */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter mb-4 text-accent animate-in fade-in slide-in-from-bottom-4 duration-700">
              {titleText}
            </h1>
            {project.description && (
              <p className="text-muted-foreground text-base sm:text-lg mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                {localize(project.description)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {project.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border text-xs font-bold uppercase tracking-wide text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            {project.status && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <StatusBadge status={project.status} />
              </div>
            )}
          </div>

          {/* Columna derecha: grafo de conceptos (sin fondo) */}
          {project.concepts && project.concepts.nodes.length > 0 && (
            <div className="w-full animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">
                {t('detail.conceptMap')}
              </h2>
              <ConceptGraph concepts={project.concepts} projectTitle={titleText} />
            </div>
          )}
        </div>
      </section>

      {/* Grid de 6 secciones (3x2 en lg, 2 columnas en sm, 1 en móvil) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SectionCard
            icon={Layers}
            title="detail.diagrams"
            description="detail.diagramsDescription"
            gradient={SECTION_GRADIENTS.diagrams}
            hasContent={has.diagrams}
            onClick={() => setOpenSection('diagrams')}
            canHover={canHover}
            delayMs={100}
          />
          <SectionCard
            icon={FileText}
            title="detail.documentation"
            description="detail.documentationDescription"
            gradient={SECTION_GRADIENTS.documentation}
            hasContent={has.documentation}
            onClick={() => setOpenSection('documentation')}
            canHover={canHover}
            delayMs={200}
          />
          <SectionCard
            icon={Code2}
            title="detail.readmeStack"
            description="detail.readmeStackDescription"
            gradient={SECTION_GRADIENTS.readme}
            hasContent={has.readme}
            onClick={() => setOpenSection('readme')}
            canHover={canHover}
            delayMs={300}
          />
          <SectionCard
            icon={LinkIcon}
            title="detail.links"
            description="detail.linksDescription"
            gradient={SECTION_GRADIENTS.links}
            hasContent={has.links}
            onClick={() => setOpenSection('links')}
            canHover={canHover}
            delayMs={400}
          />
          <SectionCard
            icon={Newspaper}
            title="detail.blogVideo"
            description="detail.blogVideoDescription"
            gradient={SECTION_GRADIENTS.blogVideo}
            hasContent={has.blogVideo}
            onClick={() => setOpenSection('blogVideo')}
            canHover={canHover}
            delayMs={500}
          />
          <SectionCard
            icon={History}
            title="detail.updates"
            description="detail.updatesDescription"
            gradient={SECTION_GRADIENTS.updates}
            hasContent={has.updates}
            onClick={() => setOpenSection('updates')}
            canHover={canHover}
            delayMs={600}
          />
        </div>
      </section>

      {/* Modales por sección */}
      <SectionModal
        title={t('detail.diagrams')}
        isOpen={openSection === 'diagrams'}
        onClose={() => setOpenSection(null)}
      >
        {has.diagrams ? (
          <DiagramsGallery images={project.diagrams!} alt={titleText} />
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>

      <SectionModal
        title={t('detail.documentation')}
        isOpen={openSection === 'documentation'}
        onClose={() => setOpenSection(null)}
      >
        {has.documentation ? (
          <ExternalLinkBlock url={project.documentationUrl!} label={t('detail.openDocs')} />
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>

      <SectionModal
        title={t('detail.readmeStack')}
        isOpen={openSection === 'readme'}
        onClose={() => setOpenSection(null)}
      >
        {has.readme ? (
          <div className="space-y-5">
            {(project.tags?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {t('detail.stackTitle')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags!.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted border border-border text-sm font-semibold text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {project.readmeUrl && (
              <ExternalLinkBlock url={project.readmeUrl} label={t('detail.openReadme')} />
            )}
          </div>
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>

      <SectionModal
        title={t('detail.links')}
        isOpen={openSection === 'links'}
        onClose={() => setOpenSection(null)}
      >
        {has.links ? (
          <div className="space-y-5">
            <div className="rounded-xl overflow-hidden bg-muted aspect-[16/10]">
              <img
                src={project.screenshot ?? project.image}
                alt={titleText}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {project.links?.repo && (
                <ExternalLinkBlock url={project.links.repo} label={t('detail.repo')} />
              )}
              {project.links?.demo && (
                <ExternalLinkBlock url={project.links.demo} label={t('detail.demo')} />
              )}
            </div>
          </div>
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>

      <SectionModal
        title={t('detail.blogVideo')}
        isOpen={openSection === 'blogVideo'}
        onClose={() => setOpenSection(null)}
      >
        {has.blogVideo ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {project.links?.blog && (
              <ExternalLinkBlock url={project.links.blog} label={t('detail.viewBlog')} />
            )}
            {project.videoUrl && (
              <ExternalLinkBlock url={project.videoUrl} label={t('detail.viewVideo')} />
            )}
          </div>
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>

      <SectionModal
        title={t('detail.updates')}
        isOpen={openSection === 'updates'}
        onClose={() => setOpenSection(null)}
      >
        {has.updates ? (
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {project.updates!
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((u, i) => (
                <li key={`${u.date}-${i}`} className="relative">
                  <span className="absolute -left-[1.7rem] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-card" />
                  <time className="text-xs font-bold uppercase tracking-widest text-accent block mb-1">
                    {new Date(u.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  <p className="text-sm text-foreground leading-relaxed">{localize(u.description)}</p>
                </li>
              ))}
          </ol>
        ) : (
          <ComingSoonPlaceholder />
        )}
      </SectionModal>
    </main>
  );
};

// --- Helpers ---

export const ComingSoonPlaceholder: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <Sparkles className="w-10 h-10 text-muted-foreground" />
      <p className="text-base font-bold uppercase tracking-wider text-muted-foreground">
        {t('project.comingSoon')}
      </p>
      {message && (
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{message}</p>
      )}
    </div>
  );
};

const STATUS_LABEL: Record<ProjectStatus, TranslationKey> = {
  'in-progress': 'detail.statusInProgress',
  'finished-open': 'detail.statusFinishedOpen',
  finished: 'detail.statusFinished',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  'in-progress': 'bg-amber-400 shadow-amber-400/50',
  'finished-open': 'bg-sky-400 shadow-sky-400/50',
  finished: 'bg-emerald-400 shadow-emerald-400/50',
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
      <span className={cn('w-2 h-2 rounded-full shadow-[0_0_8px]', STATUS_DOT[status])} />
      <span className="text-xs font-bold uppercase tracking-widest text-foreground">
        {t(STATUS_LABEL[status])}
      </span>
    </span>
  );
};

const ExternalLinkBlock: React.FC<{ url: string; label: string }> = ({ url, label }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 flex-1"
  >
    <span>{label}</span>
    <ExternalLink className="w-4 h-4" />
  </a>
);
