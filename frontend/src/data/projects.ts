import type { LocalizedString } from "@/lib/i18n";
import type { ThemedImage } from "@/lib/theme";

/**
 * Catálogo de proyectos del portafolio.
 *
 * Para agregar un proyecto nuevo:
 *   1. Encuentra la categoría correspondiente en `portfolioData`.
 *   2. Agrega un objeto al array `projects` siguiendo este esquema:
 *
 *      {
 *        id: "ed6",                              // ID único. Convención: prefijo por categoría
 *                                                //   cd_ (Ciencia), ed_ (Ingeniería), ad_ (Análisis)
 *                                                //   ia_ (IA), cq_ (Cuántica), al_ (Algoritmia)
 *        image: "/images/projects/lakehouse.png",// Ruta en /public o URL absoluta
 *
 *        // Title y description aceptan un string (mismo en ambos idiomas)
 *        // o un objeto { es, en } cuando necesitan traducción:
 *        title: "Lakehouse Medallion",
 *        // — o —
 *        title: { es: "CDC con Debezium", en: "CDC with Debezium" },
 *
 *        // --- Campos opcionales ---
 *        description: { es: "Resumen en español.", en: "Summary in English." },
 *        tags: ["Tag1", "Tag2"],                 // Stack tecnológico (sin traducción)
 *        status: "in-progress",                  // "in-progress" | "finished-open" | "finished"
 *        date: "2026-06-30",                     // Fecha interna (no se muestra en el front)
 *        links: {
 *          repo: "https://github.com/...",
 *          demo: "https://...",
 *          blog: "https://...",
 *        },
 *      }
 *
 *   3. Guarda. Vite recargará el portafolio automáticamente.
 */

/**
 * Estado del proyecto. Controla el badge en project-detail.tsx y el filtro
 * de proyectos que aparecen en el CV.
 *   in-progress    → en desarrollo, NO visible en el CV.
 *   published      → ya publicado / en producción, pero sigo activamente
 *                    agregando features o iterando. SÍ aparece en CV.
 *   finished-open  → cerrado pero el código queda público / open-source.
 *                    SÍ aparece en CV.
 *   finished       → cerrado, completo, archivado. SÍ aparece en CV.
 */
export type ProjectStatus = "in-progress" | "published" | "finished-open" | "finished";

/**
 * Grupo conceptual de un nodo. Controla el color del nodo en el grafo.
 *   arch   → patrones arquitectónicos (medallion, kappa)
 *   data   → conceptos de datos (CDC, ACID, schemas)
 *   ops    → operación (orquestación, observabilidad, IaC)
 *   ml     → machine learning (features, training, serving)
 */
export type ConceptGroup = "arch" | "data" | "ops" | "ml";

export interface ProjectConcept {
  id: string;                        // ID único dentro del proyecto
  label: LocalizedString;            // texto del nodo
  group: ConceptGroup;               // categoría → color
}

export interface ProjectConceptEdge {
  from: string;                      // ID del nodo origen
  to: string;                        // ID del nodo destino
}

export interface ProjectConcepts {
  nodes: ProjectConcept[];
  edges: ProjectConceptEdge[];       // relaciones entre conceptos (no incluyas las que parten del proyecto)
}

/**
 * Entrada de un diagrama. Soporta dos formas para retro-compat:
 *   - `"foo.svg"` → URL crudo, sin caption (estilo legacy).
 *   - `{ url, caption: { es, en } }` → URL + caption bilingüe.
 * Los auto-generados por `sync-diagrams.ts` (Fase 3) usan la segunda forma.
 */
export type DiagramEntry = string | { url: string; caption?: LocalizedString };

export interface Project {
  id: string;
  /**
   * Imagen principal del proyecto. Puede ser un string (mismo en ambos temas)
   * o `{ light, dark }` para que el sitio swappee la imagen según el tema activo.
   * Ver `useThemedImage()` en `lib/theme.ts`.
   */
  image: ThemedImage;
  title: LocalizedString;
  description?: LocalizedString;
  /**
   * Descripción ALTERNATIVA usada por `backend/scripts/generate-cv.ts` cuando
   * la `description` tiene frases que asumen el contexto del portafolio
   * (ej. "este mismo sitio", "ver más abajo"). Si no se define, el CV usa
   * `description` directamente. Debe ser agnóstica al portafolio: pensada
   * para que tenga sentido si alguien la lee impresa o por email.
   */
  cvDescription?: LocalizedString;
  tags?: string[];
  status?: ProjectStatus;
  date?: string;
  links?: {
    repo?: string;
    demo?: string;
    /**
     * URL del post en Dev.to (o blog equivalente) que explica el proyecto.
     * Se muestra como card con link externo en la sección "Blog y Video".
     *
     * Ejemplo:
     *   blog: "https://dev.to/luisanaruggia/portfolio-interactivo-con-llm-chat-1ab2",
     */
    blog?: string;
  };
  concepts?: ProjectConcepts;       // mapa conceptual del proyecto (grafo estilo Obsidian)

