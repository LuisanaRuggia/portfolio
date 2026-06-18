export interface Env {
  ADMIN_TOKEN: string;
  LINKEDIN_ACCESS_TOKEN: string;
  DEVTO_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'access-control-allow-origin': env.ALLOWED_ORIGIN ?? '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        message: 'Drafts Worker stub — la lógica real entra en la Fase 5.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      },
    );
  },
};
