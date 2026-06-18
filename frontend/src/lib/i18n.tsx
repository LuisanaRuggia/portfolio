import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'es' | 'en';

const translations = {
  es: {
    'hero.tagline': 'Portafolio de Proyectos',
    'hero.bio':
      'Estudiante de ingeniería en ciencia de datos con skills en análisis de datos, ciencia de datos e ingeniería de datos.',
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
    'detail.back': 'Volver',
    'detail.statusInProgress': 'En progreso',
    'detail.statusFinishedOpen': 'Finalizado (abierto a oportunidades de mejora)',
    'detail.statusFinished': 'Finalizado',
    'project.crossDiscipline': 'Cross-disciplina',
    'project.alsoIn': 'También en',
    'detail.conceptMap': 'Skills aplicadas en este proyecto',
    'detail.conceptMapHint': 'Pasa el cursor sobre un concepto para ver sus conexiones, o arrástralo para moverlo.',
    'diagrams.zoomIn': 'Aumentar zoom',
    'diagrams.zoomOut': 'Reducir zoom',
    'diagrams.reset': 'Restablecer vista',
    'diagrams.hint': 'Arrastra para mover · Scroll para hacer zoom · Doble click para resetear · Esc para cerrar',
    'doc.openExternal': 'Abrir en pestaña nueva',
    'doc.download': 'Descargar PDF',
    'concept.group.arch': 'Arquitectura',
    'concept.group.data': 'Datos',
    'concept.group.ops': 'Operación',
    'concept.group.ml': 'Machine Learning',
    'detail.diagrams': 'Diagramas',
    'detail.diagramsDescription': 'Arquitectura y flujos',
    'detail.documentation': 'Documentación',
    'detail.documentationDescription': 'Guías técnicas',
    'detail.readmeStack': 'README y Stack',
    'detail.readmeStackDescription': 'Resumen técnico',
    'detail.links': 'Enlaces',
    'detail.linksDescription': 'Repositorio y demo',
    'detail.repo': 'Ver repositorio',
    'detail.demo': 'Ver demo',
    'detail.openReadme': 'Abrir README',
    'detail.openDocs': 'Abrir documentación',
    'detail.stackTitle': 'Stack tecnológico',
    'detail.blogVideo': 'Blog y Video',
    'detail.blogVideoDescription': 'Posts y demos',
    'detail.viewBlog': 'Ver blog',
    'detail.viewVideo': 'Ver video',
    'detail.updates': 'Cambios recientes',
    'detail.updatesDescription': 'Últimos commits',
    'detail.noUpdates': 'No hay cambios registrados aún',
    'header.cv': 'CV',
    'header.downloadCv': 'Descargar CV',
    'chat.title': 'Asistente del portafolio',
    'chat.disclaimer': 'Pregúntame sobre los proyectos',
    'chat.open': 'Abrir chat',
    'chat.close': 'Cerrar chat',
    'chat.placeholder': 'Pregúntame algo...',
    'chat.send': 'Enviar',
    'chat.welcome': '¡Hola! 👋 Soy Luisana. Puedo contarte sobre los proyectos del portafolio, el stack que uso o el contexto de cada uno. ¿Qué te interesa?',
    'chat.suggestion1': '¿Qué proyectos tienes?',
    'chat.suggestion2': '¿Qué tecnologías usas?',
    'chat.suggestion3': 'Cuéntame sobre Lakehouse',
    'chat.error.rateLimit': 'Espera un minuto, ya te respondo.',
    'chat.error.generic': 'Tuve un problema técnico, prueba de nuevo en un momento.',
    'category.cienciaDeDatos': 'Ciencia de Datos',
    'category.ingenieriaDeDatos': 'Ingeniería de Datos',
    'category.analisisDeDatos': 'Análisis de Datos',
    'category.iaAutomatizacion': 'IA & Automatización',
    'category.desarrollo': 'Desarrollo',
    'category.algoritmosYRetos': 'Algoritmos y Retos',
    'document.title': 'Portafolio de Proyectos | Luisana Gutiérrez Ruggia',
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
    'detail.back': 'Back',
    'detail.statusInProgress': 'In progress',
    'detail.statusFinishedOpen': 'Finished (open to improvement opportunities)',
    'detail.statusFinished': 'Finished',
    'project.crossDiscipline': 'Cross-discipline',
    'project.alsoIn': 'Also in',
    'detail.conceptMap': 'Skills applied in this project',
    'detail.conceptMapHint': 'Hover a concept to see its connections, or drag it to move.',
    'diagrams.zoomIn': 'Zoom in',
    'diagrams.zoomOut': 'Zoom out',
    'diagrams.reset': 'Reset view',
    'diagrams.hint': 'Drag to pan · Scroll to zoom · Double-click to reset · Esc to close',
    'doc.openExternal': 'Open in new tab',
    'doc.download': 'Download PDF',
    'concept.group.arch': 'Architecture',
    'concept.group.data': 'Data',
    'concept.group.ops': 'Operations',
    'concept.group.ml': 'Machine Learning',
    'detail.diagrams': 'Diagrams',
    'detail.diagramsDescription': 'Architecture and flows',
    'detail.documentation': 'Documentation',
    'detail.documentationDescription': 'Technical guides',
    'detail.readmeStack': 'README & Stack',
    'detail.readmeStackDescription': 'Technical summary',
    'detail.links': 'Links',
    'detail.linksDescription': 'Repository and demo',
    'detail.repo': 'View repository',
    'detail.demo': 'View demo',
    'detail.openReadme': 'Open README',
    'detail.openDocs': 'Open documentation',
    'detail.stackTitle': 'Tech stack',
    'detail.blogVideo': 'Blog & Video',
    'detail.blogVideoDescription': 'Posts and demos',
    'detail.viewBlog': 'View blog',
    'detail.viewVideo': 'View video',
    'detail.updates': 'Recent updates',
    'detail.updatesDescription': 'Latest commits',
    'detail.noUpdates': 'No updates yet',
    'header.cv': 'CV',
    'header.downloadCv': 'Download CV',
    'chat.title': 'Portfolio assistant',
    'chat.disclaimer': 'Ask me about the projects',
    'chat.open': 'Open chat',
    'chat.close': 'Close chat',
    'chat.placeholder': 'Ask me anything...',
    'chat.send': 'Send',
    'chat.welcome': 'Hi! 👋 I\'m Luisana. I can tell you about my portfolio projects, the stack I use or the context of each one. What interests you?',
    'chat.suggestion1': 'What projects do you have?',
    'chat.suggestion2': 'What tech do you use?',
    'chat.suggestion3': 'Tell me about Lakehouse',
    'chat.error.rateLimit': 'Hold on a minute, I\'ll be right back.',
    'chat.error.generic': 'Hit a technical issue, try again in a moment.',
    'category.cienciaDeDatos': 'Data Science',
    'category.ingenieriaDeDatos': 'Data Engineering',
    'category.analisisDeDatos': 'Data Analysis',
    'category.iaAutomatizacion': 'AI & Automation',
    'category.desarrollo': 'Development',
    'category.algoritmosYRetos': 'Algorithms & Challenges',
    'document.title': 'Project Portfolio | Luisana Gutiérrez Ruggia',
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
