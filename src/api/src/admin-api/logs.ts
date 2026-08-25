// api/src/admin-api/logs.ts
// Controlador de Logs e Erros para API administrativa
// Adaptado de admin.class.php / errors.class.php para Cloudflare Workers + Supabase

import { SupabaseClient } from '@supabase/supabase-js';
import { loadStaticFileCached } from '../shared/static-loader';

// ----------------------------------------------------------------------
// Tipos auxiliares
// ----------------------------------------------------------------------
export interface ErrorEntry {
  id: number;
  bot_id: string;
  time: string;      // ISO string (timestamp)
  msg: string;
}

export interface KnownErrorsResponse {
  patterns: string[];
  count: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// ----------------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------------
const CONFIG_KEY_IGNORE_ERRORS = 'ignore_errors';

// ----------------------------------------------------------------------
// Função auxiliar: carregar padrões de erros ignorados
// ----------------------------------------------------------------------
async function loadKnownErrors(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('name', CONFIG_KEY_IGNORE_ERRORS)
    .maybeSingle();

  if (data?.value) {
    return data.value
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line !== '');
  }

  try {
    const fileContent = await loadStaticFileCached('ignore_errors.txt');
    if (fileContent) {
      return fileContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line !== '');
    }
  } catch {
    // ignora
  }

  return [];
}

// ----------------------------------------------------------------------
// Função auxiliar: verificar se uma mensagem é "conhecida" (ignorada)
// ----------------------------------------------------------------------
function isKnownError(msg: string, knownPatterns: string[]): boolean {
  for (const pattern of knownPatterns) {
    if (!pattern || pattern.startsWith('#')) continue;

    if (pattern.includes('||')) {
      const parts = pattern.split('||');
      let allFound = true;
      for (const part of parts) {
        if (!msg.includes(part.trim())) {
          allFound = false;
          break;
        }
      }
      if (allFound) return true;
    }

    if (msg.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------
// getBotLog – retorna log de keylog (stub)
// ----------------------------------------------------------------------
export async function getBotLog(
  supabase: SupabaseClient,
  botId: string,
  filter?: string,
): Promise<{ success: boolean; content?: string; message?: string }> {
  return {
    success: false,
    message: `Keylog para o bot ${botId} não está disponível via API (futuro: bucket logs no Supabase Storage).`,
  };
}

// ----------------------------------------------------------------------
// getLogs – wrapper de getBotLog (usada pelo roteador)
// ----------------------------------------------------------------------
export async function getLogs(
  supabase: SupabaseClient,
  botId?: string,
  filter?: string,
): Promise<{ success: boolean; content?: string; message?: string }> {
  if (!botId) {
    return { success: false, message: 'Bot ID is required for logs' };
  }
  return getBotLog(supabase, botId, filter);
}

// ----------------------------------------------------------------------
// parsePatterns – analisa padrões de bloqueio (stub)
// ----------------------------------------------------------------------
export async function parsePatterns(
  supabase: SupabaseClient,
  botId: string,
): Promise<{ success: boolean; patterns?: string[]; message?: string }> {
  return {
    success: false,
    message: `Análise de padrões ainda não implementada para o Worker.`,
  };
}

// ----------------------------------------------------------------------
// listErrors – lista erros com paginação e filtros
// ----------------------------------------------------------------------
export async function listErrors(
  supabase: SupabaseClient,
  filters?: {
    botId?: string;
    text?: string;
    page?: number;
    rows?: number;
    includeKnown?: boolean;
  },
): Promise<{ errors: ErrorEntry[]; total: number; skippedKnown?: number }> {
  try {
    const page = filters?.page || 0;
    const rows = filters?.rows || 40;
    const from = page * rows;
    const to = from + rows - 1;

    let query = supabase
      .from('errors')
      .select('*', { count: 'exact' });

    if (filters?.botId) {
      query = query.eq('bot_id', filters.botId);
    }
    if (filters?.text) {
      query = query.like('msg', `%${filters.text}%`);
    }

    query = query.order('id', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    let errors = (data as ErrorEntry[]) || [];
    let skippedKnown = 0;

    if (!filters?.includeKnown) {
      const knownPatterns = await loadKnownErrors(supabase);
      if (knownPatterns.length > 0) {
        const filtered: ErrorEntry[] = [];
        for (const entry of errors) {
          if (isKnownError(entry.msg, knownPatterns)) {
            skippedKnown++;
          } else {
            filtered.push(entry);
          }
        }
        errors = filtered;
      }
    }

    return {
      errors,
      total: count || 0,
      skippedKnown,
    };
  } catch (err) {
    console.error('listErrors error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// deleteError – deleta um único erro
// ----------------------------------------------------------------------
export async function deleteError(
  supabase: SupabaseClient,
  id: number,
): Promise<CommandResult> {
  try {
    const { error } = await supabase.from('errors').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: 'Error report deleted' };
  } catch (err) {
    console.error('deleteError error:', err);
    return { success: false, message: 'Error deleting report' };
  }
}

// ----------------------------------------------------------------------
// deleteErrorsByText – deleta erros que contenham um texto específico
// ----------------------------------------------------------------------
export async function deleteErrorsByText(
  supabase: SupabaseClient,
  text: string,
): Promise<CommandResult> {
  try {
    if (!text) return { success: false, message: 'Text is required' };

    const { error, count } = await supabase
      .from('errors')
      .delete({ count: 'exact' })
      .like('msg', `%${text}%`);

    if (error) throw error;
    return { success: true, message: `${count || 0} error(s) deleted` };
  } catch (err) {
    console.error('deleteErrorsByText error:', err);
    return { success: false, message: 'Error deleting errors' };
  }
}

// ----------------------------------------------------------------------
// deleteAllErrors – deleta todos os erros
// ----------------------------------------------------------------------
export async function deleteAllErrors(
  supabase: SupabaseClient,
): Promise<CommandResult> {
  try {
    const { error } = await supabase.from('errors').delete().neq('id', 0);
    if (error) throw error;
    return { success: true, message: 'All errors deleted' };
  } catch (err) {
    console.error('deleteAllErrors error:', err);
    return { success: false, message: 'Error deleting all errors' };
  }
}

// ----------------------------------------------------------------------
// getKnownErrors – retorna os padrões ignorados
// ----------------------------------------------------------------------
export async function getKnownErrors(
  supabase: SupabaseClient,
): Promise<KnownErrorsResponse> {
  const patterns = await loadKnownErrors(supabase);
  return { patterns, count: patterns.length };
}

// ----------------------------------------------------------------------
// updateKnownErrors – atualiza a lista de padrões ignorados
// ----------------------------------------------------------------------
export async function updateKnownErrors(
  supabase: SupabaseClient,
  patterns: string[],
): Promise<CommandResult> {
  try {
    const content = patterns.join('\n');

    const { data: existing } = await supabase
      .from('config')
      .select('id')
      .eq('name', CONFIG_KEY_IGNORE_ERRORS)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('config')
        .update({ value: content })
        .eq('name', CONFIG_KEY_IGNORE_ERRORS);
    } else {
      await supabase.from('config').insert({
        name: CONFIG_KEY_IGNORE_ERRORS,
        value: content,
        descr: 'Ignored error patterns',
        placeholder: '',
      });
    }

    return { success: true, message: 'Known errors updated' };
  } catch (err) {
    console.error('updateKnownErrors error:', err);
    return { success: false, message: 'Error updating known errors' };
  }
}