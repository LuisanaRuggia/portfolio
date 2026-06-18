import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error(
    'GROQ_API_KEY no está definido. Configurálo en .env o en los secrets del workflow.',
  );
}

export const groq = new Groq({ apiKey });

/**
 * Modelo rápido y barato — equivalente al "Haiku" en costo/latencia.
 * Para resúmenes de commits, extracción de conceptos, tareas mecánicas.
 */
export const FAST_MODEL = 'llama-3.1-8b-instant';

/**
 * Modelo de mayor capacidad — para redacción de blog, CV, prompts donde
 * la calidad importa más que la velocidad.
 */
export const QUALITY_MODEL = 'llama-3.3-70b-versatile';

export type CompletionOptions = {
  system?: string;
  maxTokens?: number;
  temperature?: number;
};

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

async function complete(
  model: string,
  userMessage: string,
  options: Required<Pick<CompletionOptions, 'maxTokens' | 'temperature'>> &
    Pick<CompletionOptions, 'system'>,
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await groq.chat.completions.create({
    model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