  /**
   * Otras categorías donde este proyecto también debe aparecer (cross-listing).
   * El proyecto vive en una sola entrada de `portfolioData`, pero se renderiza
   * además en las carpetas listadas aquí, marcado con un badge "cross-discipline".
   *
   * Usa las translation keys del título de la categoría, ej:
   *   crossCategories: ["category.cienciaDeDatos"]
   */
  crossCategories?: string[];

  // --- Vista de detalle del proyecto (#/project/<id>) ---
  // Si están vacíos, la sección correspondiente muestra "Próximamente".
  diagrams?: DiagramEntry[];    // URLs de imágenes con caption opcional
  /**
   * Metadata de la documentación auto-generada por `generate-docs.ts`.
   * Se inyecta desde `generated/docs.json` (ver merge al final del archivo).
   * El frontend construye los URLs en runtime según language + tema:
   *   `${BASE_URL}docs/${id}/${theme}/documentation.${lang}.pdf`
   *   `${BASE_URL}docs/${id}/${theme}/pages-${lang}/page-${n}.png`
   */
  documentation?: { pageCount: number; variants: string[] };
  /** @deprecated Reemplazado por `documentation`. Se mantiene por si proyectos sin agente lo usan. */
  documentationUrl?: string;
  /** @deprecated Reemplazado por `documentation`. Se mantiene por si proyectos sin agente lo usan. */
  documentationPages?: string[];
  readmeUrl?: string;           // link al README.md en GitHub
  screenshot?: string;          // foto grande para sección "Enlaces" (default: image)
  /**
   * URL del video demo del proyecto.
   *
   * - Si es de YouTube (cualquier formato — `youtube.com/watch?v=`,
   *   `youtu.be/`, `/embed/`, `/shorts/`), el frontend embebe el iframe
   *   responsive 16:9 directo en la sección "Blog y Video".
   * - Si es de otra plataforma (Vimeo, Loom, etc.), se muestra como un
   *   link externo en lugar del embed.
   *
   * Para que el visitante del portafolio pueda verlo embebido, el video
   * debe ser **Público** o **Unlisted** ("oculto, solo con el link") en
   * YouTube. Los videos Privados NO funcionan en iframes embebidos.
   *
   * Ejemplos:
   *   videoUrl: "https://youtu.be/dQw4w9WgXcQ",
   *   videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
   */
  videoUrl?: string;

  /**
   * Lista de cambios recientes / commits en lenguaje natural.
   * En el futuro: backend lee `git log` y traduce vía LLM a esto.
   * Por ahora: hardcoded por proyecto.
   *
   * Ej: { date: "2026-05-23", description: { es: "Arreglo bug ...", en: "Fix bug ..." } }
   */
  updates?: Array<{
    date: string;                  // formato YYYY-MM-DD
    description: LocalizedString;
  }>;
}

export interface Category {
  /** Translation key. See `src/lib/i18n.tsx` */
  title: string;
  gradient: string;
  projects: Project[];
}

