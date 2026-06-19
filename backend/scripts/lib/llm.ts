/**
 * Cliente LLM provider-agnostic. Hoy apunta a Groq (free tier + OpenAI-compatible),
 * con dos tiers de modelos: fast (Llama 3.1 8B Instant) y quality (Llama 3.3 70B).
 *
 * Cambiar de proveedor → ajustar `BASE_URL` + `FAST_MODEL`/`QUALITY_MODEL` y
 * la env var de la API key. Como la mayoría de providers exponen API
 * OpenAI-compatible, el resto del archivo casi nunca cambia.
 *
 * Usa fetch nativo de Node (sin SDK) para evitar deps.
 */

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error(
    'GROQ_API_KEY no está definido. Configurálo en .env o en los secrets del workflow.',
  );
}

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Modelo rápido — para tareas mecánicas (resúmenes de commits, extracción de
 * conceptos, chat asistente). Optimizado por latencia + costo.
 */
export const FAST_MODEL = 'llama-3.1-8b-instant';

/**
 * Modelo de mayor calidad — para tareas que valoran precisión técnica y
 * traducciones bilingües naturales (docs, CV, blog).
 */
export const QUALITY_MODEL = 'llama-3.3-70b-versatile';

export type CompletionOptions = {
  system?: string;
  maxTokens?: number;
  temperature?: number;
};

interface OpenAICompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function complete(
  model: string,
  userMessage: string,
  options: CompletionOptions,
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM upstream ${res.status} (${model}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as OpenAICompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('LLM response empty');
  return content;
}

export async function completeFast(
  userMessage: string,
  options: CompletionOptions = {},
): Promise<string> {
  return complete(FAST_MODEL, userMessage, { maxTokens: 2048, temperature: 0.4, ...options });
}

export async function completeQuality(
  userMessage: string,
  options: CompletionOptions = {},
): Promise<string> {
  return complete(QUALITY_MODEL, userMessage, { maxTokens: 4096, temperature: 0.5, ...options });
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
