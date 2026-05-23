import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'es' | 'en';

const translations = {
  es: {
    'hero.tagline': 'Portafolio de Proyectos',
    'hero.bio':
      'Estudiante de ingeniería en ciencia de datos con skills en análisis de datos, ciencia de datos y en mi camino de aprendizaje de ingeniería de datos.',
    'header.theme': 'Cambiar tema',
    'header.volume': 'Volumen',
    'header.unmute': 'Activar sonido',
    'header.mute': 'Silenciar',
    'header.language': 'Cambiar idioma',
    'header.musicStart': 'Activar música',
    'header.musicStop': 'Pausar música',
    'musicHint.message': 'Sonando jazz de fondo. Toca la notita ↑ para pausar.',
    'musicHint.dismiss': 'Cerrar aviso',
    'project.singular': 'proyecto',
    'project.plural': 'proyectos',
    'project.comingSoon': 'Próximamente',
    'project.view': 'Ver Proyecto',
    'lightbox.close': 'Cerrar',
    'lightbox.previous': 'Proyecto anterior',
    'lightbox.next': 'Proyecto siguiente',
    'lightbox.goToProject': 'Ir al proyecto',
    'category.cienciaDeDatos': 'Ciencia de Datos',
    'category.ingenieriaDeDatos': 'Ingeniería de Datos',
    'category.analisisDeDatos': 'Análisis de Datos',
    'category.iaAutomatizacion': 'IA & Automatización',
    'category.computacionCuantica': 'Computación Cuántica',
    'category.algoritmia': 'Algoritmia',
    'document.title': 'Luisana Gutiérrez — Portafolio de Proyectos',
  },
  en: {
    'hero.tagline': 'Project Portfolio',
    'hero.bio':
      'Data Science Engineering student with skills in data analysis, data science, and on my learning path to data engineering.',
    'header.theme': 'Toggle theme',
    'header.volume': 'Volume',
    'header.unmute': 'Unmute',
    'header.mute': 'Mute',
    'header.language': 'Change language',
    'header.musicStart': 'Play music',
    'header.musicStop': 'Pause music',
    'musicHint.message': 'Jazz playing in the background. Tap the note ↑ to pause.',
    'musicHint.dismiss': 'Dismiss',
    'project.singular': 'project',
    'project.plural': 'projects',
    'project.comingSoon': 'Coming Soon',
    'project.view': 'View Project',
    'lightbox.close': 'Close',
    'lightbox.previous': 'Previous project',
    'lightbox.next': 'Next project',
    'lightbox.goToProject': 'Go to project',
    'category.cienciaDeDatos': 'Data Science',
    'category.ingenieriaDeDatos': 'Data Engineering',
    'category.analisisDeDatos': 'Data Analysis',
    'category.iaAutomatizacion': 'AI & Automation',
    'category.computacionCuantica': 'Quantum Computing',
    'category.algoritmia': 'Algorithms',
    'document.title': 'Luisana Gutiérrez — Project Portfolio',
  },
} as const;

export type TranslationKey = keyof typeof translations['es'];

/**
 * Un campo que puede ser único o tener versiones por idioma.
 * Útil para títulos/descripciones de proyectos que a veces son nombres
 * técnicos (mismo en ambos idiomas) y otras veces necesitan traducción.
 *
 *   title: "Lakehouse Medallion"                          // mismo en ambos
 *   title: { es: "CDC con Debezium", en: "CDC with Debezium" }
 */
export type LocalizedString = string | { es: string; en: string };

function resolveLocalized(value: LocalizedString | undefined, language: Language): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return value[language] ?? value.es;
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  localize: (value: LocalizedString | undefined) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    const stored = localStorage.getItem('portfolio:language');
    if (stored === 'es' || stored === 'en') {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language]['document.title'];
    localStorage.setItem('portfolio:language', language);
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  const t = (key: TranslationKey) => translations[language][key];

  const localize = (value: LocalizedString | undefined) => resolveLocalized(value, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, localize }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}