export const portfolioData: Category[] = [
  {
    title: "category.cienciaDeDatos",
    gradient: "linear-gradient(135deg, #00c6ff, #0072ff)",
    projects: [],
  },
  {
    title: "category.ingenieriaDeDatos",
    gradient: "linear-gradient(to right, #871844, #682C44)",
    projects: [
      {
        id: "ed1",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800",
        title: "Lakehouse Medallion",
        description: {
          es: "Lakehouse local con arquitectura medallion (bronze/silver/gold) usando Spark + dbt + Trino sobre MinIO, orquestado con Airflow.",
          en: "Local lakehouse with medallion architecture (bronze/silver/gold) using Spark + dbt + Trino on MinIO, orchestrated with Airflow.",
        },
        tags: ["Airflow", "Spark", "dbt", "Trino", "MinIO", "Docker"],
        status: "in-progress",
        date: "2026-06-30",
        concepts: {
          nodes: [
            { id: "medallion", label: { es: "Arquitectura Medallion", en: "Medallion Architecture" }, group: "arch" },
            { id: "lakehouse", label: { es: "Lakehouse", en: "Lakehouse" }, group: "arch" },
            { id: "bronze-silver-gold", label: { es: "Capas Bronze/Silver/Gold", en: "Bronze/Silver/Gold Layers" }, group: "data" },
            { id: "dim-modeling", label: { es: "Modelado dimensional", en: "Dimensional Modeling" }, group: "data" },
            { id: "object-storage", label: { es: "Object Storage", en: "Object Storage" }, group: "data" },
            { id: "federated-sql", label: { es: "SQL federado", en: "Federated SQL" }, group: "data" },
            { id: "orchestration", label: { es: "Orquestación de pipelines", en: "Pipeline Orchestration" }, group: "ops" },
            { id: "iac", label: { es: "Infrastructure as Code", en: "Infrastructure as Code" }, group: "ops" },
          ],
          edges: [
            { from: "medallion", to: "bronze-silver-gold" },
            { from: "medallion", to: "lakehouse" },
            { from: "lakehouse", to: "object-storage" },
            { from: "lakehouse", to: "federated-sql" },
            { from: "bronze-silver-gold", to: "dim-modeling" },
            { from: "orchestration", to: "bronze-silver-gold" },
            { from: "iac", to: "orchestration" },
          ],
        },
        updates: [
          {
            date: "2026-05-23",
            description: {
              es: "Repositorio inicial creado en GitHub con scaffold del proyecto",
              en: "Initial repository created on GitHub with project scaffold",
            },
          },
          {
            date: "2026-05-22",
            description: {
              es: "Definición de arquitectura medallion y stack tecnológico",
              en: "Medallion architecture and tech stack defined",
            },
          },
        ],
      },
      {
        id: "ed2",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
        title: { es: "CDC con Debezium", en: "CDC with Debezium" },
        description: {
          es: "Captura de cambios en tiempo real desde Postgres con Debezium + Kafka, sink final en ClickHouse. Foco en snapshot inicial y exactly-once.",
          en: "Real-time change data capture from Postgres with Debezium + Kafka, final sink in ClickHouse. Focus on initial snapshot and exactly-once delivery.",
        },
        tags: ["Postgres", "Debezium", "Kafka", "ClickHouse", "Docker"],
        status: "in-progress",
        date: "2026-07-28",
        concepts: {
          nodes: [
            { id: "cdc", label: { es: "Change Data Capture", en: "Change Data Capture" }, group: "arch" },
            { id: "log-based", label: { es: "Replicación log-based", en: "Log-based Replication" }, group: "data" },
            { id: "exactly-once", label: { es: "Exactly-once", en: "Exactly-once" }, group: "data" },
            { id: "event-driven", label: { es: "Event-driven", en: "Event-driven" }, group: "arch" },
            { id: "snapshot", label: { es: "Snapshot inicial", en: "Initial Snapshot" }, group: "data" },
            { id: "oltp-olap", label: { es: "OLTP → OLAP", en: "OLTP → OLAP" }, group: "data" },
            { id: "columnar", label: { es: "Almacenamiento columnar", en: "Columnar Storage" }, group: "data" },
            { id: "real-time", label: { es: "Tiempo real", en: "Real-time" }, group: "ops" },
          ],
          edges: [
            { from: "cdc", to: "log-based" },
            { from: "cdc", to: "snapshot" },
            { from: "log-based", to: "exactly-once" },
            { from: "event-driven", to: "real-time" },
            { from: "oltp-olap", to: "columnar" },
            { from: "real-time", to: "oltp-olap" },
          ],
        },
      },
      {
        id: "ed3",
        image: "https://images.unsplash.com/photo-1611162617213-7d96d8db7e64?auto=format&fit=crop&q=80&w=800",
        title: { es: "Kappa / Fraude en Streaming", en: "Kappa / Streaming Fraud" },
        description: {
          es: "Pipeline de detección de fraude con arquitectura Kappa: Kafka + Flink + Iceberg + Redis. Manejo de watermarks y datos tardíos.",
          en: "Fraud detection streaming pipeline with Kappa architecture: Kafka + Flink + Iceberg + Redis. Watermarks and late-arriving data handling.",
        },
        tags: ["Kafka", "Flink", "Iceberg", "Redis", "Python"],
        status: "in-progress",
        date: "2026-09-01",
        crossCategories: ["category.cienciaDeDatos"],
        concepts: {
          nodes: [
            { id: "kappa", label: { es: "Arquitectura Kappa", en: "Kappa Architecture" }, group: "arch" },
            { id: "stream-processing", label: { es: "Stream processing", en: "Stream Processing" }, group: "arch" },
            { id: "event-time", label: { es: "Event-time", en: "Event-time" }, group: "data" },
            { id: "watermarks", label: { es: "Watermarks", en: "Watermarks" }, group: "data" },
            { id: "late-data", label: { es: "Datos tardíos", en: "Late-arriving Data" }, group: "data" },
            { id: "stateful", label: { es: "Estado distribuido", en: "Distributed State" }, group: "data" },
            { id: "acid-tables", label: { es: "Tablas ACID", en: "ACID Tables" }, group: "data" },
            { id: "fraud-detection", label: { es: "Detección de fraude", en: "Fraud Detection" }, group: "ml" },
          ],
          edges: [
            { from: "kappa", to: "stream-processing" },
            { from: "stream-processing", to: "event-time" },
            { from: "event-time", to: "watermarks" },
            { from: "watermarks", to: "late-data" },
            { from: "stream-processing", to: "stateful" },
            { from: "stream-processing", to: "fraud-detection" },
            { from: "acid-tables", to: "stateful" },
          ],
        },
      },
      {
        id: "ed4",
        image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800",
        title: "Data Quality",
        description: {
          es: "Contratos de datos en YAML + Great Expectations + OpenLineage. Alertas a Slack ante drift o violación de schema.",
          en: "Data contracts in YAML + Great Expectations + OpenLineage. Slack alerts on drift or schema violations.",
        },
        tags: ["Great Expectations", "OpenLineage", "Slack", "YAML"],
        status: "in-progress",
        date: "2026-09-22",
        concepts: {
          nodes: [
            { id: "data-contracts", label: { es: "Contratos de datos", en: "Data Contracts" }, group: "arch" },
            { id: "schema-validation", label: { es: "Validación de schemas", en: "Schema Validation" }, group: "data" },
            { id: "lineage", label: { es: "Linaje de datos", en: "Data Lineage" }, group: "data" },
            { id: "observability", label: { es: "Observabilidad", en: "Observability" }, group: "ops" },
            { id: "drift", label: { es: "Detección de drift", en: "Drift Detection" }, group: "data" },
            { id: "governance", label: { es: "Governance", en: "Governance" }, group: "ops" },
            { id: "pipeline-testing", label: { es: "Testing de pipelines", en: "Pipeline Testing" }, group: "ops" },
            { id: "alerting", label: { es: "Alertas", en: "Alerting" }, group: "ops" },
          ],
          edges: [
            { from: "data-contracts", to: "schema-validation" },
            { from: "schema-validation", to: "drift" },
            { from: "lineage", to: "observability" },
            { from: "observability", to: "alerting" },
            { from: "drift", to: "alerting" },
            { from: "governance", to: "data-contracts" },
            { from: "governance", to: "lineage" },
            { from: "pipeline-testing", to: "schema-validation" },
          ],
        },
      },
      {
        id: "ed5",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
        title: "Feature Store / MLOps",
        description: {
          es: "Plataforma de features con Feast (Redis online + DuckDB offline). Cierre del ciclo end-to-end con un modelo de ML en producción.",
          en: "Feature platform with Feast (Redis online + DuckDB offline). End-to-end loop closed with an ML model in production.",
        },
        tags: ["Feast", "Redis", "DuckDB", "Spark", "MLOps"],
        status: "in-progress",
        date: "2026-11-03",
        crossCategories: ["category.cienciaDeDatos"],
        concepts: {
          nodes: [
            { id: "feature-store", label: { es: "Feature Store", en: "Feature Store" }, group: "ml" },
            { id: "mlops", label: { es: "MLOps", en: "MLOps" }, group: "ml" },
            { id: "online-serving", label: { es: "Serving online", en: "Online Serving" }, group: "ml" },
            { id: "offline-storage", label: { es: "Storage offline", en: "Offline Storage" }, group: "ml" },
            { id: "low-latency", label: { es: "Baja latencia", en: "Low Latency" }, group: "ops" },
            { id: "feature-registry", label: { es: "Feature registry", en: "Feature Registry" }, group: "ml" },
            { id: "training-datasets", label: { es: "Datasets de training", en: "Training Datasets" }, group: "ml" },
            { id: "ml-inference", label: { es: "Inferencia ML", en: "ML Inference" }, group: "ml" },
            { id: "end-to-end-ml", label: { es: "Ciclo ML end-to-end", en: "End-to-end ML Loop" }, group: "ml" },
          ],
          edges: [
            { from: "feature-store", to: "online-serving" },
            { from: "feature-store", to: "offline-storage" },
            { from: "feature-store", to: "feature-registry" },
            { from: "online-serving", to: "low-latency" },
            { from: "online-serving", to: "ml-inference" },
            { from: "offline-storage", to: "training-datasets" },
            { from: "mlops", to: "feature-store" },
            { from: "mlops", to: "end-to-end-ml" },
            { from: "training-datasets", to: "end-to-end-ml" },
            { from: "ml-inference", to: "end-to-end-ml" },
          ],
        },
      },
    ],
  },
  {
    title: "category.analisisDeDatos",
    gradient: "linear-gradient(135deg, #06d6a0, #118ab2)",
    projects: [],
  },
  {
    title: "category.iaAutomatizacion",
    gradient: "linear-gradient(135deg, #8e2de2, #4a00e0)",
    projects: [],
  },
  {
    title: "category.desarrollo",
    gradient: "linear-gradient(to right, #414345, #232526)",
    projects: [
      {
        id: "dev1",
        image: {
          light: `${import.meta.env.BASE_URL}images/portfolio-light.png`,
          dark: `${import.meta.env.BASE_URL}images/portfolio-dark.png`,
        },
        title: { es: "Portafolio Personal", en: "Personal Portfolio" },
        description: {
          es: "Este mismo sitio. Portafolio interactivo en React + TypeScript con animaciones 3D, grafos conceptuales force-directed, chat asistente con LLM, multilenguaje ES/EN y música de fondo. Build estática en GitHub Pages + Cloudflare Worker para el chat.",
          en: "This very site. Interactive portfolio in React + TypeScript with 3D animations, force-directed concept graphs, LLM-powered chat assistant, ES/EN multilingual support, and background music. Static build on GitHub Pages + Cloudflare Worker for the chat.",
        },
        cvDescription: {
          es: "Portafolio personal interactivo en React + TypeScript con animaciones 3D, grafos conceptuales force-directed, chat asistente con LLM y soporte multilenguaje ES/EN. Frontend estático en GitHub Pages, backend serverless en Cloudflare Workers + Groq.",
          en: "Interactive personal portfolio in React + TypeScript with 3D animations, force-directed concept graphs, LLM-powered chat assistant and ES/EN multilingual support. Static frontend on GitHub Pages, serverless backend on Cloudflare Workers + Groq.",
        },
        tags: ["React", "TypeScript", "Vite", "Tailwind", "Cloudflare Workers", "Lottie", "Web Audio API"],
        // "published": el portafolio está vivo en luisanaruggia.github.io/portfolio
        // pero sigo agregando features y puliéndolo.
        status: "published",
        crossCategories: ["category.iaAutomatizacion"],
        links: {
          repo: "https://github.com/LuisanaRuggia/portfolio",
          demo: "https://luisanaruggia.github.io/portfolio/",
          // Blog interno self-hosted: el path empieza con "/blog/<slug>" y
          // navega dentro del SPA. Para enlazar a un post externo
          // (ej. Dev.to), usar una URL absoluta.
          blog: "/blog/portafolio-interactivo-con-llm",
        },
        diagrams: [
          `${import.meta.env.BASE_URL}diagrams/portfolio/frontend-architecture.svg`,
          `${import.meta.env.BASE_URL}diagrams/portfolio/backend-architecture.svg`,
        ],
        // documentationUrl y documentationPages se computan dinámicamente en
        // project-detail.tsx según language + isDark (4 variantes auto-generadas
        // por backend/scripts/generate-docs.ts). El generated/docs.json del
        // merge de abajo provee el pageCount.
        readmeUrl: "https://github.com/LuisanaRuggia/portfolio/blob/main/README.md",
        videoUrl: "https://youtu.be/zukDi1NgABU",
        updates: [
          {
            date: "2026-05-24",
            description: {
              es: "Imagen del proyecto cambia entre versión clara y oscura según el tema activo del sitio",
              en: "Project image switches between light and dark variants based on the active site theme",
            },
          },
          {
            date: "2026-05-24",
            description: {
              es: "Documentación técnica como poster PDF de una página, con diagramas vectoriales SVG embebidos y descarga directa",
              en: "Technical documentation as single-page poster PDF, with embedded vector SVG diagrams and direct download",
            },
          },
          {
            date: "2026-05-24",
            description: {
              es: "Visor fullscreen para diagramas y documentación con zoom, pan, pinch-zoom en mobile, navegación entre páginas y atajos de teclado",
              en: "Fullscreen viewer for diagrams and documentation with zoom, pan, mobile pinch-zoom, page navigation and keyboard shortcuts",
            },
          },
          {
            date: "2026-05-23",
            description: {
              es: "Vista de detalle por proyecto con grafo conceptual force-directed estilo Obsidian, status badges y categorías cross-disciplina",
              en: "Per-project detail view with Obsidian-style force-directed concept graph, status badges and cross-discipline categories",
            },
          },
          {
            date: "2026-05-23",
            description: {
              es: "Chat asistente flotante multilingüe que responde sobre proyectos, stack tecnológico y skills aplicadas",
              en: "Floating multilingual chat assistant that answers about projects, tech stack and applied skills",
            },
          },
          {
            date: "2026-05-22",
            description: {
              es: "Versión inicial: carpetas 3D animadas, multi-idioma ES/EN, tema claro/oscuro, música jazz opcional y deploy automático a GitHub Pages",
              en: "Initial version: animated 3D folders, ES/EN multilingual, light/dark theme, optional jazz music and automatic GitHub Pages deploy",
            },
          },
        ],
        concepts: {
          nodes: [
            { id: "jamstack", label: { es: "JAMstack", en: "JAMstack" }, group: "arch" },
            { id: "static-first", label: { es: "Static-first", en: "Static-first" }, group: "arch" },
            { id: "3d-animation", label: { es: "Animaciones 3D CSS", en: "3D CSS Animations" }, group: "arch" },
            { id: "force-directed", label: { es: "Grafos force-directed", en: "Force-directed Graphs" }, group: "data" },
            { id: "hash-routing", label: { es: "Hash routing", en: "Hash Routing" }, group: "data" },
            { id: "i18n", label: { es: "i18n bilingüe", en: "Bilingual i18n" }, group: "ops" },
            { id: "edge-functions", label: { es: "Edge Functions", en: "Edge Functions" }, group: "ops" },
            { id: "web-audio", label: { es: "Web Audio API", en: "Web Audio API" }, group: "ops" },
            { id: "ci-cd", label: { es: "CI/CD con Actions", en: "GitHub Actions CI/CD" }, group: "ops" },
            { id: "llm-chat", label: { es: "Chat con LLM", en: "LLM-powered Chat" }, group: "ml" },
          ],
          edges: [
            { from: "jamstack", to: "static-first" },
            { from: "jamstack", to: "edge-functions" },
            { from: "static-first", to: "ci-cd" },
            { from: "edge-functions", to: "llm-chat" },
            { from: "force-directed", to: "hash-routing" },
            { from: "i18n", to: "static-first" },
            { from: "3d-animation", to: "web-audio" },
            { from: "ci-cd", to: "static-first" },
          ],
        },
      },
    ],
  },
  {
    title: "category.algoritmosYRetos",
    gradient: "linear-gradient(135deg, #e73827, #f85032)",
    projects: [],
  },
];

