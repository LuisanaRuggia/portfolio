/**
 * Respuestas canónicas para preguntas frecuentes — saltea el LLM cuando hay match.
 *
 * Match es por keyword/frase insensible a mayúsculas y tildes. Patrones más
 * específicos van primero (Lakehouse > "proyectos"). Si nada matchea, el
 * caller llama al LLM como fallback.
 *
 * Mantener cada respuesta en español neutro, primera persona, 1-3 oraciones.
 * Si una respuesta cambia, también actualizar el system prompt para que el
 * LLM sea coherente con lo canónico cuando le toca generar variaciones.
 */

type Language = 'es' | 'en';

interface CannedRule {
  /** Identificador legible para logs/telemetría. */
  id: string;
  /** Lista de palabras o frases (lowercased, sin tildes) que disparan este match. Cualquiera basta. */
  triggers: string[];
  /** Respuesta canónica por idioma. */
  reply: { es: string; en: string };
}

/** Normaliza un texto: lowercase, sin tildes, sin signos de puntuación raros. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip tildes
    .replace(/[¿?¡!.,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reglas en orden de prioridad — la PRIMERA que matchee gana.
 * Por eso los proyectos específicos van antes que "qué proyectos hay".
 */
const RULES: CannedRule[] = [
  // --- Saludos ---
  {
    id: 'greeting',
    triggers: ['hola', 'buenas', 'hi', 'hello', 'hey', 'que tal', 'how are you'],
    reply: {
      es: '¡Hola! Soy Luisana. ¿Sobre qué proyecto del portafolio quieres saber?',
      en: 'Hi! I\'m Luisana. Which portfolio project do you want to know about?',
    },
  },

  // --- Despedidas / agradecimientos ---
  {
    id: 'thanks',
    triggers: ['gracias', 'thanks', 'thank you', 'chao', 'bye', 'adios'],
    reply: {
      es: '¡Con gusto! Si quieres profundizar en algún proyecto, vuelve cuando quieras.',
      en: 'Glad to help! Come back any time if you want to dig into a project.',
    },
  },

  // --- Estudios / carrera ---
  {
    id: 'studies',
    triggers: [
      'que estudias',
      'que estas estudiando',
      'tu carrera',
      'que carrera',
      'donde estudias',
      'en que universidad',
      'que universidad',
      'what do you study',
      'your degree',
      'your major',
      'where do you study',
      'which university',
      'what university',
    ],
    reply: {
      es: 'Estudio Ingeniería en Ciencia de Datos en el Politécnico Grancolombiano. Los proyectos que están aquí son personales; los académicos de análisis y dashboards aún no los he subido.',
      en: 'I study Data Science Engineering at Politécnico Grancolombiano. The projects published here are personal; my academic ones on analytics and dashboards aren\'t uploaded yet.',
    },
  },

  // --- Trabajo actual ---
  {
    id: 'work',
    triggers: [
      'donde trabajas',
      'en que trabajas',
      'donde estas trabajando',
      'tu trabajo',
      'tu empresa',
      'where do you work',
      'your job',
      'your company',
      'where are you working',
      'what company',
    ],
    reply: {
      es: 'Actualmente trabajo en Paynet en Bogotá como Analista Junior de Datos.',
      en: 'I currently work at Paynet in Bogotá as a Junior Data Analyst.',
    },
  },

  // --- Ubicación ---
  {
    id: 'location',
    triggers: [
      'donde vives',
      'donde estas',
      'tu ubicacion',
      'de donde eres',
      'en que ciudad',
      'que pais',
      'que ciudad',
      'where do you live',
      'where are you',
      'your location',
      'which city',
      'which country',
    ],
    reply: {
      es: 'Vivo en Bogotá, Colombia.',
      en: 'I live in Bogotá, Colombia.',
    },
  },

  // --- Stack/tecnologías general ---
  {
    id: 'stack',
    triggers: [
      'que tecnologias',
      'que stack',
      'que herramientas',
      'en que trabajas',
      'what tech',
      'what stack',
      'what tools',
      'what do you work with',
    ],
    reply: {
      es: 'Trabajo sobre todo en ingeniería de datos (Spark, dbt, Kafka, Airflow), ML con Feast, y BI con Power BI y Superset. Si quieres detalle de un proyecto en particular, pregúntame.',
      en: 'Mostly data engineering (Spark, dbt, Kafka, Airflow), ML with Feast, and BI with Power BI and Superset. Ask me about a specific project if you want detail.',
    },
  },

  // --- Lista de proyectos ---
  {
    id: 'projects-list',
    triggers: [
      'que proyectos',
      'cuales proyectos',
      'tus proyectos',
      'what projects',
      'which projects',
      'your projects',
    ],
    reply: {
      es: 'Tengo varios proyectos de datos: Lakehouse Medallion, CDC con Debezium, Kappa para fraude en streaming, Data Quality, y un Feature Store/MLOps. Más este mismo portafolio. Pregúntame por cualquiera.',
      en: 'I have several data projects: Lakehouse Medallion, CDC with Debezium, Kappa for streaming fraud detection, Data Quality, and a Feature Store/MLOps. Plus this portfolio itself. Ask me about any of them.',
    },
  },

  // --- Proyectos específicos (descripción corta) ---
  {
    id: 'project-lakehouse',
    triggers: ['lakehouse', 'medallion', 'bronze silver gold', 'minio'],
    reply: {
      es: 'El Lakehouse Medallion es un lakehouse local con capas bronze/silver/gold sobre MinIO, orquestado con Airflow. Uso Spark + dbt para las transformaciones y Trino para consultas federadas.',
      en: 'The Lakehouse Medallion is a local lakehouse with bronze/silver/gold layers on MinIO, orchestrated by Airflow. I use Spark + dbt for transformations and Trino for federated queries.',
    },
  },
  {
    id: 'project-cdc',
    triggers: ['cdc', 'debezium', 'change data capture'],
    reply: {
      es: 'En el proyecto de CDC capturo cambios en tiempo real desde Postgres con Debezium + Kafka y aterrizo en ClickHouse. El foco es el snapshot inicial y la garantía exactly-once.',
      en: 'In the CDC project I capture real-time changes from Postgres with Debezium + Kafka and land them in ClickHouse. The focus is initial snapshot and exactly-once guarantees.',
    },
  },
  {
    id: 'project-kappa',
    triggers: ['kappa', 'fraude', 'fraud', 'streaming fraud', 'flink'],
    reply: {
      es: 'Es un pipeline Kappa para detección de fraude en streaming: Kafka + Flink + Iceberg + Redis. Manejo watermarks y datos tardíos para no perder eventos.',
      en: 'It\'s a Kappa pipeline for streaming fraud detection: Kafka + Flink + Iceberg + Redis. I handle watermarks and late-arriving data to avoid losing events.',
    },
  },
  {
    id: 'project-dq',
    triggers: ['data quality', 'calidad de datos', 'great expectations', 'openlineage'],
    reply: {
      es: 'En Data Quality escribí contratos de datos en YAML + Great Expectations para validación, y OpenLineage para trazabilidad. Si algo se rompe, manda alerta a Slack.',
      en: 'In Data Quality I wrote YAML data contracts + Great Expectations for validation, plus OpenLineage for lineage. If something breaks, it alerts Slack.',
    },
  },
  {
    id: 'project-feast',
    triggers: ['feature store', 'feast', 'mlops'],
    reply: {
      es: 'Es una plataforma de features con Feast (Redis online + DuckDB offline) que cierra el ciclo end-to-end con un modelo de ML en producción.',
      en: 'It\'s a feature platform with Feast (Redis online + DuckDB offline) that closes the end-to-end loop with an ML model in production.',
    },
  },
  {
    id: 'project-portfolio',
    // Triggers ESPECÍFICOS al CASO B (preguntan por el stack/cómo está hecho
    // el sitio mismo). Antes el trigger era solo "portafolio" y atrapaba
    // CUALQUIER pregunta con esa palabra, incluyendo "qué hay en tu
    // portafolio?" que debe ir al LLM con la lista de proyectos.
    triggers: [
      'cuéntame del portafolio',
      'cuentame del portafolio',
      'háblame del portafolio',
      'hablame del portafolio',
      'cómo está hecho el portafolio',
      'como esta hecho el portafolio',
      'cómo construiste el portafolio',
      'como construiste el portafolio',
      'stack del portafolio',
      'este sitio',
      'this site',
      'how is the portfolio built',
      'how did you build the portfolio',
      'tell me about the portfolio',
    ],
    reply: {
      es: 'Este portafolio es React + TypeScript + Vite + Tailwind, con animaciones 3D, grafos conceptuales y chat asistente con LLM. Backend en Cloudflare Workers + Groq (Llama) para el chat.',
      en: 'This portfolio is React + TypeScript + Vite + Tailwind, with 3D animations, concept graphs and an LLM chat assistant. Backend on Cloudflare Workers + Groq for the chat.',
    },
  },
];

