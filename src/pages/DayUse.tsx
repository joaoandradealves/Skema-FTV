import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';

export default function DayUse() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest() {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login primeiro');

      const dateString = selectedDate.toISOString().split('T')[0];
      
      const { error } = await supabase.from('day_use_bookings').insert({
        student_id: user.id,
        booking_date: dateString,
        price: 30.00, // Preço fixo por dia
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
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Curta o <span className="text-secondary">Dia</span></h2>
            <p className="text-on-surface-variant text-sm font-medium max-w-xs mx-auto">Acesso às quadras e instalações do clube durante todo o dia selecionado.</p>
          </section>

          {/* Pricing Card */}
          <section className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-primary-container/10 relative">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-secondary tracking-[0.2em] uppercase">Investimento único</p>
                <div className="flex items-baseline justify-center gap-1 text-on-surface">
                   <span className="text-sm font-bold">R$</span>
                   <span className="text-5xl font-black tracking-tighter">30,00</span>
                   <span className="text-xs font-medium opacity-50">/dia</span>
                </div>
             </div>
             
             <div className="mt-8 pt-8 border-t border-dashed border-primary-container/20">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Selecione a data:</p>
                <input 
                    type="date" 
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full h-14 bg-surface-container rounded-2xl border-none font-bold text-center text-secondary focus:ring-secondary/30"
                />
             </div>
          </section>

          {/* Confirm Button */}
          <button 
            disabled={submitting}
            onClick={handleRequest}
            className="w-full bg-secondary text-white h-16 rounded-2xl font-headline font-black text-sm uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {submitting ? 'PROCESSANDO...' : 'SOLICITAR DAY USE'}
            <span className="material-symbols-outlined">payments</span>
          </button>
          
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em]">A liberação ocorre após a aprovação do administrador do clube.</p>

        </main>

        <StudentNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
