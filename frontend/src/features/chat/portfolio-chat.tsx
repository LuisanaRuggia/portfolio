import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation, type Language, type TranslationKey } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #FF8E3A)';

/**
 * Respuestas mock por palabras clave. Foco: qué es cada proyecto, cómo se
 * usa cada herramienta, qué arquitectura tiene, qué skills demuestra y dónde
 * encontrar las cosas en el portafolio. NO incluye fechas internas ni
 * cronograma personal (eso es trabajo del backend privado).
 *
 * Cuando se conecte el agente real, reemplazar `sendMessage` por una llamada
 * al backend; el resto del UI no cambia.
 */
function getMockResponse(input: string, language: Language): string {
  const text = input.toLowerCase().trim();
  const es = language === 'es';

  // Saludos
  if (/^(hola|holi|buen[oa]s|hey|hello|hi|sup)/i.test(input)) {
    return es
      ? '¡Hola! Te puedo contar sobre los proyectos, la arquitectura, el stack o alguna herramienta específica. ¿Por dónde empezamos?'
      : 'Hi! I can tell you about the projects, the architecture, the stack, or a specific tool. Where do we start?';
  }

  // Proyectos / categorías
  if (/proyect|project|categoria|categori|portfolio|portafolio/.test(text)) {
    return es
      ? 'El portafolio se organiza en seis áreas: Ciencia de Datos, Ingeniería de Datos, Análisis de Datos, IA y Automatización, Desarrollo, y Algoritmos y Retos. En **Ingeniería de Datos** hay cinco proyectos que en conjunto arman una plataforma de datos completa:\n\n• **Lakehouse Medallion**\n• **CDC con Debezium**\n• **Kappa / Streaming de Fraude**\n• **Data Quality**\n• **Feature Store / MLOps**\n\n¿Quieres que te cuente más de alguno?'
      : 'The portfolio is organized into six areas: Data Science, Data Engineering, Data Analysis, AI and Automation, Development, and Algorithms and Challenges. In **Data Engineering** there are five projects that together build a complete data platform:\n\n• **Lakehouse Medallion**\n• **CDC with Debezium**\n• **Kappa / Streaming Fraud**\n• **Data Quality**\n• **Feature Store / MLOps**\n\nWant me to tell you more about any of them?';
  }

  // --- Proyectos individuales (foco en qué hacen, arquitectura, skills) ---

  if (/lakehouse|medallion|bronze|silver|gold/.test(text)) {
    return es
      ? 'El **Lakehouse Medallion** 🏛️ es un lakehouse local con arquitectura medallion: bronze → silver → gold. Usa Spark para el procesamiento distribuido, dbt para las transformaciones SQL versionadas, Trino como query engine federado, MinIO como object storage y Airflow para la orquestación, todo dockerizado para reproducibilidad.\n\nCon este proyecto **Luisana demuestra skills de** arquitectura de lakehouse, modelado dimensional, orquestación de pipelines e infraestructura como código.'
      : '**Lakehouse Medallion** 🏛️ is a local lakehouse with medallion architecture: bronze → silver → gold. It uses Spark for distributed processing, dbt for versioned SQL transformations, Trino as federated query engine, MinIO as object storage, and Airflow for orchestration, all dockerized for reproducibility.\n\nWith this project **Luisana demonstrates skills in** lakehouse architecture, dimensional modeling, pipeline orchestration, and infrastructure as code.';
  }

  if (/cdc|debezium|clickhouse|change data capture/.test(text)) {
    return es
      ? '**CDC con Debezium** captura cambios row-level en tiempo real con el flujo Postgres → Debezium → Kafka → ClickHouse, llevando los eventos transaccionales a una base OLAP de baja latencia. El foco está en hacer correctamente el snapshot inicial y mantener semánticas exactly-once.\n\nCon este proyecto **Luisana demuestra skills de** replicación de bases de datos en tiempo real, arquitectura event-driven e integración OLTP → OLAP.'
      : '**CDC with Debezium** captures real-time row-level changes with the flow Postgres → Debezium → Kafka → ClickHouse, moving transactional events into a low-latency OLAP database. The focus is on getting the initial snapshot right and keeping exactly-once semantics.\n\nWith this project **Luisana demonstrates skills in** real-time database replication, event-driven architecture, and OLTP → OLAP integration.';
  }

  if (/kappa|fraude|fraud|streaming fraud/.test(text)) {
    return es
      ? '**Kappa / Fraude en Streaming** es un pipeline de detección de fraude con arquitectura Kappa: todo como stream, sin capa batch separada. Flujo: Kafka → Flink → Iceberg, con Redis manejando el state caliente. Flink se encarga de los watermarks y los eventos tardíos.\n\nCon este proyecto **Luisana demuestra skills de** stream processing avanzado, semánticas de tiempo de evento y detección en tiempo real.'
      : '**Kappa / Streaming Fraud** is a fraud detection pipeline with Kappa architecture: everything as stream, no separate batch layer. Flow: Kafka → Flink → Iceberg, with Redis handling hot state. Flink takes care of watermarks and late events.\n\nWith this project **Luisana demonstrates skills in** advanced stream processing, event-time semantics, and real-time detection.';
  }

  if (/feature store|mlops|feast|duckdb/.test(text)) {
    return es
      ? '**Feature Store / MLOps** es una plataforma de features con Feast, dividida en dos caminos:\n\n• **Online** → Redis para serving de baja latencia en inferencia\n• **Offline** → DuckDB para construir los datasets de training\n\nCierra el ciclo end-to-end con un modelo de ML en producción.\n\nCon este proyecto **Luisana demuestra skills de** MLOps, separación online/offline de features e ingeniería de ML productiva.'
      : '**Feature Store / MLOps** is a feature platform with Feast, split into two paths:\n\n• **Online** → Redis for low-latency serving at inference time\n• **Offline** → DuckDB to build training datasets\n\nIt closes the end-to-end loop with an ML model in production.\n\nWith this project **Luisana demonstrates skills in** MLOps, online/offline feature separation, and production ML engineering.';
  }

  if (/data quality|great expectations|openlineage|contrat|contract/.test(text)) {
    return es
      ? '**Data Quality** ✅ es una plataforma basada en contratos en YAML, donde el schema esperado y las reglas viven como código. Great Expectations valida, OpenLineage trackea el linaje cross-pipeline, y las violaciones se notifican a Slack.\n\nCon este proyecto **Luisana demuestra skills de** contratos de datos, observabilidad, testing de pipelines y governance.'
      : '**Data Quality** ✅ is a platform based on YAML contracts, where the expected schema and rules live as code. Great Expectations validates, OpenLineage tracks cross-pipeline lineage, and violations get reported to Slack.\n\nWith this project **Luisana demonstrates skills in** data contracts, observability, pipeline testing, and governance.';
  }

  // --- Arquitecturas ---

  if (/arquitectura|architecture|patron|pattern/.test(text)) {
    return es
      ? 'Las arquitecturas que aparecen en los proyectos:\n\n• **Medallion** (bronze → silver → gold) → Lakehouse\n• **Kappa** (todo stream) → Fraude\n• **CDC** (Change Data Capture) → Debezium\n• **Online/Offline Feature Store** → MLOps\n• **Data Contracts + Lineage** → Data Quality\n\n¿Quieres que profundice en alguna?'
      : 'The architectures used across the projects:\n\n• **Medallion** (bronze → silver → gold) → Lakehouse\n• **Kappa** (all stream) → Fraud\n• **CDC** (Change Data Capture) → Debezium\n• **Online/Offline Feature Store** → MLOps\n• **Data Contracts + Lineage** → Data Quality\n\nWant me to go deeper on any?';
  }

  // --- Herramientas individuales (mapeo herramienta → proyecto + skill) ---

  if (/\bspark\b/.test(text)) {
    return es
      ? '**Apache Spark** vive en dos proyectos. En **Lakehouse Medallion** mueve los datos bronze → silver → gold con procesamiento distribuido, y en **Feature Store** construye las features offline.\n\nSkill: computación distribuida y procesamiento batch a escala.'
      : '**Apache Spark** lives in two projects. In **Lakehouse Medallion** it moves data bronze → silver → gold with distributed processing, and in **Feature Store** it builds the offline features.\n\nSkill: distributed computing and batch processing at scale.';
  }

  if (/\bdbt\b/.test(text)) {
    return es
      ? '**dbt** está en el **Lakehouse Medallion** gestionando las transformaciones SQL entre capas (bronze → silver → gold) con versionado, tests y documentación generada automáticamente.\n\nSkill: modelado analítico, testing de modelos y DataOps.'
      : '**dbt** lives in **Lakehouse Medallion** managing SQL transformations between layers (bronze → silver → gold) with versioning, tests, and auto-generated docs.\n\nSkill: analytical modeling, model testing, and DataOps.';
  }

  if (/airflow/.test(text)) {
    return es
      ? '**Apache Airflow** orquesta los DAGs del **Lakehouse Medallion** (ingestas, transformaciones y validaciones de calidad) con scheduling, dependencias temporales y retries.\n\nSkill: orquestación de pipelines de datos.'
      : '**Apache Airflow** orchestrates **Lakehouse Medallion** DAGs (ingestion, transformations, and quality checks) with scheduling, temporal dependencies, and retries.\n\nSkill: data pipeline orchestration.';
  }

  if (/kafka/.test(text)) {
    return es
      ? '**Apache Kafka** es la columna vertebral del streaming en el portafolio. Aparece en dos proyectos:\n\n• En **CDC con Debezium** → publica los cambios capturados desde Postgres\n• En **Kappa / Fraude** → bus de eventos que alimenta a Flink\n\nSkill: arquitectura event-driven, particionamiento y procesamiento en tiempo real.'
      : '**Apache Kafka** is the streaming backbone of the portfolio. It shows up in two projects:\n\n• In **CDC with Debezium** → publishes changes captured from Postgres\n• In **Kappa / Fraud** → event bus feeding Flink\n\nSkill: event-driven architecture, partitioning, and real-time processing.';
  }

  if (/trino|presto/.test(text)) {
    return es
      ? '**Trino** es el query engine del **Lakehouse Medallion**, con SQL federado sobre los datos almacenados en MinIO.\n\nSkill: federación de queries, optimización de planes distribuidos y arquitectura de lakehouse.'
      : '**Trino** is the query engine of **Lakehouse Medallion**, with federated SQL over the data stored in MinIO.\n\nSkill: query federation, distributed plan optimization, and lakehouse architecture.';
  }

  if (/flink/.test(text)) {
    return es
      ? '**Apache Flink** procesa los streams de **Kappa / Fraude** en tiempo real, manejando watermarks y eventos tardíos.\n\nSkill: stream processing avanzado, diferenciación entre event-time y processing-time, y estado distribuido.'
      : '**Apache Flink** processes the **Kappa / Fraud** streams in real-time, handling watermarks and late events.\n\nSkill: advanced stream processing, event-time vs processing-time distinction, and distributed state.';
  }

  if (/iceberg|delta|hudi|table format/.test(text)) {
    return es
      ? '**Apache Iceberg** es el table format de **Kappa / Fraude**: storage transaccional con soporte de time travel y schema evolution.\n\nSkill: formatos modernos de tabla para data lakes y transacciones ACID sobre object storage.'
      : '**Apache Iceberg** is the table format in **Kappa / Fraud**: transactional storage with time travel and schema evolution support.\n\nSkill: modern table formats for data lakes and ACID transactions over object storage.';
  }

  if (/debezium/.test(text)) {
    return es
      ? '**Debezium** está en el proyecto **CDC**. Lee el WAL de Postgres directamente y publica los cambios row-level en Kafka.\n\nSkill: CDC, replicación log-based y semánticas exactly-once.'
      : '**Debezium** lives in the **CDC** project. It reads the Postgres WAL directly and publishes row-level changes to Kafka.\n\nSkill: CDC, log-based replication, and exactly-once semantics.';
  }

  if (/clickhouse/.test(text)) {
    return es
      ? '**ClickHouse** es el sink del proyecto **CDC**: base columnar OLAP que recibe los eventos capturados desde Postgres y los expone para queries analíticas de muy baja latencia.\n\nSkill: OLAP analytics y arquitectura híbrida OLTP → OLAP.'
      : '**ClickHouse** is the sink of the **CDC** project: columnar OLAP database that receives events captured from Postgres and exposes them for very low-latency analytical queries.\n\nSkill: OLAP analytics and hybrid OLTP → OLAP architecture.';
  }

  if (/minio/.test(text)) {
    return es
      ? '**MinIO** es el object storage compatible con S3 del **Lakehouse Medallion**. Guarda las capas bronze, silver y gold como archivos Parquet.\n\nSkill: arquitectura de data lake y object storage S3-compatible.'
      : '**MinIO** is the S3-compatible object storage in **Lakehouse Medallion**. It holds the bronze, silver, and gold layers as Parquet files.\n\nSkill: data lake architecture and S3-compatible object storage.';
  }

  if (/feast/.test(text)) {
    return es
      ? '**Feast** es el feature store del proyecto **MLOps**. Registra las definiciones de features con SQL y las sirve por dos caminos:\n\n• **Online** → Redis (baja latencia en inferencia)\n• **Offline** → DuckDB (training)\n\nSkill: MLOps, feature registry y serving de baja latencia.'
      : '**Feast** is the feature store in the **MLOps** project. It registers feature definitions with SQL and serves them through two paths:\n\n• **Online** → Redis (low-latency inference)\n• **Offline** → DuckDB (training)\n\nSkill: MLOps, feature registry, and low-latency serving.';
  }

  if (/duckdb/.test(text)) {
    return es
      ? '**DuckDB** es el storage offline del feature store en **MLOps**, donde se construyen los datasets de training. Es como un SQLite pero analítico, pensado para workloads OLAP embebidos.\n\nSkill: bases columnar embebidas y workflows de ML.'
      : '**DuckDB** is the offline storage of the feature store in **MLOps**, where training datasets are built. Like SQLite but analytical, designed for embedded OLAP workloads.\n\nSkill: embedded columnar databases and ML workflows.';
  }

  if (/\bredis\b/.test(text)) {
    return es
      ? '**Redis** tiene dos roles en el portafolio:\n\n• En **MLOps** → serving online de features (baja latencia en inferencia)\n• En **Kappa / Fraude** → state store para procesamiento de streams\n\nSkill: bases in-memory y arquitectura de baja latencia.'
      : '**Redis** plays two roles in the portfolio:\n\n• In **MLOps** → online feature serving (low-latency inference)\n• In **Kappa / Fraud** → state store for stream processing\n\nSkill: in-memory databases and low-latency architecture.';
  }

  if (/great expectations/.test(text)) {
    return es
      ? '**Great Expectations** está en el proyecto **Data Quality**. Valida schemas, reglas de negocio y detecta drift en los datos.\n\nSkill: testing de datos, contratos y observabilidad.'
      : '**Great Expectations** is in the **Data Quality** project. It validates schemas, business rules, and detects data drift.\n\nSkill: data testing, contracts, and observability.';
  }

  if (/openlineage/.test(text)) {
    return es
      ? '**OpenLineage** se usa en **Data Quality** para hacer tracking del linaje de los datos a través de los pipelines, dando visibilidad cross-proyecto de cómo fluye la información.\n\nSkill: observabilidad y governance de pipelines.'
      : '**OpenLineage** is used in **Data Quality** to track data lineage across pipelines, giving cross-project visibility into how information flows.\n\nSkill: observability and pipeline governance.';
  }

  if (/docker|compose|container/.test(text)) {
    return es
      ? '**Docker Compose** está en todos los proyectos como infraestructura local reproducible. Algunos ejemplos:\n\n• Lakehouse → Spark + MinIO + Airflow + Trino\n• CDC → Postgres + Debezium + Kafka + ClickHouse\n• Kappa → Kafka + Flink + Iceberg + Redis\n\nSkill: containerización, DevOps y reproducibilidad de entornos.'
      : '**Docker Compose** is in every project as reproducible local infrastructure. Some examples:\n\n• Lakehouse → Spark + MinIO + Airflow + Trino\n• CDC → Postgres + Debezium + Kafka + ClickHouse\n• Kappa → Kafka + Flink + Iceberg + Redis\n\nSkill: containerization, DevOps, and environment reproducibility.';
  }

  // --- Stack global + skills ---

  if (/tecnolog|stack|tech|tools|herramient/.test(text)) {
    return es
      ? 'El stack que cubre el portafolio, agrupado por uso:\n\n• **Base** → Python, SQL\n• **Lakehouse** → Spark, dbt, Airflow, Trino, MinIO\n• **CDC** → Postgres, Debezium, Kafka, ClickHouse\n• **Streaming** → Flink, Iceberg\n• **MLOps** → Redis, Feast, DuckDB\n• **Calidad y linaje** → Great Expectations, OpenLineage\n• **Infra** → Docker Compose\n• **Frontend del sitio** → React, TypeScript, Vite, Tailwind, Lottie\n\n¿Te interesa alguna en particular?'
      : 'The stack the portfolio covers, grouped by use:\n\n• **Base** → Python, SQL\n• **Lakehouse** → Spark, dbt, Airflow, Trino, MinIO\n• **CDC** → Postgres, Debezium, Kafka, ClickHouse\n• **Streaming** → Flink, Iceberg\n• **MLOps** → Redis, Feast, DuckDB\n• **Quality and lineage** → Great Expectations, OpenLineage\n• **Infra** → Docker Compose\n• **Site frontend** → React, TypeScript, Vite, Tailwind, Lottie\n\nAny one in particular interests you?';
  }

  if (/skill|habilidad|capacidad|qu[eé] sabe|s[eé] hacer|experiencia|experience/.test(text)) {
    return es
      ? 'Con su portafolio **Luisana demuestra skills de**:\n\n• **Ingeniería de datos** → lakehouse, CDC, streaming, calidad, feature stores\n• **Arquitectura de datos** → medallion, kappa, event-driven\n• **MLOps** → feature stores, serving online/offline\n• **Stream processing** → Flink, Kafka, watermarks\n• **Data quality & governance** → contratos, lineage\n• **DevOps** → Docker Compose, infraestructura reproducible\n• **Frontend** → React, TypeScript, Vite, Tailwind (este mismo portafolio)\n\nUn perfil bastante full-stack del mundo de los datos. ✨'
      : 'With her portfolio **Luisana demonstrates skills in**:\n\n• **Data engineering** → lakehouse, CDC, streaming, quality, feature stores\n• **Data architecture** → medallion, kappa, event-driven\n• **MLOps** → feature stores, online/offline serving\n• **Stream processing** → Flink, Kafka, watermarks\n• **Data quality & governance** → contracts, lineage\n• **DevOps** → Docker Compose, reproducible infrastructure\n• **Frontend** → React, TypeScript, Vite, Tailwind (this very portfolio)\n\nA pretty full-stack data profile. ✨';
  }

  // --- Navegación: dónde está cada cosa ---

  if (/d[oó]nde|where|c[oó]mo encuentro|how do i find|navegar|navigate/.test(text)) {
    return es
      ? 'Pequeña guía rápida:\n\n• Las **seis carpetas** del centro son las categorías. Pasa el cursor o tócalas → se abre el abanico con los proyectos.\n• Click en una **card de proyecto** → modal con la imagen y el botón "Ver Proyecto".\n• Ese botón lleva al detalle, donde hay seis secciones: Diagramas, Documentación, README+Stack, Enlaces, Blog/Video y Cambios recientes.\n• Para el currículum → botón **CV** arriba a la izquierda.\n• Para la música → botón de nota musical en el header.'
      : 'Quick tour:\n\n• The **six folders** in the center are the categories. Hover or tap them → fan opens with the projects.\n• Click a **project card** → modal with the image and "View Project" button.\n• That button leads to the detail, with six sections: Diagrams, Documentation, README+Stack, Links, Blog/Video, and Recent updates.\n• For the resume → **CV** button at the top-left.\n• For music → musical note button in the header.';
  }

  // --- Funciones del sitio ---

  if (/cv|curriculum|resume|hoja de vida/.test(text)) {
    return es
      ? 'Para descargar el CV solo hay que tocar el botón **"CV"** 📄 arriba a la izquierda del header. Un clic y listo.'
      : 'To download the CV just tap the **"CV"** 📄 button at the top-left of the header. One click and done.';
  }

  if (/m[uú]sica|jazz|music|sonido|sound/.test(text)) {
    return es
      ? 'Hay jazz suave de fondo 🎷. El botón con la nota musical en el header lo activa o pausa, y el slider de volumen al lado lo ajusta. Las notitas naranjas flotando son la señal visual de que está sonando.'
      : 'There\'s soft jazz playing in the background 🎷. The musical note button in the header toggles it on or off, and the volume slider next to it adjusts the level. The floating orange notes are the visual cue that it\'s playing.';
  }

  if (/idioma|language|ingl[eé]s|espa[ñn]ol|english|spanish/.test(text)) {
    return es
      ? 'El botón con la bandera arriba a la derecha cambia entre 🇪🇸 español → 🇺🇸 inglés. Yo también respondo en el idioma activo, así que puedes probarlo cuando quieras.'
      : 'The flag button at the top-right switches between 🇪🇸 Spanish → 🇺🇸 English. I also respond in the active language, so you can try it whenever you want.';
  }

  if (/tema|theme|oscuro|claro|dark|light/.test(text)) {
    return es
      ? 'El portafolio tiene modo claro y oscuro. El botón ☀️ / 🌙 al final del header cambia entre los dos, y al cargar detecta automáticamente tu preferencia del sistema.'
      : 'The portfolio has light and dark modes. The ☀️ / 🌙 button at the end of the header switches between them, and on load it automatically detects your system preference.';
  }

  if (/cambio|change|update|commit|reciente|recent|historia|history/.test(text)) {
    return es
      ? 'Cada proyecto tiene una sección llamada **"Cambios recientes"** que muestra los últimos avances en lenguaje natural. Al entrar al detalle del proyecto está en la tarjeta rosa de abajo a la derecha del grid.'
      : 'Every project has a section called **"Recent updates"** showing the latest progress in natural language. Once you\'re in the project detail it\'s the pink card at the bottom-right of the grid.';
  }

  // --- Ayuda / acerca de ---

  if (/qu[eé] puede|qu[eé] sabe|help|ayuda|what can|how/.test(text)) {
    return es
      ? 'Te puedo ayudar con:\n\n• **Proyectos** → qué hay y qué resuelven\n• **Arquitectura** → patrones como medallion, kappa, CDC\n• **Stack** → todas las tecnologías\n• **Skills** → habilidades que demuestra el portafolio\n• Una **herramienta específica** → Spark, Kafka, dbt, Flink, Trino, Airflow, Feast...\n• Un **proyecto puntual** → Lakehouse, CDC, Kappa, Data Quality, Feature Store\n• **Dónde** encontrar cada cosa en la navegación\n\nTú me dices.'
      : 'I can help with:\n\n• **Projects** → what\'s there and what they solve\n• **Architecture** → patterns like medallion, kappa, CDC\n• **Stack** → all the technologies\n• **Skills** → abilities the portfolio demonstrates\n• A **specific tool** → Spark, Kafka, dbt, Flink, Trino, Airflow, Feast...\n• A **specific project** → Lakehouse, CDC, Kappa, Data Quality, Feature Store\n• **Where** to find each thing in the navigation\n\nUp to you.';
  }

  if (/gracias|thanks|thank you|thx/.test(text)) {
    return es
      ? 'Un placer. Si necesitas algo más, aquí estoy.'
      : 'My pleasure. If you need anything else, I\'m here.';
  }

  // Default: respuesta genérica
  return es
    ? 'No estoy segura de entender bien la pregunta. Puedes preguntarme por los proyectos, la arquitectura, el stack, las skills, o por una herramienta específica como Spark, Kafka o Airflow. También te puedo orientar sobre dónde encontrar algo dentro del portafolio.'
    : 'I\'m not sure I caught the question. You can ask about the projects, the architecture, the stack, the skills, or a specific tool like Spark, Kafka, or Airflow. I can also help you locate something inside the portfolio.';
}