// --- Auto-generated overrides (Fase 2) -------------------------------------
// Los agentes batch escriben `generated/updates.json` y `generated/concepts.json`
// en cada push a main. Acá se mergean SOBRE los hardcoded de arriba: si hay
// generated para un proyecto, override; si no, queda el hardcoded como fallback.
// Si el script falla un día, el sitio no se rompe — sigue mostrando lo manual.
import generatedUpdates from "./generated/updates.json";
import generatedConcepts from "./generated/concepts.json";
import generatedDiagrams from "./generated/diagrams.json";
import generatedDocs from "./generated/docs.json";

const gu = generatedUpdates as Record<string, Project["updates"] | undefined>;
const gc = generatedConcepts as Record<string, Project["concepts"] | undefined>;
const gd = generatedDiagrams as Record<string, Project["diagrams"] | undefined>;
const gdocs = generatedDocs as Record<string, Project["documentation"] | undefined>;

for (const cat of portfolioData) {
  for (const p of cat.projects) {
    const updates = gu[p.id];
    if (updates && updates.length > 0) p.updates = updates;
    const concepts = gc[p.id];
    if (concepts && concepts.nodes.length > 0) p.concepts = concepts;
    const diagrams = gd[p.id];
    if (diagrams && diagrams.length > 0) p.diagrams = diagrams;
    const docs = gdocs[p.id];
    if (docs && docs.pageCount > 0) p.documentation = docs;
  }
}
