import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico de inicialização
console.log('[SUPABASE] Inicializando...', {
  url: supabaseUrl ? 'Presente' : 'MISSING',
  key: supabaseAnonKey ? 'Presente' : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE ERROR] Chaves de ambiente não encontradas! Verifique o arquivo .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
