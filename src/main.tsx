import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Registrar o Service Worker do PWA
if (typeof window !== 'undefined') {
  registerSW({
    onNeedRefresh() {
      console.log('[PWA] Nova versão disponível. Por favor, recarregue.');
    },
    onOfflineReady() {
      console.log('[PWA] O app está pronto para uso offline.');
    },
  });
}

console.log('[MAIN] Iniciando processo de renderização do React...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Elemento 'root' não encontrado no DOM!");

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('[MAIN] React Renderizado com Sucesso.');
} catch (error) {
  console.error('[MAIN FATAL ERROR] Erro ao renderizar a aplicação:', error);
  // Feedback visual mesmo se o React falhar
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: sans-serif;">
      <h1>Erro Crítico de Inicialização</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>Verifique o console (F12) para mais detalhes.</p>
    </div>
  `;
}
