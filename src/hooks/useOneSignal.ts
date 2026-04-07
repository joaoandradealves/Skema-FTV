import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Helper to get current status
  const updateSubscriptionStatus = async () => {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal && OneSignal.Notifications && OneSignal.User) {
      const hasPermission = OneSignal.Notifications.permission;
      const isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
      console.log('[ONESIGNAL] Status - Permission:', hasPermission, 'OptedIn:', isPushEnabled);
      setIsSubscribed(hasPermission === true && isPushEnabled === true);
      return hasPermission === true && isPushEnabled === true;
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
          console.log('[ONESIGNAL] Permission changed:', granted);
          const active = await updateSubscriptionStatus();
          if (active) {
            const pushId = await OneSignal.User.PushSubscription.id;
            if (pushId) await syncPlayerId(pushId);
          }
        });

        const pushId = await OneSignal.User.PushSubscription.id;
        if (pushId) await syncPlayerId(pushId);

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
      alert('No iPhone, você precisa adicionar este site à sua TELA DE INÍCIO para ativar as notificações.\n\n1. Clique no botão de Compartilhar (quadrado com seta)\n2. Role para baixo e clique em "Adicionar à Tela de Início"\n3. Abra o app por lá e clique em Ativar novamente.');
      return;
    }

    if (OneSignal && OneSignal.Notifications) {
      try {
        await OneSignal.Notifications.requestPermission();
        // Force state update after prompt closes
        await updateSubscriptionStatus();
      } catch (err) {
        console.error('[PROMPT ERROR]', err);
        alert('Por favor, ative as notificações nas configurações do seu celular/navegador.');
      }
    }
  };

  return { isSubscribed, promptSubscription, isIOS, isStandalone };
}
