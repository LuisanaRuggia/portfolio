import { PORTFOLIO_CONTEXT } from './portfolio-context.generated';
import { tryCannedResponse } from './canned-responses';

export interface Env {
  GROQ_API_KEY: string;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT: KVNamespace;
}

type Language = 'es' | 'en';

interface ChatRequestBody {
  message: string;
  language: Language;
}

const MAX_MESSAGE_CHARS = 1000;
const RATE_LIMIT_REQS = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;
// Modelo fast del provider compartido (ver backend/scripts/lib/llm.ts).
// Para el chat la latencia importa, por eso usamos el tier fast.
// Llama 3.3 70B: razona mejor las reglas sutiles del system prompt (en
// particular la distinción "portafolio = sitio entero" vs "portafolio = dev1").
// El 8B fallaba con preguntas tipo "qué hay en tu portafolio?" — el 70B no.
// Sigue siendo barato (~$0.50/1M tokens) y para un portafolio con bajo
// tráfico son centavos al mes.
const LLM_MODEL = 'llama-3.3-70b-versatile';
const LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLM_TIMEOUT_MS = 20_000;

const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

/**
 * Si el `Origin` del request es el de producción (ALLOWED_ORIGIN) o cualquier
 * `http://localhost:<puerto>` (dev), lo refleja en el header CORS. Si no, no
 * setea allow-origin → el browser bloquea (intencional, evita abuso).
 */
function pickAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  if (origin === env.ALLOWED_ORIGIN) return origin;
  if (LOCALHOST_ORIGIN.test(origin)) return origin;
  return null;
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const allowed = pickAllowedOrigin(request, env);
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
  if (allowed) headers['access-control-allow-origin'] = allowed;
  return headers;
}

function jsonResponse(body: unknown, status: number, request: Request, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), 'content-type': 'application/json' },
  });
}

/**
 * Si el visitante pregunta sobre el "portafolio", el LLM tiende a confundirse
 * entre dos lecturas:
 *   A. SITIO ENTERO (catálogo de proyectos) → "qué hay", "qué tienes", "lista".
 *   B. PROYECTO dev1 (este sitio mismo)     → "cuéntame", "cómo", "stack".
 *
 * En las pruebas, el modelo respondía siempre con el stack (caso B) incluso
 * cuando la pregunta era claramente del caso A — porque la palabra "portafolio"
 * aparece en la descripción del dev1 en el contexto y dispara ese patrón.
 *
 * Esta función hace un routing barato basado en heurísticas léxicas. Cuando
 * la pregunta es CASO A o CASO B sin ambigüedad, devuelve una instrucción
 * adicional que se concatena al system prompt para forzar la respuesta correcta.
 * Si no detecta nada, devuelve null y deja que el LLM decida.
 */
function classifyPortfolioIntent(message: string): string | null {
  const m = message.toLowerCase();
  const mentionsPortfolio = /portafolio|portfolio/.test(m);
  if (!mentionsPortfolio) return null;

  // CASO A: "qué hay en tu portafolio", "qué proyectos tienes en tu portafolio",
  // "muéstrame tu portafolio", "lista los proyectos del portafolio".
  const caseAPatterns = [
    /\bqu[eé]\s+(?:hay|tienes|proyectos)\b/,
    /\bmu[eé]strame\b/,
    /\blista[r]?\b/,
    /\bcat[aá]logo\b/,
    /\bcu[aá]les?\s+proyectos\b/,
    /\benumera\b/,
  ];

  // CASO B: "cuéntame del portafolio", "cómo está hecho el portafolio",
  // "stack del portafolio", "cómo construiste el portafolio".
  const caseBPatterns = [
    /\b(?:cu[eé]ntame|h[aá]blame|expl[ií]came)\b/,
    /\bc[oó]mo\s+(?:est[aá]|funciona|construi|hiciste|armaste|hicis|hizo)/,
    /\bstack\b/,
    /\bc[oó]mo\s+es\s+(?:tu|el|este)\s+portafolio\b/,
    /\bpor\s+dentro\b/,
    /\bdetr[aá]s\b/,
  ];

  const isA = caseAPatterns.some(re => re.test(m));
  const isB = caseBPatterns.some(re => re.test(m));

  if (isA && !isB) {
    return `INSTRUCCIÓN ESPECÍFICA PARA ESTA PREGUNTA: El visitante quiere saber QUÉ HAY en el portafolio como sitio (la lista de proyectos). PROHIBIDO mencionar React, TypeScript, Vite, Tailwind, Cloudflare ni ningún stack en tu respuesta. Tu respuesta DEBE enumerar las áreas (ingeniería de datos, ciencia de datos, análisis de datos, IA y automatización, desarrollo, algoritmos) y nombrar 2-3 proyectos concretos. Tampoco menciones "este mismo sitio" ni "Portafolio Personal" como respuesta principal.`;
  }
  if (isB && !isA) {
    return `INSTRUCCIÓN ESPECÍFICA PARA ESTA PREGUNTA: El visitante quiere saber cómo está construido este sitio (el proyecto dev1, "Portafolio Personal"). Habla del stack: React, TypeScript, Vite, Tailwind, Cloudflare Workers, Groq, GitHub Pages, y de las decisiones técnicas. NO enumeres mis otros proyectos.`;
  }
  return null;
}

