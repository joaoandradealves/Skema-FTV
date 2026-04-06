import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { notifyAdmin } from '../lib/notifications';
import CPFModal from '../components/CPFModal';

export default function DayUse() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userCPF, setUserCPF] = useState<string | null>(null);
  const [showCPFModal, setShowCPFModal] = useState(false);

  useEffect(() => {
    fetchOffers();
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('cpf')
            .eq('id', user.id)
            .single();
          if (data?.cpf) setUserCPF(data.cpf);
      }
  }

  async function fetchOffers() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('day_use_offers')
        .select('*')
        .gte('offer_date', today)
        .order('offer_date', { ascending: true });
      
      if (error) throw error;
      setOffers(data || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest() {
    if (!selectedOffer) return;
    
    if (!userCPF) {
        setShowCPFModal(true);
        return;
    }

    startCheckout();
  }

  async function startCheckout() {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login primeiro');

      const offer = offers.find(o => o.id === selectedOffer);
      
      // 1. Criar a reserva no banco (status pendente)
      const { data: booking, error: bookingError } = await supabase
        .from('day_use_bookings')
        .insert({
          student_id: user.id,
          offer_id: selectedOffer,
          price: offer.price,
          status: 'pendente'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Chamar a Edge Function de Checkout
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { 
            booking_id: booking.id, 
            service_type: 'day_use' 
        }
      });

      if (checkoutError) throw checkoutError;

      // Notify Admin
      notifyAdmin('day_use', {
        full_name: user.user_metadata?.full_name || 'Aluno',
        offer_date: new Date(offer.offer_date + 'T00:00:00').toLocaleDateString('pt-BR'),
        price: offer.price
      });

      // 3. Redirecionar para o Mercado Pago
      if (checkoutData?.checkout_url) {
          window.location.href = checkoutData.checkout_url;
      } else {
          throw new Error('Erro ao gerar link de pagamento');
      }
    } catch (error: any) {
      alert(error.message);
      setSubmitting(false);
    }
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="DAY USE" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-10 relative z-10 text-center">
          {/* Header Section */}
          <section className="space-y-3">
            <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-4xl">wb_sunny</span>
            </div>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Agende seu <span className="text-secondary">Day Use</span></h2>
            <p className="text-on-surface-variant text-sm font-medium max-w-xs mx-auto">Escolha uma das ofertas propostas pelo clube para curtir o dia.</p>
          </section>

          {/* New Informative Section */}
          <section className="bg-secondary/5 border-2 border-secondary/10 rounded-[32px] p-6 text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined font-black">info</span>
              <h3 className="font-headline font-black text-sm uppercase tracking-widest">Como funciona o Day Use?</h3>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              Para fazer parte de um Day Use no Skema, você pagará um valor único e terá acesso à quadra para jogar com os participantes que também fazem parte desse Day Use.
            </p>
            <ul className="space-y-2">
              {[
                'Acontece o rodízio entre os jogadores na quadra',
                'Você paga um único valor e terá acesso à quadra durante o horário estimado',
                'Não existem reservas individuais para quadra com a sua turma, nem horário específico para grupos',
                'Todos os atletas podem jogar em conjunto e também em categorias mistas'
              ].map((item, i) => (
                <li key={i} className="flex gap-2 items-start text-[11px] font-bold text-on-surface/70">
                  <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Offers List */}
          <section className="space-y-4">
            {loading ? (
                <div className="py-10 animate-pulse text-on-surface-variant/30 font-black uppercase tracking-widest text-xs">Buscando ofertas...</div>
            ) : offers.length > 0 ? (
                offers.map(off => (
                    <button 
                        key={off.id}
                        onClick={() => setSelectedOffer(off.id)}
                        className={`w-full p-6 rounded-[32px] border-2 transition-all flex justify-between items-center text-left
                            ${selectedOffer === off.id 
                                ? 'bg-secondary border-secondary text-white shadow-lg scale-[1.02]' 
                                : 'bg-white border-primary-container/10 text-on-surface shadow-sm hover:border-secondary/30'
                            }
                        `}
                    >
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedOffer === off.id ? 'text-white/70' : 'text-secondary'}`}>
                                {new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </p>
                            <h3 className="font-headline font-black text-xl tracking-tight">
                                {new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            </h3>
                            <p className={`text-xs font-bold ${selectedOffer === off.id ? 'text-white/60' : 'text-on-surface-variant'}`}>
                                {off.start_time.slice(0,5)} às {off.end_time.slice(0,5)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold opacity-60">R$</span>
                            <span className="text-3xl font-black ml-1 tracking-tighter">{off.price.toString().split('.')[0]}</span>
                        </div>
                    </button>
                ))
            ) : (
                <div className="bg-white/50 p-10 rounded-[40px] border-2 border-dashed border-primary-container/20">
                    <p className="text-on-surface-variant font-bold italic opacity-50">Nenhuma oferta de Day Use disponível no momento. Fique de olho!</p>
                </div>
            )}
          </section>

          {/* Confirm Button */}
          {selectedOffer && (
              <button 
                disabled={submitting}
                onClick={handleRequest}
                className="w-full bg-secondary text-white h-16 rounded-2xl font-headline font-black text-sm uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 animate-[slideUp_0.3s_ease]"
              >
                {submitting ? 'PROCESSANDO...' : 'SOLICITAR PARTICIPAÇÃO'}
                <span className="material-symbols-outlined font-black">arrow_forward</span>
              </button>
          )}
          
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em]">A liberação ocorre após a aprovação do administrador do clube.</p>

        </main>

        <CPFModal 
            isOpen={showCPFModal} 
            onClose={() => setShowCPFModal(false)} 
            onSuccess={(cpf) => {
                setUserCPF(cpf);
                setShowCPFModal(false);
                startCheckout();
            }}
        />

        <StudentNavbar activePage="home" />

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </WavyBackground>
  );
}
