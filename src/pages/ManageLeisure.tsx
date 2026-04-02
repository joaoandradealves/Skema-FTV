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
  const [activeTab, setActiveTab] = useState<'rentals' | 'day-use' | 'create-offer'>('rentals');
  const [rentals, setRentals] = useState<CourtRental[]>([]);
  const [dayUseRequests, setDayUseRequests] = useState<DayUseRequest[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State for New Offer
  const [newOffer, setNewOffer] = useState({
    offer_date: new Date().toISOString().split('T')[0],
    start_time: '17:00',
    end_time: '22:00',
    price: 30,
    max_spots: 10
  });

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
      } else if (activeTab === 'day-use') {
        const { data, error } = await supabase
          .from('day_use_bookings')
          .select('*, student:student_id(full_name, email), offer:offer_id(*)')
          .eq('status', 'pendente');
        if (error) throw error;
        setDayUseRequests(data || []);
      } else {
        const { data, error } = await supabase.from('day_use_offers').select('*').order('offer_date', { ascending: false });
        if (error) throw error;
        setOffers(data || []);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOffer() {
     try {
       setSubmitting(true);
       const { error } = await supabase.from('day_use_offers').insert([newOffer]);
       if (error) throw error;
       setSuccessMsg('Oferta de Day Use criada!');
       setActiveTab('create-offer');
       fetchData();
       setTimeout(() => setSuccessMsg(''), 3000);
     } catch (error: any) {
       alert(error.message);
     } finally {
       setSubmitting(false);
     }
  }

  async function handleRentalAction(id: string, approve: boolean) {
    try {
      const { error } = await supabase
        .from('court_rentals')
        .update({ status: approve ? 'aprovado' : 'cancelado' })
        .eq('id', id);
      if (error) throw error;
      setSuccessMsg(approve ? 'Aluguel aprovado e e-mail enviado!' : 'Aluguel recusado.');
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
      setSuccessMsg(approve ? 'Day Use aprovado e e-mail enviado!' : 'Day Use recusado.');
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
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Gestão de <span className="text-secondary">Lazer</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Aprovação de aluguéis e criação de ofertas de Day Use.</p>
          </section>

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest text-center animate-bounce">
                {successMsg}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-surface-container rounded-2xl p-1 shadow-inner overflow-x-auto">
             <button 
                onClick={() => setActiveTab('rentals')}
                className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'rentals' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Aluguéis
             </button>
             <button 
                onClick={() => setActiveTab('day-use')}
                className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'day-use' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Pedidos
             </button>
             <button 
                onClick={() => setActiveTab('create-offer')}
                className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'create-offer' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Ofertas
             </button>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            {loading ? (
                <div className="py-20 text-center text-on-surface-variant/30 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Carregando informações...</div>
            ) : (
              activeTab === 'rentals' ? (
                rentals.length > 0 ? (
                  rentals.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{r.court_name}</p>
                              <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{r.student?.full_name || 'Aluno Sem Nome'}</h4>
                              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">{new Date(r.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
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
              ) : activeTab === 'day-use' ? (
                dayUseRequests.length > 0 ? (
                  dayUseRequests.map(d => (
                    <div key={d.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Acesso ao Clube</p>
                              <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{d.student?.full_name || 'Aluno Sem Nome'}</h4>
                              <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">
                                 Oferta para {new Date(d.offer?.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                              </p>
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
              ) : (
                <div className="space-y-6">
                   {/* Form to Create New Offer */}
                   <section className="bg-white p-6 rounded-[32px] border-2 border-primary-container/20 shadow-sm space-y-4">
                      <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">Propor Novo Day Use</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Data</label>
                           <input 
                              type="date" 
                              value={newOffer.offer_date}
                              onChange={(e) => setNewOffer({...newOffer, offer_date: e.target.value})}
                              className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Início</label>
                           <input 
                              type="time" 
                              value={newOffer.start_time}
                              onChange={(e) => setNewOffer({...newOffer, start_time: e.target.value})}
                              className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Fim</label>
                           <input 
                              type="time" 
                              value={newOffer.end_time}
                              onChange={(e) => setNewOffer({...newOffer, end_time: e.target.value})}
                              className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Preço (R$)</label>
                           <input 
                              type="number" 
                              value={newOffer.price}
                              onChange={(e) => setNewOffer({...newOffer, price: Number(e.target.value)})}
                              className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Vagas</label>
                           <input 
                              type="number" 
                              value={newOffer.max_spots}
                              onChange={(e) => setNewOffer({...newOffer, max_spots: Number(e.target.value)})}
                              className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                           />
                        </div>
                      </div>
                      <button 
                         disabled={submitting}
                         onClick={handleCreateOffer}
                         className="w-full bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                         {submitting ? 'CRIANDO...' : 'CRIAR OFERTA DE DAY USE'}
                      </button>
                   </section>

                   {/* List of Offers */}
                   <section className="space-y-4">
                      <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight ml-2">Ofertas Ativas</h3>
                      {offers.length > 0 ? offers.map(off => (
                        <div key={off.id} className="bg-surface-container-highest p-5 rounded-2xl border border-primary-container/10 flex justify-between items-center group">
                            <div>
                               <p className="text-[10px] font-black text-secondary uppercase italic">{new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                               <h5 className="font-headline font-black text-lg text-on-surface">{new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h5>
                               <p className="text-xs font-bold text-on-surface-variant">{off.start_time.slice(0,5)} às {off.end_time.slice(0,5)} • R$ {off.price}</p>
                            </div>
                            <div className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-black text-secondary border border-secondary/10">
                               {off.max_spots} VAGAS
                            </div>
                        </div>
                      )) : (
                        <div className="py-10 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Nenhuma oferta criada</div>
                      )}
                   </section>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </WavyBackground>
  );
}
