export interface Env {
  GROQ_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'access-control-allow-origin': env.ALLOWED_ORIGIN ?? '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        reply: 'Chat Worker stub — la lógica real entra en la Fase 1.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  },
};
