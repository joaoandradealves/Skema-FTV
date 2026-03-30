import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';

export default function DayUse() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

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
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login primeiro');

      const offer = offers.find(o => o.id === selectedOffer);
      
      const { error } = await supabase.from('day_use_bookings').insert({
        student_id: user.id,
        offer_id: selectedOffer,
        price: offer.price,
        status: 'pendente'
      });

      if (error) throw error;
      alert('Solicitação de Day Use enviada! Aguarde a aprovação do Admin.');
      navigate('/student');
    } catch (error: any) {
      alert(error.message);
    } finally {
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
                                {new Date(off.offer_date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </p>
                            <h3 className="font-headline font-black text-xl tracking-tight">
                                {new Date(off.offer_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
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
