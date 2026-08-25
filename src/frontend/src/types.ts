export interface Bot {
  id: number;
  bot_id: string;
  imei: string;
  number: string;
  is_device_admin: boolean;
  is_sms_admin: boolean;
  is_locked: boolean;
  registered: string;
  last_seen: string;
  ip: string;
  country: string;
  lang: string;
  android: string;
  model: string;
  operator: string;
  tag: string;
  comment?: string;
  apps: string;
  is_loader_installed: boolean;
  extra_info_json: string;
  uptime: number;
  keylogger: boolean;
  vnc: string;
  is_fg: boolean;
}

export interface Task {
  id: number;
  bot_id: string;
  task_type: string;
  data: string;
  status: string;
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
  time: string;
  msg: string;
}

export interface PushesBot {
  id: number;
  bot_id: string;
  pkg: string;
  enabled: boolean;
}

export interface Smart {
  id: number;
  stype: string;
  sgroup: string;
  package: string;
  data: string;
  cap_data: string;
  icon?: Uint8Array | string;
  is_active: boolean;
}

export interface SmartsBot {
  id: number;
  smart_id: number;
  bot_id: string;
  is_active: boolean;
}

export interface SmartsData {
  id: number;
  smart_id: number;
  bot_id: string;
  time: string;
  data: string;
}

export interface Sms {
  id: number;
  bot_id: string;
  number: string;
  time: string;
  msg: string;
}

export interface VncTask {
  id: number;
  bot_id: string;
  task_type: string;
  data: string;
}
