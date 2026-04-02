import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Verificar se já está instalado (standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    
    setIsStandalone(standalone);

    // 2. Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 3. Capturar o evento de instalação do Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Se não estiver instalado, mostramos o modal após um pequeno delay
      if (!standalone) {
        setTimeout(() => setShowModal(true), 1500);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Caso seja iOS, mostramos o modal manualmente se não for standalone após login
    if (ios && !standalone) {
      setTimeout(() => setShowModal(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowModal(false);
    }
  };

  if (isStandalone || !showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-primary/10"
        >
          {/* Header com Logo */}
          <div className="bg-primary/5 p-8 text-center relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg mx-auto mb-4 flex items-center justify-center p-4 ring-4 ring-primary/10">
              <img src="/icons/icon-192x192.png" alt="Skema Logo" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-headline font-black text-xl text-primary tracking-tight">Skema na sua Tela!</h3>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Acesse suas aulas mais rápido</p>
          </div>

          <div className="p-8">
            {isIOS ? (
              /* Tutorial iOS */
              <div className="space-y-6">
                <p className="text-center text-sm text-on-surface-variant leading-relaxed">
                  Para instalar no seu iPhone, siga estes passos simples:
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">ios_share</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">1. Toque no ícone de <span className="text-primary italic">Compartilhar</span> no menu do Safari.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">add_box</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">2. Role para baixo e toque em <span className="text-primary italic">"Adicionar à Tela de Início"</span>.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Entendi, vou fazer!
                </button>
              </div>
            ) : (
              /* Botão Android/Chrome */
              <div className="space-y-6 text-center">
                <p className="text-sm text-on-surface-variant leading-relaxed px-4">
                  Adicione o atalho do Skema Beach Club à sua tela inicial para um acesso instantâneo.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleInstallClick}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">install_mobile</span>
                    Instalar Aplicativo
                  </button>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="w-full py-4 text-on-surface-variant font-bold text-xs uppercase tracking-widest hover:bg-surface-container-low rounded-2xl transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-surface-container-lowest p-4 text-center border-t border-outline-variant/10">
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Experiência completa Skema FTV</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
