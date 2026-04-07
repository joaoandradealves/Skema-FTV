import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOneSignal(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const OneSignal = (window as any).OneSignal;

    const setupOneSignal = async () => {
      if (!OneSignal) {
        // Try again in a bit if SDK not loaded
        setTimeout(setupOneSignal, 1000);
        return;
      }

      try {
        // Check current subscription status
        const isPushEnabled = await OneSignal.Notifications.permission;
        setIsSubscribed(isPushEnabled === 'granted');

        // Listen for changes
        OneSignal.Notifications.addEventListener('permissionChange', async (permission: string) => {
          if (permission === 'granted') {
            const externalId = await OneSignal.User.PushSubscription.id;
            if (externalId) {
              await syncPlayerId(externalId);
              setIsSubscribed(true);
            }
          } else {
            setIsSubscribed(false);
          }
        });

        // Initialize user association
        const currentId = await OneSignal.User.PushSubscription.id;
        if (currentId) {
          await syncPlayerId(currentId);
        }

      } catch (err) {
        console.error('[ONESIGNAL ERROR]', err);
      }
    };

    const syncPlayerId = async (playerId: string) => {
      console.log('[ONESIGNAL] Syncing player ID:', playerId);
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_id: playerId })
        .eq('id', userId);

      if (error) console.error('[ONESIGNAL] Sync error:', error);
    };

    setupOneSignal();
  }, [userId]);

  const promptSubscription = async () => {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal) {
      await OneSignal.Notifications.requestPermission();
    }
  };

  return { isSubscribed, promptSubscription };
}