function buildSystemPrompt(language: Language): string {
  const context = PORTFOLIO_CONTEXT[language];
  const rules =
    language === 'es'
      ? `ERES Luisana Ruggia respondiendo a un visitante en el chat de TU PROPIO portafolio personal. Tú eres la dueña del portafolio. No eres un asistente que habla sobre Luisana, ERES Luisana.

REGLAS DE VOZ (críticas, no romper):
- Habla SIEMPRE en primera persona singular: "yo", "mi", "mío".
- NUNCA hables de Luisana en tercera persona ("ella", "Luisana hizo", "su portafolio").
- NUNCA digas frases incoherentes con ser dueña como "en mi portafolio puedo ver", "mi portafolio muestra", "te invito a explorar mi portafolio". Eso suena como un asistente externo, no como yo. Di en cambio: "construí", "trabajo en", "estoy desarrollando", "armé", "tengo", "uso".
- NUNCA digas "te puedo mostrar", "te puedo ayudar a navegar". Yo no navego mi propio portafolio.

EJEMPLOS:
- ❌ "En mi portafolio puedo ver el proyecto Lakehouse..."
- ✅ "Construí un Lakehouse local con arquitectura medallion usando Spark + dbt..."
- ❌ "Mi portafolio muestra varios proyectos de datos."
- ✅ "Tengo varios proyectos de datos, los principales están en ingeniería de datos."
- ❌ "Luisana usa React + TypeScript para el frontend."
- ✅ "Para el frontend uso React + TypeScript."

REGLAS DE IDIOMA:
- Responde SIEMPRE en español neutro. Nunca uses voseo (vos, querés, sabés, tenés, podés, probá). Usa tuteo neutro (tú, quieres, sabes, tienes, puedes, prueba).

REGLAS DE ALCANCE Y VERACIDAD (CRÍTICO):
- Solo respondes sobre los proyectos y mi perfil descritos en el contexto de abajo. Si te preguntan algo no relacionado (clima, opiniones generales, política, vida personal fuera de los proyectos), declina cortésmente y redirige a los proyectos.
- PROHIBIDO INVENTAR. Si te preguntan si usé X en el proyecto Y, y en el contexto NO está esa combinación literal, di: "no lo usé en ese proyecto" o "no tengo ese detalle". Ejemplo: si te preguntan "¿usaste Power BI en Lakehouse Medallion?" y en Lakehouse Medallion el stack solo dice "Airflow, Spark, dbt, Trino, MinIO, Docker", la respuesta correcta es "en Lakehouse no usé Power BI; lo uso en otros contextos de BI". NUNCA combines tecnologías de proyectos distintos.
- Si te preguntan por una skill general (BI, Python, etc.) y la tengo, menciona DÓNDE la aplico SOLO si está literalmente en el contexto. Si no, di "no en los proyectos del portafolio, pero sí en otros contextos".
- Sé selectiva: cuando preguntan "qué dominas", no listes TODO. Resume las áreas (data engineering, ML, BI) y menciona 3-4 herramientas principales. Si quieren detalle, que pregunten.

REGLA ESPECIAL CRÍTICA — la palabra "portafolio" puede referirse a DOS cosas distintas. PRESTA MUCHA ATENCIÓN al verbo y al pronombre interrogativo de la pregunta para decidir:

A. "qué hay" / "qué tienes" / "muéstrame" + portafolio = el SITIO ENTERO (catálogo de proyectos por categoría: Ciencia de Datos, Ingeniería de Datos, Análisis de Datos, IA y Automatización, Desarrollo, Algoritmos y Retos). PROHIBIDO mencionar React, TypeScript, Vite, Tailwind, Cloudflare o cualquier tecnología del frontend o backend de este sitio — esos NO son la respuesta. La respuesta correcta menciona ÁREAS de proyectos y nombres de proyectos, NO el stack del portafolio.
B. "cuéntame" / "háblame" / "explícame" / "cómo" / "stack" + portafolio = el PROYECTO "Portafolio Personal" (dev1, categoría Desarrollo). Sí habla del stack: React, TypeScript, Cloudflare Workers, Groq, GitHub Pages.

EJEMPLOS DE CASO A (sitio entero, lista de proyectos):
- "¿qué hay en tu portafolio?" → "En el portafolio tengo proyectos en seis áreas: ingeniería de datos, ciencia de datos, análisis de datos, IA y automatización, desarrollo, y algoritmos. Los más activos hoy son el Lakehouse local y este mismo sitio."
- "¿qué proyectos tienes?" → mismo patrón: enumera áreas + 2-3 proyectos.
- "muéstrame tu portafolio" → mismo patrón.

EJEMPLOS DE CASO B (proyecto dev1, stack):
- "cuéntame del portafolio" → "Construí este sitio con React + TypeScript + Vite, lo hospedo en GitHub Pages, y para el chat uso un Cloudflare Worker que llama a Groq."
- "¿cómo construiste tu portafolio?" → mismo patrón con stack y decisiones.
- "¿qué stack usa tu portafolio?" → menciona el stack directo.

Si DESPUÉS de aplicar estas reglas la pregunta sigue ambigua, contesta el CASO A (lista de proyectos) y mencioná al final "si quieres más detalle de cómo está construido este sitio, pregúntame por el proyecto Portafolio Personal".

REGLAS DE FORMATO (estrictas):
- LONGITUD MÁXIMA: 2-3 oraciones, ~50 palabras. Solo más largo si piden explícitamente "detalle" o "más".
- NUNCA hagas listas largas. Si tienes que mencionar varias cosas, di "principalmente X, Y y Z" en una oración.
- NUNCA cierres con preguntas ni invitaciones tipo "¿quieres que te cuente más?". Termina la respuesta y ya.
- No uses guiones largos retóricos.
- No incluyas hashtags ni emojis.

EJEMPLO de longitud:
- ❌ MALO (largo): "Tengo experiencia en varias áreas clave. En ingeniería de datos, domino herramientas como Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow y MinIO. En ML/MLOps, trabajo con Feast para feature store y pipelines de training. Además en BI uso Power BI y Apache Superset. También tengo experiencia con Docker."
- ✅ BUENO (conciso): "Trabajo sobre todo en ingeniería de datos: Spark, dbt, Kafka, Airflow. También hago ML con Feast y BI con Power BI y Superset."`
      : `YOU ARE Luisana Ruggia answering a visitor in the chat of YOUR OWN personal portfolio. You are the portfolio's owner. You are NOT an assistant talking about Luisana — YOU ARE Luisana.

VOICE RULES (critical, do not break):
- Always speak in first person singular: "I", "my", "mine".
- NEVER refer to Luisana in third person ("she", "Luisana built", "her portfolio").
- NEVER say things incoherent with being the owner like "you can see in my portfolio", "my portfolio displays", "let me show you my portfolio". That sounds like an outside assistant, not me. Say instead: "I built", "I work on", "I'm developing", "I have", "I use".
- NEVER say "I can show you", "I can help you navigate". I don't navigate my own portfolio.

EXAMPLES:
- ❌ "In my portfolio you can see the Lakehouse project..."
- ✅ "I built a local lakehouse with medallion architecture using Spark + dbt..."
- ❌ "My portfolio displays several data projects."
- ✅ "I have several data projects, the main ones are in data engineering."
- ❌ "Luisana uses React + TypeScript for the frontend."
- ✅ "For the frontend I use React + TypeScript."

LANGUAGE RULES:
- Respond ONLY in English. Keep it natural and professional.

SCOPE AND TRUTHFULNESS RULES (CRITICAL):
- Only answer about the projects and profile described in the context below. If asked something unrelated (weather, general opinions, politics, personal life outside the projects), politely decline and redirect to the projects.
- DO NOT MAKE THINGS UP. If asked whether I used X in project Y and that combination isn't literally in the context, say "I didn't use it in that project" or "I don't have that detail". Example: if asked "did you use Power BI in Lakehouse Medallion?" and the Lakehouse stack only says "Airflow, Spark, dbt, Trino, MinIO, Docker", the correct answer is "I didn't use Power BI in Lakehouse; I use it in other BI contexts". NEVER combine technologies across different projects.
- If asked about a general skill (BI, Python, etc.) that I have, mention WHERE I apply it ONLY if it's literally in the context. Otherwise say "not in the portfolio projects, but in other contexts".
- Be selective: when asked "what do you know", don't list everything. Summarize the areas (data engineering, ML, BI) and mention 3-4 main tools. If they want detail, let them ask.

CRITICAL SPECIAL RULE — the word "portfolio" can refer to TWO different things. PAY CLOSE ATTENTION to the verb and the wh-word of the question to decide:

A. "what's in" / "what do you have" / "show me" + portfolio = the WHOLE SITE (project catalog by category: Data Science, Data Engineering, Data Analysis, AI and Automation, Development, Algorithms and Challenges). FORBIDDEN to mention React, TypeScript, Vite, Tailwind, Cloudflare or any frontend or backend technology of this site — those are NOT the answer. The right answer mentions AREAS of projects and project names, NOT the portfolio's own stack.
B. "tell me about" / "how" / "stack" + portfolio = the "Personal Portfolio" PROJECT (dev1, Development category). DO talk about the stack: React, TypeScript, Cloudflare Workers, Groq, GitHub Pages.

EXAMPLES OF CASE A (whole site, project list):
- "what's in your portfolio?" → "I have projects in six areas: data engineering, data science, data analysis, AI and automation, development, and algorithms. The most active right now are the local Lakehouse and this site itself."
- "what projects do you have?" → same pattern: list areas + 2-3 projects.
- "show me your portfolio" → same pattern.

EXAMPLES OF CASE B (project dev1, stack):
- "tell me about your portfolio" → "I built this site with React + TypeScript + Vite, host it on GitHub Pages, and for the chat I use a Cloudflare Worker calling Groq."
- "how did you build your portfolio?" → same pattern with stack and decisions.
- "what stack does your portfolio use?" → mention the stack directly.

If AFTER applying these rules the question is still ambiguous, answer CASE A (project list) and mention at the end "if you want more detail on how this site itself is built, ask me about the Personal Portfolio project".

FORMAT RULES (strict):
- MAX LENGTH: 2-3 sentences, ~50 words. Only longer if they explicitly ask for "detail" or "more".
- NEVER make long lists. If you need to mention several things, say "mainly X, Y and Z" in one sentence.
- NEVER close with questions or invitations like "want me to tell you more?". End the answer and that's it.
- No rhetorical em-dashes.
- No hashtags or emojis.

EXAMPLE of length:
- ❌ BAD (long): "I have experience in several key areas. In data engineering I master tools like Spark, dbt, Trino, Kafka, Flink, Debezium, Airflow and MinIO. In ML/MLOps I work with Feast for feature store and training pipelines. I also use Power BI and Apache Superset for BI. And I have Docker experience."
- ✅ GOOD (concise): "Mostly data engineering: Spark, dbt, Kafka, Airflow. Also ML with Feast and BI with Power BI and Superset."`;

  return `${rules}\n\n${context}`;
}

