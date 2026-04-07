import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE ERROR] Chaves de ambiente não detectadas! Verifique o painel da Vercel.');
}

// Detecta se o app está rodando de forma instalada (PWA Standalone)
const isStandalone = typeof window !== 'undefined' && (
  window.matchMedia('(display-mode: standalone)').matches || 
  (window.navigator as any).standalone === true ||
  document.referrer.includes('android-app://')
);

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true, // Sempre persiste o login para evitar perda de sessão no navegador
    autoRefreshToken: true,
  }
});
