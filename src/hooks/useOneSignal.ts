import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  // Estados de Diagnóstico
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>('Iniciando...');

  const updateSubscriptionStatus = async (showDebug = false) => {
    const OneSignal = (window as any).OneSignal;
    const nativePermission = (window as any).Notification?.permission;
    
    if (OneSignal && OneSignal.Notifications && OneSignal.User) {
      try {
        const hasPermission = OneSignal.Notifications.permission;
        let isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
        
        if (hasPermission === true && isPushEnabled === false) {
            try {
                setDebugStatus('Forçando Opt-In...');
                await OneSignal.User.PushSubscription.optIn();
                isPushEnabled = await OneSignal.User.PushSubscription.optedIn;
            } catch (optErr) {
                console.error('[DEBUG] Falha ao forçar opt-in:', optErr);
            }
        }

        const pushId = await OneSignal.User.PushSubscription.id;
        setPlayerId(pushId || null);
        
        const statusMsg = `Nativo: ${nativePermission} | SDK: ${hasPermission ? 'Permitido' : 'Negado'} | Inscrito: ${isPushEnabled ? 'Sim' : 'Não'}`;
        setDebugStatus(statusMsg);

        if (showDebug) {
            alert(`[DIAGNÓSTICO SKEMA]\n${statusMsg}\nID: ${pushId ? 'Sincronizado' : 'Faltando'}`);
        }
        
        if (hasPermission === true && isPushEnabled === true && pushId && userId) {
            await syncPlayerId(pushId);
        }

        setIsSubscribed(hasPermission === true && isPushEnabled === true);
        return hasPermission === true && isPushEnabled === true;
      } catch (e) {
        setDebugStatus('Erro no status: ' + e);
        return false;
      }
    }
    setDebugStatus('OneSignal não carregou...');
    return false;
  };

  const syncPlayerId = async (playerId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ onesignal_id: playerId })
      .eq('id', userId);
    if (error) console.error('[ONESIGNAL SYNC ERROR]', error);
    else console.log('[ONESIGNAL SYNC SUCCESS]', playerId);
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
        setDebugStatus('Configurando SDK...');
        await updateSubscriptionStatus();

        OneSignal.Notifications.addEventListener('permissionChange', async (granted: boolean) => {
          await updateSubscriptionStatus();
        });

      } catch (err) {
        setDebugStatus('Erro no setup: ' + err);
        console.error('[ONESIGNAL ERROR]', err);
      }
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
      setDebugStatus('Pedindo permissão...');
      console.log('[DEBUG] Disparando requestPermission...');
      
      const promise = OneSignal.Notifications.requestPermission();
      
      if ((window as any).Notification && (window as any).Notification.permission === 'default') {
          (window as any).Notification.requestPermission().catch(() => {});
      }

      await promise;
      
      for (let i = 0; i < 3; i++) {
        const active = await updateSubscriptionStatus(i === 0);
        if (active) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err: any) {
      setDebugStatus('Erro no prompt: ' + err);
      console.error('[PROMPT ERROR]', err);
      await updateSubscriptionStatus();
    }
  };

  return { isSubscribed, promptSubscription, isIOS, isStandalone, playerId, debugStatus };
}
