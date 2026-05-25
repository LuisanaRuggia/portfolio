import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { useThemedImage } from '@/lib/theme';
import { playSound } from '@/lib/sounds';
import { portfolioData, type Project, type ProjectStatus } from '@/data/projects';
import { ConceptGraph } from './concept-graph';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SectionKey = 'diagrams' | 'documentation' | 'readme' | 'links' | 'blogVideo' | 'updates';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onNavigate: (projectId: string) => void;
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

// --- Visor de diagramas: fullscreen + zoom + pan + navegación circular ---

interface DiagramsViewerProps {
  images: string[];
  alt: string;
  onClose: () => void;
  /** Si está, agrega un botón de descarga en el header (apunta al archivo original, ej. PDF) */
  downloadUrl?: string;
  /** Etiqueta para el botón de descarga. Defecto: "Descargar". */
  downloadLabel?: string;
  /** Links adicionales que se renderizan como botones en el header.
   * Útil para ofrecer "abrir en pestaña nueva" de elementos relacionados
   * (ej. los diagramas embebidos cuando se muestra documentación). */
  externalLinks?: Array<{ label: string; url: string }>;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.25;

const DiagramsViewer: React.FC<DiagramsViewerProps> = ({ images, alt, onClose, downloadUrl, downloadLabel, externalLinks }) => {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  // Multi-touch: rastrea todos los pointers activos para soporte de pinch-zoom
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ initialDist: number; initialScale: number } | null>(null);
  // Refs para medir el tamaño renderizado de la imagen y aplicar pan boundaries
  const imgRef = useRef<HTMLImageElement>(null);
  const imgDimsRef = useRef({ w: 0, h: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_SCALE, s * ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_SCALE, s / ZOOM_STEP)), []);

  const prev = useCallback(() => {
    playSound('pop');
    reset();
    setIdx((i) => (i - 1 + images.length) % images.length);
  }, [images.length, reset]);

  const next = useCallback(() => {
    playSound('pop');
    reset();
    setIdx((i) => (i + 1) % images.length);
  }, [images.length, reset]);

  // Bloquear scroll del body + atajos de teclado
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && images.length > 1) prev();
      else if (e.key === 'ArrowRight' && images.length > 1) next();
      else if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-' || e.key === '_') zoomOut();
      else if (e.key === '0') reset();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next, zoomIn, zoomOut, reset, images.length]);

  // Wheel para zoom (usar listener nativo no-passive para poder preventDefault sin warning)
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * delta)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Helpers para multi-touch
  const pinchDistance = () => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  };

  // Restringe el translate para que la imagen nunca se pueda arrastrar fuera de la pantalla.
  // Si la imagen escalada cabe en el viewport, no permite pan (centra). Si no cabe, permite
  // pan solo hasta donde los bordes de la imagen tocan los del viewport.
  const clampTranslate = (tx: number, ty: number, scaleVal: number) => {
    const viewport = viewportRef.current;
    if (!viewport || imgDimsRef.current.w === 0) return { x: tx, y: ty };
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scaledW = imgDimsRef.current.w * scaleVal;
    const scaledH = imgDimsRef.current.h * scaleVal;
    const maxTx = Math.max(0, (scaledW - vw) / 2);
    const maxTy = Math.max(0, (scaledH - vh) / 2);
    return {
      x: Math.max(-maxTx, Math.min(maxTx, tx)),
      y: Math.max(-maxTy, Math.min(maxTy, ty)),
    };
  };

  // Cuando termina de cargar la imagen, captura sus dimensiones renderizadas a scale=1
  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    imgDimsRef.current = {
      w: imgRef.current.offsetWidth,
      h: imgRef.current.offsetHeight,
    };
    // Re-aplica clamp al translate actual con las dimensiones recién medidas
    setTranslate((t) => clampTranslate(t.x, t.y, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Cuando cambia el scale (zoom in/out, pinch, reset), reclampea por si el translate
  // actual ya no cabe en los nuevos bounds.
  useEffect(() => {
    setTranslate((t) => clampTranslate(t.x, t.y, scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (pointersRef.current.size === 2) {
      // 2 dedos: inicia gesto de pinch
      pinchRef.current = { initialDist: pinchDistance(), initialScale: scale };
      setIsPanning(false);
    } else if (pointersRef.current.size === 1) {
      // 1 dedo / mouse: pan
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      // Pinch zoom: nuevo scale = scale inicial * (distancia actual / distancia inicial)
      const newDist = pinchDistance();
      if (newDist > 0 && pinchRef.current.initialDist > 0) {
        const factor = newDist / pinchRef.current.initialDist;
        setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.initialScale * factor)));
      }
    } else if (pointersRef.current.size === 1 && isPanning) {
      setTranslate(
        clampTranslate(
          e.clientX - panStartRef.current.x,
          e.clientY - panStartRef.current.y,
          scale,
        ),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (pointersRef.current.size === 0) {
      setIsPanning(false);
    } else if (pointersRef.current.size === 1) {
      // De pinch a pan: reinicia el origen con el dedo que queda
      const remaining = Array.from(pointersRef.current.values())[0];
      panStartRef.current = { x: remaining.x - translate.x, y: remaining.y - translate.y };
      setIsPanning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Top bar: título + acciones */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border bg-card/60 backdrop-blur">
        <h2 className="text-sm font-bold text-foreground truncate flex-1">
          {alt}
          {images.length > 1 && (
            <span className="ml-2 text-muted-foreground font-medium">
              {idx + 1} / {images.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={zoomOut}
            aria-label={t('diagrams.zoomOut')}
            title={`${t('diagrams.zoomOut')} (−)`}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            aria-label={t('diagrams.zoomIn')}
            title={`${t('diagrams.zoomIn')} (+)`}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={reset}
            aria-label={t('diagrams.reset')}
            title={`${t('diagrams.reset')} (0)`}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {externalLinks?.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-muted/50 hover:bg-muted text-xs font-bold uppercase tracking-wider text-foreground transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {link.label}
            </a>
          ))}
          {externalLinks?.map((link) => (
            // En mobile, solo icono (más compacto)
            <a
              key={`m-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ))}
          {/* Botón de descarga: si hay downloadUrl explícito (ej. el PDF original de
              la documentación) descarga eso; si no, descarga la imagen actual del visor
              (útil para que la sección Diagramas permita guardar cada diagrama). */}
          <a
            href={downloadUrl ?? images[idx]}
            download
            aria-label={downloadLabel ?? t('doc.download')}
            title={downloadLabel ?? t('doc.download')}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            aria-label={t('lightbox.close')}
            title={`${t('lightbox.close')} (Esc)`}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Viewport: imagen pan-zoom */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 180ms ease-out',
            willChange: 'transform',
          }}
        >
          <img
            ref={imgRef}
            src={images[idx]}
            alt={`${alt} ${idx + 1}`}
            onLoad={handleImageLoad}
            className="max-w-[92vw] max-h-[78vh] object-contain
                       dark:invert dark:hue-rotate-180 dark:contrast-125
                       dark:ring-1 dark:ring-white/20 dark:rounded-md dark:shadow-2xl"
            draggable={false}
          />
        </div>

        {/* Nav chevrons (solo si hay más de 1 diagrama) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label={t('lightbox.previous')}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-card/90 backdrop-blur border border-border shadow-xl hover:scale-110 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={3} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label={t('lightbox.next')}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-card/90 backdrop-blur border border-border shadow-xl hover:scale-110 transition-transform"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </>
        )}
      </div>

      {/* Bottom hint */}
      <footer className="px-4 py-2 text-center text-[11px] text-muted-foreground border-t border-border bg-card/60 backdrop-blur">
        {t('diagrams.hint')}
      </footer>
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

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onNavigate, canHover }) => {
  const { t, localize, language } = useTranslation();
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const has = {
    diagrams: (project.diagrams?.length ?? 0) > 0,
    documentation: (project.documentationPages?.length ?? 0) > 0 || !!project.documentationUrl,
    readme: !!project.readmeUrl || (project.tags?.length ?? 0) > 0,
    links: !!(project.links?.repo || project.links?.demo),
    blogVideo: !!(project.links?.blog || project.videoUrl),
    updates: (project.updates?.length ?? 0) > 0,
  };

  const titleText = localize(project.title);
  const themedProjectImage = useThemedImage(project.image);

  // Categorías a las que pertenece el proyecto: la carpeta primaria + las cross-disciplina
  const primaryCategoryKey = portfolioData.find((c) =>
    c.projects.some((p) => p.id === project.id),
  )?.title;
  const categoryKeys: TranslationKey[] = [
    primaryCategoryKey,
    ...(project.crossCategories ?? []),
  ].filter((k): k is TranslationKey => !!k);

  // Lista plana de todos los proyectos del portafolio para navegación prev/next
  // (NO circular — para no dar la sensación de que hay más proyectos de los que hay)
  const allProjects = portfolioData.flatMap((c) => c.projects);
  const currentIdx = allProjects.findIndex((p) => p.id === project.id);
  const prevProject = currentIdx > 0 ? allProjects[currentIdx - 1] : null;
  const nextProject = currentIdx >= 0 && currentIdx < allProjects.length - 1
    ? allProjects[currentIdx + 1]
    : null;

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Barra superior: Volver + navegación prev/next entre proyectos */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playSound('pop');
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('detail.back')}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {prevProject && (
            <button
              onClick={() => {
                playSound('pop');
                onNavigate(prevProject.id);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors min-w-0"
              title={localize(prevProject.title)}
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate max-w-[160px]">
                {localize(prevProject.title)}
              </span>
            </button>
          )}
          {nextProject && (
            <button
              onClick={() => {
                playSound('pop');
                onNavigate(nextProject.id);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border text-sm font-medium text-foreground transition-colors min-w-0"
              title={localize(nextProject.title)}
            >
              <span className="hidden sm:inline truncate max-w-[160px]">
                {localize(nextProject.title)}
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </div>
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
            {categoryKeys.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                {categoryKeys.map((catKey) => (
                  <span
                    key={catKey}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-accent/40 text-xs font-bold uppercase tracking-wide text-accent"
                  >
                    {t(catKey)}
                  </span>
                ))}
              </div>
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

      {/* Diagramas: si hay contenido → visor fullscreen con zoom/pan/nav;
          si no hay contenido → SectionModal regular con "Próximamente" */}
      {openSection === 'diagrams' && has.diagrams && (
        <DiagramsViewer
          images={project.diagrams!}
          alt={titleText}
          onClose={() => setOpenSection(null)}
        />
      )}
      <SectionModal
        title={t('detail.diagrams')}
        isOpen={openSection === 'diagrams' && !has.diagrams}
        onClose={() => setOpenSection(null)}
      >
        <ComingSoonPlaceholder />
      </SectionModal>

      {/* Documentación: si hay páginas PNG renderizadas del PDF → visor fullscreen
          (mismo viewer que los diagramas, con botón de descarga del PDF original).
          Si no hay nada → "Próximamente". */}
      {openSection === 'documentation' &&
        (project.documentationPages?.length ?? 0) > 0 && (
          <DiagramsViewer
            images={project.documentationPages!}
            alt={titleText}
            downloadUrl={project.documentationUrl}
            onClose={() => setOpenSection(null)}
          />
        )}
      <SectionModal
        title={t('detail.documentation')}
        isOpen={openSection === 'documentation' && !has.documentation}
        onClose={() => setOpenSection(null)}
      >
        <ComingSoonPlaceholder />
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
                src={project.screenshot ?? themedProjectImage}
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
