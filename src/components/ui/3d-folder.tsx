import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef } from 'react';
import { Sun, Moon, X, ExternalLink, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles, Music } from 'lucide-react';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Lottie from 'lottie-react';
import { playSound, setSoundVolume } from "@/lib/sounds";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import girlLaptopAnimation from "@/assets/lottie/girl-laptop.json";
import { portfolioData, type Project } from "@/data/projects";

// --- Utilities ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200";

// --- Internal Components ---

interface ProjectCardProps {
  image: string;
  title: string;
  delay: number;
  isVisible: boolean;
  index: number;
  totalCount: number;
  onClick: () => void;
  isSelected: boolean;
  canHover: boolean;
}

const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ image, title, delay, isVisible, index, totalCount, onClick, isSelected, canHover }, ref) => {
    const middleIndex = (totalCount - 1) / 2;
    const factor = totalCount > 1 ? (index - middleIndex) / middleIndex : 0;

    const rotation = factor * 25;
    const translationX = factor * 85;
    const translationY = Math.abs(factor) * 12;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute w-20 h-28 cursor-pointer group/card",
          isSelected && "opacity-0",
        )}
        style={{
          transform: isVisible
            ? `translateY(calc(-100px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
            : "translateY(0px) translateX(0px) rotate(0deg) scale(0.4)",
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          pointerEvents: isVisible && !isSelected ? "auto" : "none",
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          zIndex: 10 + index,
          left: "-40px",
          top: "-56px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <div className={cn(
          "w-full h-full rounded-lg overflow-hidden shadow-xl bg-card border border-white/5 relative",
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/card:-translate-y-6 group-hover/card:shadow-2xl group-hover/card:shadow-accent/40 group-hover/card:ring-2 group-hover/card:ring-accent group-hover/card:scale-125"
        )}>
          <img
            src={image || PLACEHOLDER_IMAGE}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <p
            className={cn(
              "absolute left-1.5 right-1.5 font-black uppercase tracking-tighter text-white drop-shadow-md leading-tight",
              canHover
                ? "bottom-1.5 text-[9px] truncate"
                : "bottom-1.5 text-[10px] line-clamp-3 whitespace-normal",
            )}
          >
            {title}
          </p>
        </div>
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3rem)] z-50",
            "opacity-0 group-hover/card:opacity-100",
            "transition-opacity duration-200",
            "pointer-events-none",
          )}
        >
          <div
            style={{ transform: `rotate(${-rotation}deg)` }}
            className={cn(
              "px-3 py-1.5 rounded-xl bg-card border border-accent/40 text-foreground",
              "text-[10px] font-bold uppercase tracking-wide whitespace-nowrap",
              "shadow-lg shadow-accent/20",
            )}
          >
            {title}
          </div>
        </div>
      </div>
    );
  }
);
ProjectCard.displayName = "ProjectCard";

interface ImageLightboxProps {
  projects: Project[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  sourceRect: DOMRect | null;
  onCloseComplete?: () => void;
  onNavigate: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  projects,
  currentIndex,
  isOpen,
  onClose,
  sourceRect,
  onCloseComplete,
  onNavigate,
}) => {
  const { t, localize } = useTranslation();
  const [animationPhase, setAnimationPhase] = useState<"initial" | "animating" | "complete">("initial");
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [internalIndex, setInternalIndex] = useState(currentIndex);
  const [isSliding, setIsSliding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalProjects = projects.length;
  const hasNext = internalIndex < totalProjects - 1;
  const hasPrev = internalIndex > 0;
  const currentProject = projects[internalIndex];

  useEffect(() => {
    if (isOpen && currentIndex !== internalIndex && !isSliding) {
      setIsSliding(true);
      const timer = setTimeout(() => {
        setInternalIndex(currentIndex);
        setIsSliding(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isOpen, internalIndex, isSliding]);

  useEffect(() => {
    if (isOpen) {
      setInternalIndex(currentIndex);
      setIsSliding(false);
    }
  }, [isOpen, currentIndex]);

  const navigateNext = useCallback(() => {
    if (internalIndex >= totalProjects - 1 || isSliding) return;
    onNavigate(internalIndex + 1);
    playSound('pop');
  }, [internalIndex, totalProjects, isSliding, onNavigate]);

  const navigatePrev = useCallback(() => {
    if (internalIndex <= 0 || isSliding) return;
    onNavigate(internalIndex - 1);
    playSound('pop');
  }, [internalIndex, isSliding, onNavigate]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    onClose();
    setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      setAnimationPhase("initial");
      onCloseComplete?.();
    }, 500);
  }, [onClose, onCloseComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") navigateNext();
      if (e.key === "ArrowLeft") navigatePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose, navigateNext, navigatePrev]);

  useLayoutEffect(() => {
    if (isOpen && sourceRect) {
      setShouldRender(true);
      setAnimationPhase("initial");
      setIsClosing(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationPhase("animating");
        });
      });
      const timer = setTimeout(() => {
        setAnimationPhase("complete");
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sourceRect]);

  const handleDotClick = (idx: number) => {
    if (isSliding || idx === internalIndex) return;
    onNavigate(idx);
    playSound('pop');
  };

  if (!shouldRender || !currentProject) return null;

  const getInitialStyles = (): React.CSSProperties => {
    if (!sourceRect) return {};
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetWidth = Math.min(800, viewportWidth - 64);
    const targetHeight = Math.min(viewportHeight * 0.85, 600);
    const targetX = (viewportWidth - targetWidth) / 2;
    const targetY = (viewportHeight - targetHeight) / 2;
    const scaleX = sourceRect.width / targetWidth;
    const scaleY = sourceRect.height / targetHeight;
    const scale = Math.max(scaleX, scaleY);
    const translateX = sourceRect.left + sourceRect.width / 2 - (targetX + targetWidth / 2) + window.scrollX;
    const translateY = sourceRect.top + sourceRect.height / 2 - (targetY + targetHeight / 2) + window.scrollY;
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      opacity: 0.5,
      borderRadius: "12px",
    };
  };

  const getFinalStyles = (): React.CSSProperties => ({
    transform: "translate(0, 0) scale(1)",
    opacity: 1,
    borderRadius: "24px",
  });

  const currentStyles = animationPhase === "initial" && !isClosing ? getInitialStyles() : getFinalStyles();

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8")}
      onClick={handleClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: "opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-2xl"
        style={{
          opacity: (animationPhase === "initial" && !isClosing) ? 0 : 1,
          transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        aria-label={t('lightbox.close')}
        className={cn(
          "absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-muted/30 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground hover:bg-muted transition-all duration-300",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing ? 1 : 0,
          transform: animationPhase === "complete" && !isClosing ? "translateY(0)" : "translateY(-30px)",
          transition: "opacity 400ms ease-out 400ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 400ms",
        }}
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigatePrev(); }}
        disabled={!hasPrev || isSliding}
        aria-label={t('lightbox.previous')}
        className={cn(
          "absolute left-2 md:left-10 z-50 top-1/3 md:top-1/2 -translate-y-1/2",
          "w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full",
          "bg-muted/30 backdrop-blur-xl border border-white/10 text-foreground",
          "hover:scale-110 active:scale-95 transition-all duration-300",
          "disabled:opacity-0 disabled:pointer-events-none shadow-2xl",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing && hasPrev ? 1 : 0,
          transition: "opacity 400ms ease-out 600ms",
        }}
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigateNext(); }}
        disabled={!hasNext || isSliding}
        aria-label={t('lightbox.next')}
        className={cn(
          "absolute right-2 md:right-10 z-50 top-1/3 md:top-1/2 -translate-y-1/2",
          "w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full",
          "bg-muted/30 backdrop-blur-xl border border-white/10 text-foreground",
          "hover:scale-110 active:scale-95 transition-all duration-300",
          "disabled:opacity-0 disabled:pointer-events-none shadow-2xl",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing && hasNext ? 1 : 0,
          transition: "opacity 400ms ease-out 600ms",
        }}
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
      </button>
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...currentStyles,
          transform: isClosing ? "translate(0, 0) scale(0.92)" : currentStyles.transform,
          transition: animationPhase === "initial" && !isClosing ? "none" : "transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms ease-out, border-radius 700ms ease",
          transformOrigin: "center center",
        }}
      >
        <div className={cn("relative overflow-hidden rounded-[inherit] bg-card border border-white/10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]")}>
          <div className="relative overflow-hidden aspect-[4/3] md:aspect-[16/10]">
            <div
              className="flex w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(-${internalIndex * 100}%)`,
                transition: isSliding ? "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
              }}
            >
              {projects.map((project) => (
                <div key={project.id} className="min-w-full h-full relative">
                  <img
                    src={project.image || PLACEHOLDER_IMAGE}
                    alt={localize(project.title)}
                    className="w-full h-full object-cover select-none"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
          <div
            className={cn("px-5 sm:px-8 py-5 sm:py-7 bg-card border-t border-white/5")}
            style={{
              opacity: animationPhase === "complete" && !isClosing ? 1 : 0,
              transform: animationPhase === "complete" && !isClosing ? "translateY(0)" : "translateY(40px)",
              transition: "opacity 500ms ease-out 500ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 500ms",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate">{localize(currentProject?.title)}</h3>
                <div className="flex items-center gap-3 sm:gap-4 mt-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full border border-white/5">
                    {projects.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDotClick(idx)}
                        aria-label={`${t('lightbox.goToProject')} ${idx + 1}`}
                        className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", idx === internalIndex ? "bg-foreground scale-150" : "bg-muted-foreground/30 hover:bg-muted-foreground/60")}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{internalIndex + 1} / {totalProjects}</p>
                </div>
              </div>
              <button className={cn("flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:brightness-110 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto")}>
                <span>{t('project.view')}</span>
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AnimatedFolderProps {
  title: string;
  projects: Project[];
  className?: string;
  gradient?: string;
}

const AnimatedFolder: React.FC<AnimatedFolderProps> = ({ title, projects, className, gradient }) => {
  const { t, localize } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const folderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover)');
    setCanHover(mql.matches);
    const listener = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (canHover || !isHovered) return;
    const handleOutside = (e: Event) => {
      if (folderRef.current && !folderRef.current.contains(e.target as Node)) {
        setIsHovered(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [canHover, isHovered]);

  const previewProjects = projects.slice(0, 5);
  const isEmpty = projects.length === 0;

  const handleProjectClick = (project: Project, index: number) => {
    const cardEl = cardRefs.current[index];
    if (cardEl) setSourceRect(cardEl.getBoundingClientRect());
    setSelectedIndex(index);
    setHiddenCardId(project.id);
    playSound('pop');
  };

  const handleCloseLightbox = () => { setSelectedIndex(null); setSourceRect(null); };
  const handleCloseComplete = () => { setHiddenCardId(null); };
  const handleNavigate = (newIndex: number) => { setSelectedIndex(newIndex); setHiddenCardId(projects[newIndex]?.id || null); };

  const backBg = gradient || "linear-gradient(135deg, var(--folder-back) 0%, var(--folder-tab) 100%)";
  const tabBg = gradient || "var(--folder-tab)";
  const frontBg = gradient || "linear-gradient(135deg, var(--folder-front) 0%, var(--folder-back) 100%)";

  return (
    <>
      <div
        ref={folderRef}
        className={cn("relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl cursor-pointer bg-card border border-border transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-2xl hover:shadow-accent/20 hover:border-accent/40 group", className)}
        style={{ minHeight: "320px", perspective: "1200px", transform: isHovered ? "scale(1.04) rotate(-1.5deg)" : "scale(1) rotate(0deg)" }}
        onMouseEnter={canHover ? () => { setIsHovered(true); playSound('whoosh'); } : undefined}
        onMouseLeave={canHover ? () => setIsHovered(false) : undefined}
        onClick={!canHover ? () => {
          setIsHovered((prev) => {
            if (!prev) playSound('whoosh');
            return !prev;
          });
        } : undefined}
      >
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-700"
          style={{ background: gradient ? `radial-gradient(circle at 50% 70%, ${gradient.match(/#[a-fA-F0-9]{3,6}/)?.[0] || 'var(--accent)'} 0%, transparent 70%)` : "radial-gradient(circle at 50% 70%, var(--accent) 0%, transparent 70%)", opacity: isHovered ? 0.12 : 0 }}
        />
        <div className="relative flex items-center justify-center mb-4" style={{ height: "160px", width: "200px" }}>
          <div className="absolute w-32 h-24 rounded-lg shadow-md border border-white/10" style={{ background: backBg, filter: gradient ? "brightness(0.9)" : "none", transformOrigin: "bottom center", transform: isHovered ? "rotateX(-20deg) scaleY(1.05)" : "rotateX(0deg) scaleY(1)", transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 10 }} />
          <div className="absolute w-12 h-4 rounded-t-md border-t border-x border-white/10" style={{ background: tabBg, filter: gradient ? "brightness(0.85)" : "none", top: "calc(50% - 48px - 12px)", left: "calc(50% - 64px + 16px)", transformOrigin: "bottom center", transform: isHovered ? "rotateX(-30deg) translateY(-3px)" : "rotateX(0deg) translateY(0)", transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 10 }} />
          <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 20 }}>
            {isEmpty ? (
              <div
                className="absolute w-20 h-28 pointer-events-none"
                style={{
                  transform: isHovered
                    ? "translateY(-100px) translateX(0px) rotate(0deg) scale(1)"
                    : "translateY(0px) translateX(0px) rotate(0deg) scale(0.4)",
                  opacity: isHovered ? 1 : 0,
                  transition: "all 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  zIndex: 12,
                  left: "-40px",
                  top: "-56px",
                }}
              >
                <div className="w-full h-full rounded-lg shadow-xl bg-card border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1.5 p-2">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                  <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground text-center leading-tight">
                    {t('project.comingSoon')}
                  </p>
                </div>
              </div>
            ) : (
              previewProjects.map((project, index) => (
                <ProjectCard key={project.id} ref={(el) => { cardRefs.current[index] = el; }} image={project.image} title={localize(project.title)} delay={index * 50} isVisible={isHovered} index={index} totalCount={previewProjects.length} onClick={() => handleProjectClick(project, index)} isSelected={hiddenCardId === project.id} canHover={canHover} />
              ))
            )}
          </div>
          <div className="absolute w-32 h-24 rounded-lg shadow-lg border border-white/20" style={{ background: frontBg, top: "calc(50% - 48px + 4px)", transformOrigin: "bottom center", transform: isHovered ? "rotateX(35deg) translateY(12px)" : "rotateX(0deg) translateY(0)", transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 30 }} />
          <div className="absolute w-32 h-24 rounded-lg overflow-hidden pointer-events-none" style={{ top: "calc(50% - 48px + 4px)", background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)", transformOrigin: "bottom center", transform: isHovered ? "rotateX(35deg) translateY(12px)" : "rotateX(0deg) translateY(0)", transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 31 }} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground mt-4 transition-all duration-500" style={{ transform: isHovered ? "translateY(2px)" : "translateY(0)", letterSpacing: isHovered ? "-0.01em" : "0" }}>{title}</h3>
          <p className="text-sm font-medium text-muted-foreground transition-all duration-500" style={{ opacity: isHovered ? 0.8 : 1 }}>
            {projects.length} {projects.length === 1 ? t('project.singular') : t('project.plural')}
          </p>
        </div>
      </div>
      <ImageLightbox projects={projects} currentIndex={selectedIndex ?? 0} isOpen={selectedIndex !== null} onClose={handleCloseLightbox} sourceRect={sourceRect} onCloseComplete={handleCloseComplete} onNavigate={handleNavigate} />
    </>
  );
};

// --- Main App ---

const DEFAULT_VOLUME = 0.4;
const MUSIC_BASE_VOLUME = 0.15;

export default function FolderPortfolio() {
  const { t, language, setLanguage } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [isMusicActuallyPlaying, setIsMusicActuallyPlaying] = useState(false);
  const volumePanelRef = useRef<HTMLDivElement>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicCtxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);
  isMusicPlayingRef.current = isMusicPlaying;

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
    const stored = localStorage.getItem('portfolio:volume');
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed)) {
        setVolume(parsed);
        if (parsed > 0) previousVolumeRef.current = parsed;
      }
    }
    const mql = window.matchMedia('(hover: hover)');
    setCanHover(mql.matches);
    const listener = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    setSoundVolume(volume);
    localStorage.setItem('portfolio:volume', String(volume));
    if (volume > 0) previousVolumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/jazz-background.mp3`);
    audio.loop = true;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    musicRef.current = audio;

    // Routear vía Web Audio API + GainNode. En iOS Safari `audio.volume` es
    // ignorado para HTMLAudioElement; con GainNode el control funciona.
    let ctx: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    try {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtxCtor();
      const source = ctx.createMediaElementSource(audio);
      gainNode = ctx.createGain();
      gainNode.gain.value = MUSIC_BASE_VOLUME * volume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      musicCtxRef.current = ctx;
      musicGainRef.current = gainNode;
    } catch {
      // Fallback: volumen directo (suficiente fuera de iOS)
      audio.volume = MUSIC_BASE_VOLUME * volume;
    }

    // Refleja el estado REAL de reproducción (no solo el deseo). Importante
    // porque los navegadores bloquean autoplay hasta el primer gesto del
    // usuario: el botón puede decir "on" sin sonido real.
    const handlePlaying = () => setIsMusicActuallyPlaying(true);
    const handlePauseEnded = () => setIsMusicActuallyPlaying(false);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePauseEnded);
    audio.addEventListener('ended', handlePauseEnded);

    // Música ON por defecto, OFF solo si el usuario la pausó explícitamente
    setIsMusicPlaying(localStorage.getItem('portfolio:music') !== 'false');

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePauseEnded);
      audio.removeEventListener('ended', handlePauseEnded);
      audio.pause();
      if (ctx) {
        ctx.close().catch(() => {});
      }
      musicRef.current = null;
      musicCtxRef.current = null;
      musicGainRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;

    // Volumen: GainNode si Web Audio está disponible, sino audio.volume directo.
    const targetVol = MUSIC_BASE_VOLUME * volume;
    const gainNode = musicGainRef.current;
    if (gainNode) {
      gainNode.gain.value = targetVol;
    } else {
      audio.volume = targetVol;
    }

    if (isMusicPlaying) {
      const ctx = musicCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      audio.play().catch((e) => {
        if (typeof console !== 'undefined') {
          console.debug('[music] play bloqueado:', e?.message ?? e);
        }
      });
    } else {
      audio.pause();
    }
    localStorage.setItem('portfolio:music', String(isMusicPlaying));
  }, [isMusicPlaying, volume]);

  // Pausa la música cuando el usuario sale de la pestaña/ventana, y la
  // reanuda al volver (solo si la tenía activa, respeta pausa manual).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      const audio = musicRef.current;
      const ctx = musicCtxRef.current;
      if (!audio) return;
      if (document.visibilityState === 'hidden') {
        audio.pause();
        if (ctx && ctx.state === 'running') {
          ctx.suspend().catch(() => {});
        }
      } else if (document.visibilityState === 'visible') {
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (isMusicPlayingRef.current && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-unlock: si el navegador bloqueó el primer play() (sin gesto del
  // usuario), al primer click/tap/tecla en la página intentamos reanudar.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
      const audio = musicRef.current;
      const ctx = musicCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (audio && isMusicPlayingRef.current && audio.paused) {
        audio.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    if (!volumePanelOpen || canHover) return;
    const handleOutside = (e: MouseEvent) => {
      if (volumePanelRef.current && !volumePanelRef.current.contains(e.target as Node)) {
        setVolumePanelOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVolumePanelOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [volumePanelOpen, canHover]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleMute = () => setVolume((v) => (v === 0 ? previousVolumeRef.current : 0));
  const toggleMusic = () => setIsMusicPlaying((p) => !p);

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-accent/40 selection:text-foreground">
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-end gap-2">
          <div
            className="relative"
            ref={volumePanelRef}
            onMouseEnter={canHover ? () => setVolumePanelOpen(true) : undefined}
            onMouseLeave={canHover ? () => setVolumePanelOpen(false) : undefined}
          >
            <button
              onClick={canHover ? toggleMute : () => setVolumePanelOpen((o) => !o)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border"
              aria-label={canHover ? (volume === 0 ? t('header.unmute') : t('header.mute')) : t('header.volume')}
              aria-expanded={volumePanelOpen}
            >
              {volume === 0 ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
            </button>
            {volumePanelOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-10 z-50 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-center w-10 py-3 rounded-xl bg-card border border-border shadow-lg">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    onMouseUp={() => volume > 0 && playSound('whoosh')}
                    onTouchEnd={() => volume > 0 && playSound('whoosh')}
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    className="w-1.5 h-24 accent-foreground cursor-pointer"
                    aria-label={t('header.volume')}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={toggleMusic}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border"
              aria-label={isMusicPlaying ? t('header.musicStop') : t('header.musicStart')}
              aria-pressed={isMusicPlaying}
            >
              <Music
                className={cn(
                  "w-5 h-5",
                  isMusicPlaying ? "text-foreground" : "text-muted-foreground",
                )}
              />
            </button>
            {isMusicActuallyPlaying && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full pointer-events-none w-16 h-24 overflow-visible"
                aria-hidden="true"
              >
                {[
                  { delay: '0s', left: '20%', char: '♪' },
                  { delay: '0.9s', left: '60%', char: '♫' },
                  { delay: '1.8s', left: '35%', char: '♪' },
                  { delay: '2.7s', left: '75%', char: '♬' },
                ].map((note, i) => (
                  <span
                    key={i}
                    className="absolute bottom-2 text-base font-bold text-accent select-none"
                    style={{
                      left: note.left,
                      animation: `float-note 3.6s ease-out ${note.delay} infinite`,
                      textShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    }}
                  >
                    {note.char}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border"
            aria-label={t('header.language')}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {language === 'es' ? '🇪🇸' : '🇺🇸'}
            </span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border"
            aria-label={t('header.theme')}
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div className="text-center md:text-left order-2 md:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Luisana Jacqueline<br />
              <span className="text-primary italic">Gutiérrez Ruggia</span>
            </h1>
            <p className="text-sm sm:text-base font-bold uppercase tracking-widest text-accent mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              {t('hero.tagline')}
            </p>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto md:mx-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {t('hero.bio')}
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center md:justify-end animate-in fade-in zoom-in-95 duration-700 delay-300">
            <Lottie
              animationData={girlLaptopAnimation}
              loop
              autoplay
              className="w-full max-w-sm md:max-w-md"
            />
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-24 sm:pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 lg:gap-12 justify-items-center">
          {portfolioData.map((folder, index) => (
            <div
              key={folder.title}
              className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${200 + index * 100}ms` }}
            >
              <AnimatedFolder
                title={t(folder.title as TranslationKey)}
                projects={folder.projects}
                gradient={folder.gradient}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
