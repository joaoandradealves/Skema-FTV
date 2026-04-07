import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration for local development and production
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;
  const resendApiKey = process.env.RESEND_API_KEY;
  const oneSignalAppId = process.env.ONESIGNAL_APP_ID || '51486d1b-db76-4996-b5bd-1c88bcb14835';
  const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
  const adminEmail = 'joao.andrade.alves12@gmail.com';

  // Helper to send OneSignal Push
  async function sendPush(playerId: string, title: string, message: string) {
    if (!oneSignalApiKey) return console.warn('[PUSH] Skip: API Key missing');
    try {
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${oneSignalApiKey}`
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          include_player_ids: [playerId],
          headings: { en: title, pt: title },
          contents: { en: message, pt: message },
          url: 'https://skema-ftv.vercel.app/student-dashboard'
        })
      });
      console.log('[PUSH] Sent to:', playerId);
    } catch (e) {
      console.error('[PUSH ERROR]', e);
    }
  }

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is missing');
    return res.status(500).json({ error: 'Mail service not configured' });
  }

  let subject = '';
  let html = '';

  const waLink = (phone: string, msg: string) =>
    `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

  const header = `
    <div style="background-color: #006971; padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -1px;">SKEMA BEACH CLUB</h1>
    </div>
  `;

  const footer = `
    <div style="padding: 30px 20px; text-align: center; color: #888; font-size: 11px; font-family: sans-serif;">
      <p style="margin: 0;">© 2024 Skema Beach Club • Futevôlei & Lazer</p>
      <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
    </div>
  `;

  switch (type) {
    case 'registration':
      subject = `[SKEMA] 🚀 Novo Cadastro: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 20px; border: 1px solid #eee;">
          ${header}
          <div style="padding: 40px 30px; background: white;">
            <p style="font-size: 16px; color: #555;">Olá, <strong>João</strong>!</p>
            <h2 style="color: #333; font-size: 20px;">Temos um novo atleta na areia!</h2>
            <div style="background: #f0f7f8; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${data.full_name}</p>
              <p style="margin: 5px 0;"><strong>E-mail:</strong> ${data.email}</p>
              <p style="margin: 5px 0;"><strong>Telefone:</strong> ${data.phone}</p>
              <p style="margin: 5px 0;"><strong>Tipo:</strong> ${data.role === 'teacher' ? 'Professor' : 'Aluno'}</p>
            </div>
            <a href="${waLink(data.phone, `Olá ${data.full_name}, bem-vindo ao Skema Beach Club!`)}" 
               style="background: #25D366; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 14px;">
               Dar Boas-Vindas no WhatsApp
            </a>
          </div>
          ${footer}
        </div>
      `;
      break;

    case 'plan_request':
      subject = `[SKEMA] 💳 Solicitação de Plano: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee;">
          ${header}
          <div style="padding: 40px 30px;">
            <h2 style="color: #EF7651; margin-top: 0;">Pagamento Pendente</h2>
            <p><strong>Aluno:</strong> ${data.full_name}</p>
            <p><strong>Plano solicitado:</strong> ${data.plan_name}</p>
            <p style="color: #666; font-size: 14px;">Acesse o painel para verificar o comprovante e liberar o acesso do aluno.</p>
            <a href="https://skema-ftv.vercel.app/admin/approvals" 
               style="background: #006971; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; margin-top: 20px;">
               Ir para Aprovações
            </a>
          </div>
          ${footer}
        </div>
      `;
      break;

    case 'plan_approved':
      subject = `[SKEMA] ✅ Seu plano foi APROVADO! Bem-vindo(a) à areia!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          ${header}
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #006971; font-size: 24px;">Tudo pronto, ${data.full_name}!</h2>
            <p style="font-size: 16px; color: #444;">Seu plano <strong>${data.plan_name}</strong> foi aprovado e agora você já pode realizar seus check-ins.</p>
            <div style="margin: 30px 0; background: #fcfcfc; border: 2px dashed #eee; padding: 20px; border-radius: 16px;">
              <p style="margin: 0; color: #888; text-transform: uppercase; font-weight: bold; font-size: 12px;">Status do Plano</p>
              <p style="margin: 5px 0; color: #25D366; font-size: 20px; font-weight: bold;">ATIVO</p>
            </div>
            <a href="https://skema-ftv.vercel.app/book-class" 
               style="background: #EF7651; color: white; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(239,118,81,0.3);">
               Agendar Minha Primeira Aula
            </a>
          </div>
          ${footer}
        </div>
      `;
      if (data.onesignal_id) {
        await sendPush(data.onesignal_id, '✅ Plano Aprovado!', `Seu plano ${data.plan_name} já está ativo. Bons treinos!`);
      }
      break;

    case 'booking_confirmed':
      subject = `[SKEMA] 🏐 Check-in Confirmado! Nos vemos na quadra!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          <div style="background-color: #EF7651; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 28px; font-weight: 800;">CHECK-IN CONFIRMADO</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #444;">Olá <strong>${data.full_name}</strong>, sua vaga está garantida!</p>
            <div style="background: #f9f9f9; padding: 25px; border-radius: 20px; margin: 25px 0; border-left: 5px solid #EF7651;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${data.class_name}</h3>
              <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${data.date}</p>
              <p style="margin: 5px 0;">⏰ <strong>Horário:</strong> ${data.time}</p>
              <p style="margin: 5px 0;">📍 <strong>Local:</strong> ${data.court}</p>
            </div>
            <p style="color: #888; font-size: 13px; font-style: italic;">Caso não possa comparecer, realize o cancelamento com pelo menos 2 horas de antecedência.</p>
          </div>
          ${footer}
        </div>
      `;
      if (data.onesignal_id) {
        await sendPush(data.onesignal_id, '🏐 Check-in Confirmado!', `${data.class_name} às ${data.time}. Te vemos na areia!`);
      }
      break;

    case 'rental_approved':
      subject = `[SKEMA] 🎾 Aluguel de Quadra Aprovado!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          ${header}
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #006971; font-size: 24px;">Tudo certo, ${data.full_name}!</h2>
            <p style="font-size: 16px; color: #444;">Seu aluguel da quadra <strong>${data.court_name}</strong> para o dia <strong>${data.date}</strong> foi aprovado.</p>
            <div style="margin: 30px 0; background: #fcfcfc; border: 2px dashed #eee; padding: 20px; border-radius: 16px;">
              <p style="margin: 0; color: #888; text-transform: uppercase; font-weight: bold; font-size: 12px;">Horário</p>
              <p style="margin: 5px 0; color: #006971; font-size: 20px; font-weight: bold;">${data.start_time} - ${data.end_time}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Aproveite o jogo!</p>
          </div>
          ${footer}
        </div>
      `;
      if (data.onesignal_id) {
        await sendPush(data.onesignal_id, '🎾 Quadra Aprovada!', `Sua reserva para ${data.date} às ${data.start_time} foi confirmada!`);
      }
      break;

    case 'day_use_approved':
      subject = `[SKEMA] ☀️ Seu Day Use foi Aprovado!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          ${header}
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #006971; font-size: 24px;">Prepare o protetor solar, ${data.full_name}!</h2>
            <p style="font-size: 16px; color: #444;">Seu Day Use para o dia <strong>${data.date}</strong> foi aprovado. Te esperamos!</p>
            <div style="margin: 30px 0; background: #fcfcfc; border: 2px dashed #eee; padding: 20px; border-radius: 16px;">
               <p style="margin: 0; color: #888; text-transform: uppercase; font-weight: bold; font-size: 12px;">Status</p>
               <p style="margin: 5px 0; color: #EF7651; font-size: 20px; font-weight: bold;">ACESSO LIBERADO</p>
            </div>
            <p style="color: #666; font-size: 14px;">Basta apresentar o seu nome na recepção.</p>
          </div>
          ${footer}
        </div>
      `;
      if (data.onesignal_id) {
        await sendPush(data.onesignal_id, '☀️ Day Use Liberado!', `Seu acesso para ${data.date} foi aprovado. Bem-vindo!`);
      }
      break;

    case 'day_use':
      subject = `[SKEMA] ☀️ Novo Day Use: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #EF7651;">Pedido de Day Use</h1>
          <p><strong>Aluno:</strong> ${data.full_name}</p>
          <p><strong>Oferta para o dia:</strong> ${data.offer_date}</p>
          <p><strong>Preço:</strong> R$ ${data.price}</p>
          <br/>
          <a href="https://skema-ftv.vercel.app/admin/leisure" 
             style="background: #006971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             Gerenciar Lazer
          </a>
        </div>
      `;
      break;

    case 'court_rental':
      subject = `[SKEMA] 🎾 Reserva de Quadra: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #EF7651;">Nova Reserva de Quadra</h1>
          <p><strong>Aluno:</strong> ${data.full_name}</p>
          <p><strong>Data:</strong> ${data.rental_date}</p>
          <p><strong>Horário:</strong> ${data.time_label}</p>
          <p><strong>Valor:</strong> R$ ${data.price}</p>
          <br/>
          <a href="https://skema-ftv.vercel.app/admin/leisure" 
             style="background: #006971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             Ver Reservas de Quadra
          </a>
        </div>
      `;
      break;

    case 'teacher_new_student':
      subject = `[SKEMA] 🎾 Novo Aluno na sua Aula!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          <div style="background-color: #006971; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 24px; font-weight: 800;">NOVO ALUNO AGENDADO</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #444;">Olá Professor <strong>${data.teacher_name}</strong>, você tem um novo aluno para a próxima aula!</p>
            <div style="background: #f0f7f8; padding: 25px; border-radius: 20px; margin: 25px 0; border-left: 5px solid #006971;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${data.class_name}</h3>
              <p style="margin: 5px 0;">👤 <strong>Aluno:</strong> ${data.student_name}</p>
              <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${data.date}</p>
              <p style="margin: 5px 0;">⏰ <strong>Horário:</strong> ${data.time}</p>
            </div>
            <p style="color: #888; font-size: 13px;">Prepare a areia e boa aula!</p>
          </div>
          ${footer}
        </div>
      `;
      break;

    case 'booking_cancelled':
      subject = `[SKEMA] ❌ Check-in Cancelado`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          <div style="background-color: #666; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 24px; font-weight: 800;">CHECK-IN CANCELADO</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #444;">Olá <strong>${data.full_name}</strong>, seu check-in foi cancelado com sucesso.</p>
            <div style="background: #f9f9f9; padding: 25px; border-radius: 20px; margin: 25px 0; border-left: 5px solid #666;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${data.class_name}</h3>
              <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${data.date}</p>
              <p style="margin: 5px 0;">⏰ <strong>Horário:</strong> ${data.time}</p>
            </div>
            <p style="color: #888; font-size: 13px;">Seus créditos foram devolvidos conforme a política de cancelamento.</p>
          </div>
          ${footer}
        </div>
      `;
      break;

    case 'teacher_booking_cancelled':
      subject = `[SKEMA] ⚠️ Um aluno cancelou o check-in`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          <div style="background-color: #ba1a1a; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 24px; font-weight: 800;">ALUNO CANCELOU</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #444;">Olá Professor <strong>${data.teacher_name}</strong>, um aluno cancelou a vaga na sua aula.</p>
            <div style="background: #fffbfa; padding: 25px; border-radius: 20px; margin: 25px 0; border-left: 5px solid #ba1a1a;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${data.class_name}</h3>
              <p style="margin: 5px 0;">👤 <strong>Aluno:</strong> ${data.student_name}</p>
              <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${data.date}</p>
              <p style="margin: 5px 0;">⏰ <strong>Horário:</strong> ${data.time}</p>
            </div>
          </div>
          ${footer}
        </div>
      `;
      break;
    
    case 'waitlist_promoted':
      subject = `[SKEMA] 🎊 Sua vaga foi CONFIRMADA!`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #eee; overflow: hidden;">
          <div style="background-color: #25D366; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 28px; font-weight: 800;">VAGA CONFIRMADA!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #444;">Boas notícias, <strong>${data.full_name}</strong>!</p>
            <p style="font-size: 16px; color: #444;">Uma vaga abriu e você saiu da lista de espera. Seu check-in está **confirmado**!</p>
            <div style="background: #f0fdf4; padding: 25px; border-radius: 20px; margin: 25px 0; border-left: 5px solid #25D366;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${data.class_name}</h3>
              <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${data.date}</p>
              <p style="margin: 5px 0;">⏰ <strong>Horário:</strong> ${data.time}</p>
              <p style="margin: 5px 0;">📍 <strong>Local:</strong> ${data.court}</p>
            </div>
            <p style="color: #666; font-size: 14px;">Nos encontramos na arena!</p>
          </div>
          ${footer}
        </div>
      `;
      if (data.onesignal_id) {
        await sendPush(data.onesignal_id, '🎊 Vaga Confirmada!', `Você saiu da lista de espera para ${data.class_name}!`);
      }
      break;

    default:
      return res.status(400).json({ error: 'Invalid notification type' });
  }

  const recipient = (type === 'teacher_new_student' || type === 'teacher_booking_cancelled') ? data.teacher_email : (data.email || adminEmail);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Skema Beach Club <contato@skemaftv.com.br>',
        to: Array.isArray(recipient) ? recipient : [recipient],
        subject: subject,
        html: html
      })
    });

    const result = await response.json();
    console.log('Resend response:', result);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
