/**
 * Llama a Groq esperando una respuesta JSON parseable. Si la 1ª respuesta no
 * parsea, hace 1 retry con un prompt más estricto antes de fallar.
 */

import { completeFast, completeQuality, parseJsonResponse } from './groq.js';

export type JsonAgentOptions = {
  /** Prompt del sistema (reglas, contexto, estilo). */
  system: string;
  /** Mensaje del usuario / la tarea concreta. */
  user: string;
  /** "fast" usa Llama 8B; "quality" usa Llama 70B. Default: "fast". */
  tier?: 'fast' | 'quality';
  /** Tokens máximos de la respuesta. Default 1024. */
  maxTokens?: number;
  /** Temperatura. Default 0.4. */
  temperature?: number;
  /** Validador opcional: si tira error, dispara retry. */
  validate?: (parsed: unknown) => void;
};

/**
 * Devuelve el JSON parseado tipado como T. Si Groq devuelve algo no-JSON o si
 * `validate` tira, hace 1 reintento con prompt más estricto. Si vuelve a
 * fallar, propaga el error original (el caller decide qué hacer).
 */
export async function callJsonAgent<T>({
  system,
  user,
  tier = 'fast',
  maxTokens = 1024,
  temperature = 0.4,
  validate,
}: JsonAgentOptions): Promise<T> {
  const complete = tier === 'quality' ? completeQuality : completeFast;

  const tryOnce = async (extraInstruction = ''): Promise<T> => {
    const fullSystem = extraInstruction ? `${system}\n\n${extraInstruction}` : system;
    const raw = await complete(user, { system: fullSystem, maxTokens, temperature });
    const parsed = parseJsonResponse<T>(raw);
    if (validate) validate(parsed);
    return parsed;
  };

  try {
    return await tryOnce();
  } catch (firstError) {
    try {
      return await tryOnce(
        'IMPORTANTE: en la respuesta anterior el JSON era inválido o no cumplía el shape pedido. Devuelve EXCLUSIVAMENTE JSON crudo válido, sin texto antes ni después, sin ``` cercas, sin explicaciones. Respeta exactamente el shape pedido.',
      );
    } catch {
      throw firstError;
    }
  }
}
