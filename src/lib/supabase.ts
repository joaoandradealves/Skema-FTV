import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE ERROR] Chaves de ambiente não detectadas! Verifique o painel da Vercel.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
