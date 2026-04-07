import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const updateSubscriptionStatus = async (showDebug = false) => {
    const OneSignal = (window as any).OneSignal;
    const nativePermission = (window as any).Notification?.permission;
    
    if (showDebug) console.log('[DEBUG] OneSignal status check initiated');
    
    if (OneSignal && OneSignal.Notifications && OneSignal.User) {
      try {
        const hasPermission = OneSignal.Notifications.permission;
        const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
        
        if (showDebug) {
            alert(`[DIAGNÓSTICO SKEMA]\nStatus Nativo: ${nativePermission}\nOneSignal Permissão: ${hasPermission}\nOneSignal Inscrito: ${isPushEnabled}`);
        }
        
        setIsSubscribed(hasPermission === true && isPushEnabled === true);
        return hasPermission === true && isPushEnabled === true;
      } catch (e) {
        if (showDebug) alert('[DEBUG ERR] Falha ao ler status: ' + e);
        return false;
      }
    }
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
      const nativePermission = (window as any).Notification?.permission;
      if (nativePermission === 'denied') {
          alert('As notificações foram BLOQUEADAS no seu iPhone.\n\nPara ativar:\n1. Vá em Ajustes > Safari (ou o app Skema)\n2. Procure por Notificações\n3. Ative as permissões.');
          return;
      }

      // Criar um timeout para não travar o carregamento para sempre
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 8000)
      );

      // Iniciar a solicitação de permissão
      try {
        console.log('[DEBUG] Tentando OneSignal Request...');
        const requestPromise = OneSignal.Notifications.requestPermission();
        
        // Corrida entre a requisição e o timeout interno
        await Promise.race([
            requestPromise,
            timeoutPromise
        ]);
        
      } catch (e: any) {
        console.log('[DEBUG] OneSignal ou Timeout falhou, tentando fallback nativo...');
        if ((window as any).Notification && (window as any).Notification.permission === 'default') {
            try {
                await (window as any).Notification.requestPermission();
            } catch (nativeErr) {
                console.error('[DEBUG] Falha total no prompt nativo:', nativeErr);
            }
        }
      }

      await updateSubscriptionStatus(true);
    } catch (err: any) {
      if (err.message === 'TIMEOUT_EXCEEDED') {
        const status = await updateSubscriptionStatus(true);
        if (!status) {
           alert('O Safari não respondeu. Tente desinstalar o ícone da tela de início e adicionar novamente para resetar as permissões.');
        }
      } else {
        alert('Ocorreu um erro ao ativar: ' + err.message);
      }
      await updateSubscriptionStatus();
    }
  };

  return { isSubscribed, promptSubscription, isIOS, isStandalone };
}
