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
      alert('As notificações só funcionam no modo "Tela de Início".\n\nAbra o app pelo ícone que você adicionou à sua tela principal!');
      return;
    }

    if (!OneSignal || !OneSignal.Notifications) {
      alert('Sistema de notificações ainda carregando...');
      return;
    }

    // GESTO DO USUÁRIO: Disparar IMEDIATAMENTE
    try {
      console.log('[DEBUG] Disparando requestPermission...');
      
      // Tentativa 1: OneSignal Oficial
      const promise = OneSignal.Notifications.requestPermission();
      
      // Tentativa 2: Fallback Nativo Síncrono (caso o OneSignal demore a reagir)
      if ((window as any).Notification && (window as any).Notification.permission === 'default') {
          (window as any).Notification.requestPermission().catch(() => {});
      }

      await promise;
      await updateSubscriptionStatus(true);
    } catch (err: any) {
      console.error('[PROMPT ERROR]', err);
      // Silencioso aqui para não atrapalhar o fluxo principal caso o usuário cancele
      await updateSubscriptionStatus();
    }
  };

  return { isSubscribed, promptSubscription, isIOS, isStandalone };
}
