import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const updateSubscriptionStatus = async (showDebug = false) => {
    const OneSignal = (window as any).OneSignal;
    if (showDebug) console.log('[DEBUG] OneSignal status check initiated');
    
    if (OneSignal && OneSignal.Notifications && OneSignal.User) {
      try {
        const hasPermission = OneSignal.Notifications.permission;
        const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
        if (showDebug) alert(`[DEBUG STATUS]\nPermissão: ${hasPermission}\nInscrito: ${isPushEnabled}`);
        setIsSubscribed(hasPermission === true && isPushEnabled === true);
        return hasPermission === true && isPushEnabled === true;
      } catch (e) {
        if (showDebug) alert('[DEBUG ERR] Falha ao ler status: ' + e);
        return false;
      }
    }
    if (showDebug) alert('[DEBUG ERR] SDK OneSignal não mapeado no window');
    return false;
  };

  useEffect(() => {
    const checkPlatform = () => {
      const is_ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const is_standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsIOS(is_ios);
      setIsStandalone(is_standalone);
    };
    checkPlatform();

    if (!userId) return;

    const setupOneSignal = async () => {
      const OneSignal = (window as any).OneSignal;
      
      if (!OneSignal || !OneSignal.Notifications || !OneSignal.User) {
        setTimeout(setupOneSignal, 1000);
        return;
      }

      try {
        await updateSubscriptionStatus();

        OneSignal.Notifications.addEventListener('permissionChange', async (granted: boolean) => {
          const active = await updateSubscriptionStatus();
          if (active) {
            const pushId = await OneSignal.User.PushSubscription.id;
            if (pushId) await syncPlayerId(pushId);
          }
        });

      } catch (err) {
        console.error('[ONESIGNAL ERROR]', err);
      }
    };

    const syncPlayerId = async (playerId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: playerId })
        .eq('id', userId);
      if (error) console.error('[ONESIGNAL SYNC ERROR]', error);
    };

    setupOneSignal();
  }, [userId]);

  const promptSubscription = async () => {
    const OneSignal = (window as any).OneSignal;

    if (isIOS && !isStandalone) {
      alert('No iPhone, as notificações só funcionam no modo "Tela de Início".\n\nAbra o app pelo ícone que você adicionou à sua tela principal e tente novamente!');
      return;
    }

    if (!OneSignal || !OneSignal.Notifications) {
      alert('Aguardando inicialização das notificações... Tente novamente em 2 segundos.');
      return;
    }

    try {
      // Criar um timeout para não travar o carregamento para sempre
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 10000)
      );

      // Iniciar a solicitação de permissão
      await Promise.race([
          OneSignal.Notifications.requestPermission(),
          timeoutPromise
      ]);

      await updateSubscriptionStatus(true);
    } catch (err: any) {
      if (err.message === 'TIMEOUT_EXCEEDED') {
        alert('A solicitação demorou muito. Verifique se a janelinha de permissão não está escondida ou bloqueada nas configurações.');
      } else {
        alert('Ocorreu um erro ao ativar: ' + err.message);
      }
      await updateSubscriptionStatus();
    }
  };

  return { isSubscribed, promptSubscription, isIOS, isStandalone };
}
