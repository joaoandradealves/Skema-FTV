import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

interface CourtRental {
  id: string;
  student_id: string;
  court_name: string;
  rental_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  student: { full_name: string; email: string };
}

interface DayUseRequest {
  id: string;
  student_id: string;
  booking_date: string;
  price: number;
  status: string;
  student: { full_name: string; email: string };
}

export default function ManageLeisure() {
  const [activeTab, setActiveTab] = useState<'rentals' | 'day-use'>('rentals');
  const [rentals, setRentals] = useState<CourtRental[]>([]);
  const [dayUseRequests, setDayUseRequests] = useState<DayUseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    try {
      setLoading(true);
      if (activeTab === 'rentals') {
        const { data, error } = await supabase
          .from('court_rentals')
          .select('*, student:student_id(full_name, email)')
          .eq('status', 'pendente');
        if (error) throw error;
        setRentals(data || []);
      } else {
        const { data, error } = await supabase
          .from('day_use_bookings')
          .select('*, student:student_id(full_name, email)')
          .eq('status', 'pendente');
        if (error) throw error;
        setDayUseRequests(data || []);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRentalAction(id: string, approve: boolean) {
    try {
      const { error } = await supabase
        .from('court_rentals')
        .update({ status: approve ? 'aprovado' : 'cancelado' })
        .eq('id', id);
      if (error) throw error;
      setSuccessMsg(approve ? 'Aluguel aprovado!' : 'Aluguel recusado.');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleDayUseAction(id: string, approve: boolean) {
    try {
      const { error } = await supabase
        .from('day_use_bookings')
        .update({ status: approve ? 'aprovado' : 'cancelado' })
        .eq('id', id);
      if (error) throw error;
      setSuccessMsg(approve ? 'Day Use aprovado!' : 'Day Use recusado.');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="GESTÃO DE LAZER" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
          {/* Header Section */}
          <section className="space-y-1">
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Pedidos <span className="text-secondary">Pendentes</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Gerencie locações de quadras e acessos de Day Use.</p>
          </section>

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest text-center animate-bounce">
                {successMsg}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner">
             <button 
                onClick={() => setActiveTab('rentals')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'rentals' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Quadras
             </button>
             <button 
                onClick={() => setActiveTab('day-use')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'day-use' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Day Use
             </button>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            {loading ? (
                <div className="py-20 text-center text-on-surface-variant/30 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Carregando solicitações...</div>
            ) : (
              activeTab === 'rentals' ? (
                rentals.length > 0 ? (
                  rentals.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{r.court_name}</p>
                              <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{r.student?.full_name || 'Aluno Sem Nome'}</h4>
                              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">{new Date(r.rental_date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                           </div>
                           <div className="bg-surface-container-highest px-4 py-2 rounded-2xl text-secondary font-black text-lg">R$ {r.total_price}</div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-3 bg-surface-container rounded-2xl text-xs font-bold">
                            <span className="material-symbols-outlined text-sm text-secondary">schedule</span>
                            {r.start_time.slice(0,5)} - {r.end_time.slice(0,5)} (Total {Number(r.end_time.split(':')[0]) - Number(r.start_time.split(':')[0])}h)
                        </div>

                        <div className="flex gap-3 pt-2">
                           <button onClick={() => handleRentalAction(r.id, true)} className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Aprovar Aluguel</button>
                           <button onClick={() => handleRentalAction(r.id, false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">Recusar</button>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">Nenhum aluguel pendente</div>
                )
              ) : (
                dayUseRequests.length > 0 ? (
                  dayUseRequests.map(d => (
                    <div key={d.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Acesso ao Clube</p>
                              <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{d.student?.full_name || 'Aluno Sem Nome'}</h4>
                              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">Para o dia: {new Date(d.booking_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                           </div>
                           <div className="bg-surface-container-highest px-4 py-2 rounded-2xl text-secondary font-black text-lg">R$ {d.price}</div>
                        </div>

                        <div className="flex gap-3 pt-2">
                           <button onClick={() => handleDayUseAction(d.id, true)} className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Aprovar Day Use</button>
                           <button onClick={() => handleDayUseAction(d.id, false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">Recusar</button>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">Nenhum pedido de Day Use</div>
                )
              )
            )}
          </div>
        </main>
      </div>
    </WavyBackground>
  );
}
