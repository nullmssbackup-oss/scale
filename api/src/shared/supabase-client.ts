// api/src/shared/supabase-client.ts
// Cloudflare Worker – cria cliente Supabase a partir das variáveis de ambiente

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface que representa as variáveis de ambiente do Worker.
 * Você pode adicionar outras propriedades conforme necessário.
 */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  AES_KEY: string;
  ASSETS?: Fetcher; // binding de assets do Cloudflare (se houver)
  [key: string]: any; // para permitir outros bindings
}

/**
 * Cria uma instância do cliente Supabase a partir do ambiente.
 * Lança erro se as variáveis obrigatórias não estiverem presentes.
 */
export function createSupabaseClient(env: Env): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}