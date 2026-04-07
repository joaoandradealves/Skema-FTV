const API_URL = '/api/notify-admin';

export type NotificationType = 'registration' | 'plan_request' | 'day_use' | 'court_rental' | 'plan_approved' | 'booking_confirmed' | 'teacher_new_student' | 'booking_cancelled' | 'teacher_booking_cancelled' | 'waitlist_promoted' | 'rental_approved' | 'day_use_approved';

export async function notifyAdmin(type: NotificationType, data: any) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data }),
    });

    if (!response.ok) {
      console.warn('[NOTIFY ERROR] Falha ao enviar notificação para admin:', await response.text());
    } else {
      console.log('[NOTIFY SUCCESS] Notificação enviada para admin:', type);
    }
  } catch (error) {
    console.error('[NOTIFY ERROR] Erro na requisição de notificação:', error);
  }
}
