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
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = 20_000;

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

async function callGroq(env: Env, systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
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
      throw new Error(`Groq upstream ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty Groq response');
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
    // respondemos directo sin tocar Groq (gratis, instantáneo).
    const canned = tryCannedResponse(body.message, body.language);
    if (canned) {
      return jsonResponse({ reply: canned }, 200, request, env);
    }

    // Solo las llamadas que van a Groq consumen rate limit (proteje costo upstream).
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const allowed = await checkRateLimit(ip, env);
    if (!allowed) {
      return jsonResponse({ error: 'rate_limit' }, 429, request, env);
    }

    try {
      const systemPrompt = buildSystemPrompt(body.language);
      const reply = await callGroq(env, systemPrompt, body.message);
      return jsonResponse({ reply }, 200, request, env);
    } catch (err) {
      console.error('chat upstream error', err);
      return jsonResponse({ error: 'upstream' }, 503, request, env);
    }
  },
};
