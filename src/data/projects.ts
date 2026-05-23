import type { LocalizedString } from "@/lib/i18n";

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
 *        date: "2026-06-30",                     // Fecha de finalización (YYYY-MM-DD)
 *        links: {
 *          repo: "https://github.com/...",
 *          demo: "https://...",
 *          blog: "https://...",
 *        },
 *      }
 *
 *   3. Guarda. Vite recargará el portafolio automáticamente.
 */

export interface Project {
  id: string;
  image: string;
  title: LocalizedString;
  description?: LocalizedString;
  tags?: string[];
  date?: string;
  links?: {
    repo?: string;
    demo?: string;
    blog?: string;
  };
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
        date: "2026-06-30",
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
        date: "2026-07-28",
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
        date: "2026-09-01",
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
        date: "2026-09-22",
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
        date: "2026-11-03",
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
    projects: [],
  },
  {
    title: "category.algoritmosYRetos",
    gradient: "linear-gradient(135deg, #e73827, #f85032)",
    projects: [],
  },
];