/**
 * Marcadores de "pregunta profunda" — si el mensaje los contiene, NO canned.
 * Estas preguntas merecen una respuesta generada por el LLM con contexto vivo.
 * Ejemplo: "qué es Lakehouse?" → canned. "Por qué elegiste Lakehouse?" → LLM.
 */
const DEEP_QUESTION_MARKERS = [
  // ES
  'por que',
  'porque',
  'como funciona',
  'como lo',
  'como armaste',
  'como construiste',
  'que aprendiste',
  'que reto',
  'que dificultad',
  'lo mas dificil',
  'lo mas complejo',
  'explicame',
  'explica',
  'profundiza',
  'detalle',
  'compara',
  'diferencia',
  'ventaja',
  'desventaja',
  // EN
  'why',
  'how does',
  'how did you',
  'how do you',
  'what did you learn',
  'what challenge',
  'hardest part',
  'most difficult',
  'explain',
  'compare',
  'difference',
  'advantage',
  'disadvantage',
];

/**
 * Si el mensaje matchea alguna regla canónica, devuelve la respuesta hardcoded.
 * Sino, devuelve null (caller debe ir al LLM).
 *
 * Preguntas profundas (con marcadores de DEEP_QUESTION_MARKERS) siempre van al
 * LLM aunque contengan un trigger canned — porque merecen una respuesta única.
 */
export function tryCannedResponse(message: string, language: Language): string | null {
  const normalized = normalize(message);

  // Si es pregunta profunda, ir directo al LLM aunque mencione algo canned.
  for (const marker of DEEP_QUESTION_MARKERS) {
    if (normalized.includes(marker)) return null;
  }

  for (const rule of RULES) {
    for (const trigger of rule.triggers) {
      if (normalized.includes(trigger)) {
        return rule.reply[language];
      }
    }
  }
  return null;
}
