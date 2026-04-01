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
  const adminEmail = 'joao.andrade.alves12@gmail.com';

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is missing');
    return res.status(500).json({ error: 'Mail service not configured' });
  }

  let subject = '';
  let html = '';

  const waLink = (phone: string, msg: string) => 
    `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

  switch (type) {
    case 'registration':
      subject = `[SKEMA] 🚀 Novo Cadastro: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #006971;">Novo Atleta no Skema!</h1>
          <p><strong>Nome:</strong> ${data.full_name}</p>
          <p><strong>E-mail:</strong> ${data.email}</p>
          <p><strong>Telefone:</strong> ${data.phone}</p>
          <p><strong>Tipo:</strong> ${data.role === 'teacher' ? 'Professor' : 'Aluno'}</p>
          <br/>
          <a href="${waLink(data.phone, `Olá ${data.full_name}, bem-vindo ao Skema Beach Club!`)}" 
             style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             Dar Boas-Vindas no WhatsApp
          </a>
        </div>
      `;
      break;
    case 'plan_request':
      subject = `[SKEMA] 💳 Solicitação de Plano: ${data.full_name}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #EF7651;">Solicitação de Plano Pendente</h1>
          <p><strong>Aluno:</strong> ${data.full_name}</p>
          <p><strong>Plano solicitado:</strong> ${data.plan_name}</p>
          <br/>
          <p>Acesse o painel para aprovar ou recusar:</p>
          <a href="https://skema-ftv.vercel.app/admin/approvals" 
             style="background: #006971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             Ir para Aprovações
          </a>
        </div>
      `;
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
    default:
      return res.status(400).json({ error: 'Invalid notification type' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Skema Beach Club <onboarding@resend.dev>',
        to: [adminEmail],
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
