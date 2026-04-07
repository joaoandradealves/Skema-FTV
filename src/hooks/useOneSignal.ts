import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const OneSignal = (window as any).OneSignal;

    const setupOneSignal = async () => {
      const OneSignal = (window as any).OneSignal;
      
      if (!OneSignal || !OneSignal.Notifications) {
        console.warn('[ONESIGNAL] SDK ainda não carregado, tentando em 1s...');
        setTimeout(setupOneSignal, 1000);
        return;
      }

      try {
        console.log('[ONESIGNAL] Inicializando hook para usuário:', userId);
        
        // Verifica permissão atual
        const permission = OneSignal.Notifications.permission;
        console.log('[ONESIGNAL] Permissão atual:', permission);
        setIsSubscribed(permission === true || permission === 'granted');

        // Escuta mudanças de permissão
        OneSignal.Notifications.addEventListener('permissionChange', async (granted: boolean) => {
          console.log('[ONESIGNAL] Mudança de permissão:', granted);
          setIsSubscribed(granted);
          if (granted) {
            const pushId = await OneSignal.User.PushSubscription.id;
            if (pushId) await syncPlayerId(pushId);
          }
        });

        // Sincroniza ID se já estiver inscrito
        const pushId = await OneSignal.User.PushSubscription.id;
        if (pushId) {
          console.log('[ONESIGNAL] ID de inscrição encontrado:', pushId);
          await syncPlayerId(pushId);
        }

      } catch (err) {
        console.error('[ONESIGNAL HOOK ERROR]', err);
      }
    };

    const syncPlayerId = async (playerId: string) => {
      console.log('[ONESIGNAL] Sincronizando com Supabase:', playerId);
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
    console.log('[ONESIGNAL] Solicitando permissão manual...');
    if (OneSignal && OneSignal.Notifications) {
      try {
        await OneSignal.Notifications.requestPermission();
      } catch (err) {
        console.error('[ONESIGNAL PROMPT ERROR]', err);
        alert('Por favor, ative as notificações nas configurações do seu navegador para este site.');
      }
    } else {
      console.error('[ONESIGNAL] OneSignal não está disponível no window.');
    }
  };

  return { isSubscribed, promptSubscription };
}
