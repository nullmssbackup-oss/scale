import { supabase } from './supabaseClient';
import type { Bot, Task, Smart, Sms, Config, SmartsData, SmartsBot } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Não autenticado');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Erro na requisição');
  }
  return response.json();
}

// Bots
export const getBots = (params?: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return fetchWithAuth<Bot[]>(`/bots?${query}`);
};
export const getBotById = (botId: string) => fetchWithAuth<Bot>(`/bots/${botId}`);

// Tasks
export const getTasks = (params?: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return fetchWithAuth<Task[]>(`/tasks?${query}`);
};
export const createTask = (botId: string, task: Partial<Task>) =>
  fetchWithAuth<Task>(`/bots/${botId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });

// SMS
export const getSmsList = (params?: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return fetchWithAuth<Sms[]>(`/sms?${query}`);
};

// Smarts
export const getSmarts = () => fetchWithAuth<Smart[]>('/smarts');
export const createSmart = (smart: Partial<Smart>) =>
  fetchWithAuth<Smart>('/smarts', { method: 'POST', body: JSON.stringify(smart) });
export const updateSmart = (id: number, smart: Partial<Smart>) =>
  fetchWithAuth<Smart>(`/smarts/${id}`, { method: 'PATCH', body: JSON.stringify(smart) });
export const deleteSmart = (id: number) =>
  fetchWithAuth<void>(`/smarts/${id}`, { method: 'DELETE' });

// Smarts Bots
export const getSmartsBots = (botId?: string) => {
  const query = botId ? `?bot_id=${botId}` : '';
  return fetchWithAuth<SmartsBot[]>(`/smarts_bots${query}`);
};
export const setSmartsBot = (smartId: number, botId: string, isActive: boolean) =>
  fetchWithAuth<SmartsBot>('/smarts_bots', {
    method: 'POST',
    body: JSON.stringify({ smart_id: smartId, bot_id: botId, is_active: isActive }),
  });

// Logs
export const getSmartsData = (params?: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return fetchWithAuth<SmartsData[]>(`/smarts_data?${query}`);
};

// Config
export const getConfig = () => fetchWithAuth<Config[]>('/config');
export const updateConfig = (name: string, value: string) =>
  fetchWithAuth<Config>(`/config/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