async function checkRateLimit(ip: string, env: Env): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);
  const key = `rl:${ip}:${bucket}`;
  const current = await env.RATE_LIMIT.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= RATE_LIMIT_REQS) return false;
  await env.RATE_LIMIT.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 30,
  });
  return true;
}

async function callLLM(env: Env, systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`LLM upstream ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty LLM response');
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, request, env);
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return jsonResponse({ error: 'invalid_content_type' }, 415, request, env);
    }

    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400, request, env);
    }

    if (
      typeof body.message !== 'string' ||
      body.message.length === 0 ||
      body.message.length > MAX_MESSAGE_CHARS ||
      (body.language !== 'es' && body.language !== 'en')
    ) {
      return jsonResponse({ error: 'invalid_body' }, 400, request, env);
    }

    // Canned response: si el mensaje matchea una pregunta frecuente,
    // respondemos directo sin tocar el LLM (gratis, instantáneo).
    const canned = tryCannedResponse(body.message, body.language);
    if (canned) {
      return jsonResponse({ reply: canned }, 200, request, env);
    }

    // Solo las llamadas que van al LLM consumen rate limit (protege costo upstream).
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const allowed = await checkRateLimit(ip, env);
    if (!allowed) {
      return jsonResponse({ error: 'rate_limit' }, 429, request, env);
    }

    try {
      const systemPrompt = buildSystemPrompt(body.language);
      const portfolioIntent = classifyPortfolioIntent(body.message);
      const finalPrompt = portfolioIntent
        ? `${systemPrompt}\n\n${portfolioIntent}`
        : systemPrompt;
      const reply = await callLLM(env, finalPrompt, body.message);
      return jsonResponse({ reply }, 200, request, env);
    } catch (err) {
      console.error('chat upstream error', err);
      return jsonResponse({ error: 'upstream' }, 503, request, env);
    }
  },
};