/** Error tipado para diferenciar rate limit vs error genérico en el handler UI. */
class ChatError extends Error {
  constructor(public kind: 'rate_limit' | 'generic') {
    super(kind);
  }
}

async function sendMessage(text: string, language: Language): Promise<string> {
  const apiUrl = import.meta.env.VITE_CHAT_API_URL;
  // Dev local sin worker: cae al mock (mismo comportamiento pre-Fase 1)
  if (!apiUrl) {
    const delay = 600 + Math.random() * 600;
    await new Promise((r) => setTimeout(r, delay));
    return getMockResponse(text, language);
  }
  const res = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: text, language }),
  });
  if (res.status === 429) throw new ChatError('rate_limit');
  if (!res.ok) throw new ChatError('generic');
  const data = (await res.json()) as { reply?: string };
  if (!data.reply) throw new ChatError('generic');
  return data.reply;
}

// --- UI ---

export const PortfolioChat: React.FC = () => {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message: se inserta cuando el chat se abre por primera vez
  // o cuando cambia el idioma (resetea el saludo en el nuevo idioma).
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: 'welcome', role: 'bot', text: t('chat.welcome') }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, language]);

  // Auto-scroll al final cuando llega un mensaje nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus al input al abrir
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // ESC cierra el panel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const doSend = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isTyping) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setIsTyping(true);
    playSound('pop');
    try {
      const reply = await sendMessage(text, language);
      setMessages((m) => [...m, { id: `b-${Date.now()}`, role: 'bot', text: reply }]);
    } catch (err) {
      const errorKey: TranslationKey =
        err instanceof ChatError && err.kind === 'rate_limit'
          ? 'chat.error.rateLimit'
          : 'chat.error.generic';
      setMessages((m) => [
        ...m,
        { id: `b-err-${Date.now()}`, role: 'bot', text: t(errorKey) },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendClick = () => doSend(input);
  const handleSuggestionClick = (key: TranslationKey) => doSend(t(key));

  const showSuggestions = isOpen && messages.length <= 1;

  return (
    <>
      {/* Trigger flotante (solo cuando está cerrado) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            playSound('pop');
            setIsOpen(true);
          }}
          aria-label={t('chat.open')}
          className={cn(
            'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40',
            'w-12 h-12 sm:w-14 sm:h-14 rounded-full',
            'flex items-center justify-center text-white',
            'shadow-2xl shadow-accent/40',
            'transition-all duration-300 hover:scale-110 active:scale-95',
            'animate-in fade-in zoom-in-95 duration-300',
          )}
          style={{ background: ACCENT_GRADIENT }}
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
        </button>
      )}

      {/* Panel del chat */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden',
            // Mobile: ocupa casi toda la pantalla (deja el header visible)
            'inset-x-4 bottom-4 top-20',
            // Desktop: bottom-right corner con tamaño fijo
            'sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-[380px] sm:h-[580px]',
            'animate-in fade-in slide-in-from-bottom-4 duration-300',
          )}
          role="dialog"
          aria-label={t('chat.title')}
        >
          {/* Header del chat */}
          <header className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-border bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: ACCENT_GRADIENT }}
              >
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{t('chat.title')}</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                  {t('chat.disclaimer')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t('chat.close')}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </header>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} text={m.text} />
            ))}
            {isTyping && <TypingIndicator />}

            {/* Sugerencias clickeables */}
            {showSuggestions && !isTyping && (
              <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-300">
                {(['chat.suggestion1', 'chat.suggestion2', 'chat.suggestion3'] as TranslationKey[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSuggestionClick(key)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-card border border-accent/40 text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
                    >
                      {t(key)}
                    </button>
                  ),
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <footer className="border-t border-border p-3 bg-card flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendClick();
                }
              }}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-colors"
            />
            <button
              type="button"
              onClick={handleSendClick}
              disabled={!input.trim() || isTyping}
              aria-label={t('chat.send')}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md transition-all flex-shrink-0',
                'hover:scale-105 active:scale-95',
                'disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed',
              )}
              style={{ background: ACCENT_GRADIENT }}
            >
              <Send className="w-4 h-4" />
            </button>
          </footer>
        </div>
      )}
    </>
  );
};

// --- Sub-componentes ---

/**
 * Mini-parser para resaltar `**texto**` como negritas dentro de los mensajes.
 * Mantiene los saltos de línea y los emojis como están.
 */
function renderRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const MessageBubble: React.FC<{ role: 'user' | 'bot'; text: string }> = ({ role, text }) => (
  <div
    className={cn(
      'flex animate-in fade-in slide-in-from-bottom-2 duration-300',
      role === 'user' ? 'justify-end' : 'justify-start',
    )}
  >
    <div
      className={cn(
        'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
        role === 'user'
          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
          : 'bg-card border border-border text-foreground rounded-2xl rounded-bl-md shadow-sm',
      )}
    >
      {renderRichText(text)}
    </div>
  </div>
);

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start animate-in fade-in duration-200">
    <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"
          style={{ animationDelay: '200ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"
          style={{ animationDelay: '400ms' }}
        />
      </div>
    </div>
  </div>
);
