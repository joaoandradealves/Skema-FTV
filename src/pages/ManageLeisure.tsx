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
  student: { full_name: string; email: string; onesignal_id?: string };
}

interface DayUseRequest {
  id: string;
  student_id: string;
  booking_date: string;
  price: number;
  status: string;
  student: { full_name: string; email: string; onesignal_id?: string };
}

export default function ManageLeisure() {
  const [activeTab, setActiveTab] = useState<'rentals' | 'day-use' | 'create-offer' | 'payments'>('rentals');
  const [rentals, setRentals] = useState<CourtRental[]>([]);
  const [dayUseRequests, setDayUseRequests] = useState<DayUseRequest[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [managingParticipants, setManagingParticipants] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [courtPrice, setCourtPrice] = useState<number>(60);
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Form State for New Offer
  const [newOffer, setNewOffer] = useState({
    offer_date: new Date().toISOString().split('T')[0],
    start_time: '17:00',
    end_time: '22:00',
    price: 30,
    max_spots: 10
  });
  const [testMode, setTestMode] = useState(true); // Default como true para segurança

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    try {
      setLoading(true);
      if (activeTab === 'rentals') {
        const { data, error } = await supabase
          .from('court_rentals')
          .select('*, student:student_id(full_name, email, onesignal_id)')
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRentals(data || []);
      } else if (activeTab === 'day-use') {
        const { data, error } = await supabase
          .from('day_use_bookings')
          .select('*, student:student_id(full_name, email, onesignal_id), offer:offer_id(*)')
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDayUseRequests(data || []);
      } else if (activeTab === 'payments') {
        const { data, error } = await supabase
          .from('payments')
          .select('*, profiles:student_id(full_name, email)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPayments(data || []);
        
        const total = (data || [])
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        setTotalRevenue(total);
      } else {
        const { data, error } = await supabase.from('day_use_offers').select('*').order('offer_date', { ascending: false });
        if (error) throw error;
        setOffers(data || []);
      }

      // Buscar preço da quadra (Independente da aba)
      const { data: priceData } = await supabase.from('court_configs').select('court_price_per_hour').eq('id', 'default').single();
      if (priceData) setCourtPrice(Number(priceData.court_price_per_hour));

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCourtPrice() {
    try {
      setUpdatingPrice(true);
      const { data, error } = await supabase
        .from('court_configs')
        .update({ court_price_per_hour: courtPrice })
        .eq('id', 'default')
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Falha ao atualizar: Nenhuma linha afetada. Verifique se você é um administrador.');
      }

      setSuccessMsg('Preço da quadra atualizado!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdatingPrice(false);
    }
  }

  async function handleCreateOffer() {
    try {
      setSubmitting(true);
      const { data: offer, error } = await supabase.from('day_use_offers').insert([newOffer]).select().single();
      if (error) throw error;

      // Determinar destinatários
      let emails: string[] = [];
      if (testMode) {
        // No modo de teste, envia apenas para o admin
        emails = ['joao.andrade.alves@gmail.com', 'joao.andrade.alves12@gmail.com'];
      } else {
        // No modo real, busca todos os alunos
        const { data: profiles } = await supabase.from('profiles').select('email').eq('role', 'student');
        emails = (profiles || []).map(p => p.email).filter(Boolean);
      }
      
      if (emails.length > 0) {
        const { notifyAdmin } = await import('../lib/notifications');
        await notifyAdmin('day_use_created', {
          date: new Date(newOffer.offer_date + 'T00:00:00').toLocaleDateString('pt-BR'),
          start_time: newOffer.start_time,
          end_time: newOffer.end_time,
          price: newOffer.price,
          emails: emails,
          is_test: testMode
        });
      }

      setSuccessMsg(testMode ? 'Oferta criada (MODO TESTE - Notificação apenas para Admin)' : 'Oferta de Day Use criada e alunos notificados!');
      setActiveTab('create-offer');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateOffer() {
    try {
      setSubmitting(true);
      const { error } = await supabase.from('day_use_offers').update({
        offer_date: editingOffer.offer_date,
        start_time: editingOffer.start_time,
        end_time: editingOffer.end_time,
        price: editingOffer.price,
        max_spots: editingOffer.max_spots
      }).eq('id', editingOffer.id);
      
      if (error) throw error;
      setSuccessMsg('Oferta atualizada com sucesso!');
      setIsEditing(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOffer(id: string) {
    if (!confirm('Deseja excluir esta oferta? Todas as reservas vinculadas serão excluídas e os pontos serão estornados aos alunos.')) return;
    try {
      setLoading(true);
      await supabase.from('day_use_bookings').delete().eq('offer_id', id);
      const { error } = await supabase.from('day_use_offers').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Oferta excluída!');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
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

      if (approve) {
        const rental = rentals.find(r => r.id === id);
        if (rental) {
            const { notifyAdmin } = await import('../lib/notifications');
            await notifyAdmin('rental_approved', {
                email: rental.student.email,
                full_name: rental.student.full_name,
                court_name: rental.court_name,
                date: new Date(rental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR'),
                start_time: rental.start_time.slice(0,5),
                end_time: rental.end_time.slice(0,5),
                onesignal_id: rental.student.onesignal_id
            });
        }
      }

      setSuccessMsg(approve ? 'Aluguel aprovado e notificações enviadas!' : 'Aluguel recusado.');
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

      if (approve) {
        const booking = dayUseRequests.find(d => d.id === id);
        if (booking) {
            const { notifyAdmin } = await import('../lib/notifications');
            await notifyAdmin('day_use_approved', {
                email: booking.student.email,
                full_name: booking.student.full_name,
                date: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('pt-BR'),
                onesignal_id: booking.student.onesignal_id
            });
        }
      }

      setSuccessMsg(approve ? 'Day Use aprovado e notificações enviadas!' : 'Day Use recusado.');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function fetchParticipants(offerId: string) {
    try {
      const { data, error } = await supabase
        .from('day_use_bookings')
        .select('*, student:student_id(full_name, avatar_url, email)')
        .eq('offer_id', offerId)
        .eq('status', 'aprovado');
      if (error) throw error;
      setParticipants(data || []);
    } catch (error: any) {
      console.error(error.message);
    }
  }

  async function handleSearchStudents(query: string) {
    setStudentSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('role', 'student')
        .ilike('full_name', `%${query}%`)
        .limit(5);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddParticipant(studentId: string) {
    if (!managingParticipants) return;
    try {
      setSubmitting(true);
      const isAlreadyIn = participants.some(p => p.student_id === studentId);
      if (isAlreadyIn) {
        alert('Este aluno já está nesta oferta!');
        return;
      }

      const { error } = await supabase.from('day_use_bookings').insert([{
        student_id: studentId,
        offer_id: managingParticipants.id,
        price: managingParticipants.price,
        status: 'aprovado'
      }]);
      
      if (error) throw error;
      setSuccessMsg('Aluno adicionado com sucesso!');
      fetchParticipants(managingParticipants.id);
      setSearchResults([]);
      setStudentSearch('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveParticipant(bookingId: string) {
    if (!confirm('Deseja remover este participante? Os pontos serão estornados.')) return;
    try {
      const { error } = await supabase.from('day_use_bookings').update({ status: 'cancelado' }).eq('id', bookingId);
      if (error) throw error;
      setSuccessMsg('Participante removido!');
      if (managingParticipants) fetchParticipants(managingParticipants.id);
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
             <button 
                onClick={() => setActiveTab('payments')}
                className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                  ${activeTab === 'payments' ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant/70 hover:text-on-surface'}
                `}
             >
                Financeiro
             </button>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            {activeTab === 'rentals' && (
                <div className="bg-white p-6 rounded-[32px] border-2 border-primary-container/20 shadow-sm space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">Preço da Quadra</h3>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-60 italic">Valor cobrado por hora de reserva</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant opacity-40">R$</span>
                                <input 
                                    type="number" 
                                    value={courtPrice}
                                    onChange={(e) => setCourtPrice(Number(e.target.value))}
                                    className="w-24 h-12 pl-8 border-none bg-surface-container rounded-xl font-headline font-black text-secondary text-lg text-center"
                                />
                            </div>
                            <button 
                                onClick={handleUpdateCourtPrice}
                                disabled={updatingPrice}
                                className="h-12 px-6 bg-secondary text-white rounded-xl font-headline font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {updatingPrice ? '...' : 'SALVAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center text-on-surface-variant/30 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Carregando informações...</div>
            ) : (
                <>
                    {activeTab === 'rentals' && (
                        rentals.length > 0 ? (
                            rentals.map(r => (
                                <div key={r.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{r.court_name}</p>
                                            <h4 className="font-headline font-black text-xl text-on-surface">{r.student?.full_name}</h4>
                                            <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">{new Date(r.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                                        </div>
                                        <div className="bg-surface-container-highest px-4 py-2 rounded-2xl text-secondary font-black text-lg">R$ {r.total_price}</div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-surface-container rounded-2xl text-xs font-bold font-mono">
                                        <span className="material-symbols-outlined text-sm text-secondary">schedule</span>
                                        {r.start_time.slice(0,5)} - {r.end_time.slice(0,5)}
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        {r.status === 'aprovado' ? (
                                            <div className="w-full bg-primary/10 text-primary py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest text-center border-2 border-primary/20">
                                                CONFIRMADO (PAGO)
                                            </div>
                                        ) : r.status === 'aguardando' ? (
                                            <div className="w-full space-y-3">
                                                <div className="w-full bg-amber-50 text-amber-600 py-3 rounded-2xl font-headline font-black text-[10px] uppercase tracking-widest text-center border-2 border-amber-100 flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                    Aguardando Pagamento
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleRentalAction(r.id, true)} className="flex-1 bg-surface-container-highest text-on-surface-variant py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-surface-container-high transition-colors">Aprovar Manual</button>
                                                    <button onClick={() => handleRentalAction(r.id, false)} className="px-4 bg-surface-container-highest text-error py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-error/10 transition-colors">Recusar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => handleRentalAction(r.id, true)} className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Aprovar Aluguel</button>
                                                <button onClick={() => handleRentalAction(r.id, false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">Recusar</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">Nenhum aluguel ativo</div>
                        )
                    )}

                    {activeTab === 'day-use' && (
                        dayUseRequests.length > 0 ? (
                            dayUseRequests.map(d => (
                                <div key={d.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Acesso ao Clube</p>
                                            <h4 className="font-headline font-black text-xl text-on-surface">{d.student?.full_name}</h4>
                                            <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase">
                                                Oferta para {new Date(d.offer?.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                            </p>
                                        </div>
                                        <div className="bg-surface-container-highest px-4 py-2 rounded-2xl text-secondary font-black text-lg">R$ {d.price}</div>
                                    </div>
                                    <div className="flex flex-col gap-3 pt-2">
                                        {d.status === 'aprovado' ? (
                                            <div className="w-full bg-primary/10 text-primary py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest text-center border-2 border-primary/20">
                                                CONFIRMADO
                                            </div>
                                        ) : d.status === 'pagamento_local' ? (
                                            <>
                                                <div className="w-full bg-amber-50 text-amber-700 py-3 rounded-2xl font-headline font-black text-[10px] uppercase tracking-widest text-center border-2 border-amber-100 flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">storefront</span>
                                                    Pagar no Bar
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleDayUseAction(d.id, true)} className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Confirmar Pagamento</button>
                                                    <button onClick={() => handleDayUseAction(d.id, false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-[10px] uppercase tracking-widest">Recusar</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleDayUseAction(d.id, true)} className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Aprovar Day Use</button>
                                                <button onClick={() => handleDayUseAction(d.id, false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">Recusar</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">Nenhum pedido ativo</div>
                        )
                    )}

                    {activeTab === 'create-offer' && (
                        <div className="space-y-6">
                            <section className="bg-white p-6 rounded-[32px] border-2 border-primary-container/20 shadow-sm space-y-4">
                                <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">Propor Novo Day Use</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Data</label>
                                        <input type="date" value={newOffer.offer_date} onChange={(e) => setNewOffer({...newOffer, offer_date: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Início</label>
                                        <input type="time" value={newOffer.start_time} onChange={(e) => setNewOffer({...newOffer, start_time: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Fim</label>
                                        <input type="time" value={newOffer.end_time} onChange={(e) => setNewOffer({...newOffer, end_time: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Preço (R$)</label>
                                        <input type="number" value={newOffer.price} onChange={(e) => setNewOffer({...newOffer, price: Number(e.target.value)})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Vagas</label>
                                        <input type="number" value={newOffer.max_spots} onChange={(e) => setNewOffer({...newOffer, max_spots: Number(e.target.value)})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3 p-4 bg-secondary/5 rounded-2xl border-2 border-dashed border-secondary/20">
                                        <input 
                                            type="checkbox" 
                                            id="testMode" 
                                            checked={testMode} 
                                            onChange={(e) => setTestMode(e.target.checked)}
                                            className="w-5 h-5 rounded border-secondary text-secondary focus:ring-secondary"
                                        />
                                        <label htmlFor="testMode" className="text-xs font-bold text-secondary cursor-pointer flex flex-col">
                                            MODO DE TESTE ATIVADO
                                            <span className="text-[9px] opacity-60 font-medium normal-case">Ao criar, a notificação será enviada apenas para o seu e-mail.</span>
                                        </label>
                                    </div>
                                </div>
                                <button disabled={submitting} onClick={handleCreateOffer} className="w-full bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                    {submitting ? 'CRIANDO...' : 'CRIAR OFERTA DE DAY USE'}
                                </button>
                            </section>

                            <section className="space-y-4">
                                <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight ml-2">Ofertas Ativas</h3>
                                {offers.length > 0 ? offers.map(off => (
                                    <div key={off.id} className="bg-surface-container-highest p-5 rounded-2xl border border-primary-container/10 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-secondary uppercase italic">{new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                            <h5 className="font-headline font-black text-lg text-on-surface">{new Date(off.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h5>
                                            <p className="text-xs font-bold text-on-surface-variant">{off.start_time.slice(0,5)} às {off.end_time.slice(0,5)} • R$ {off.price}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setManagingParticipants(off); fetchParticipants(off.id); }} className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all"><span className="material-symbols-outlined text-sm font-black">groups</span></button>
                                            <button onClick={() => { setEditingOffer(off); setIsEditing(true); }} className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all"><span className="material-symbols-outlined text-sm font-black">edit</span></button>
                                            <button onClick={() => handleDeleteOffer(off.id)} className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all"><span className="material-symbols-outlined text-sm font-black">delete</span></button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Nenhuma oferta criada</div>
                                )}
                            </section>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[32px] border-2 border-primary-container/20 shadow-sm flex items-center justify-between overflow-hidden relative">
                                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                                    <span className="material-symbols-outlined text-[120px] text-secondary">payments</span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">Faturamento Total (Aprovado)</p>
                                    <h3 className="font-headline font-black text-4xl text-on-surface tracking-tighter">R$ {totalRevenue.toFixed(2)}</h3>
                                </div>
                                <div className="text-right relative z-10">
                                    <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest">
                                        {payments.filter(p => p.status === 'paid').length} Vendas
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight ml-2">Histórico de Transações</h3>
                                {payments.length > 0 ? payments.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm flex items-center justify-between transition-all hover:border-secondary/20">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant/40'}`}>
                                                <span className="material-symbols-outlined font-black">{p.status === 'paid' ? 'check_circle' : 'pending'}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-0.5">{p.service_type === 'court_rental' ? 'Aluguel' : 'Day Use'}</p>
                                                <h5 className="font-headline font-bold text-on-surface uppercase tracking-tight leading-none mb-1">{p.profiles?.full_name || 'Desconhecido'}</h5>
                                                <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase">{new Date(p.created_at).toLocaleString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-headline font-black text-lg leading-none ${p.status === 'paid' ? 'text-on-surface' : 'text-on-surface-variant/30'}`}>R$ {Number(p.amount).toFixed(2)}</p>
                                            <p className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-40">{p.external_id ? `ID: ${p.external_id.slice(0, 8)}...` : 'Sem ID MP'}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Nenhuma transação registrada.</div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
          </div>
        </main>

        {/* Edit Modal Overlay */}
        {isEditing && editingOffer && (
            <div className="fixed inset-0 bg-secondary/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300">
                   <div className="flex justify-between items-center">
                       <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tight">Editar <span className="text-secondary">Oferta</span></h3>
                       <button onClick={() => setIsEditing(false)} className="material-symbols-outlined text-on-surface-variant opacity-40">close</button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Nova Data</label>
                          <input type="date" value={editingOffer.offer_date} onChange={(e) => setEditingOffer({...editingOffer, offer_date: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Início</label>
                          <input type="time" value={editingOffer.start_time} onChange={(e) => setEditingOffer({...editingOffer, start_time: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Fim</label>
                          <input type="time" value={editingOffer.end_time} onChange={(e) => setEditingOffer({...editingOffer, end_time: e.target.value})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Preço (R$)</label>
                          <input type="number" value={editingOffer.price} onChange={(e) => setEditingOffer({...editingOffer, price: Number(e.target.value)})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Vagas</label>
                          <input type="number" value={editingOffer.max_spots} onChange={(e) => setEditingOffer({...editingOffer, max_spots: Number(e.target.value)})} className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary" />
                       </div>
                   </div>

                   <div className="flex flex-col gap-3 pt-4">
                       <button disabled={submitting} onClick={handleUpdateOffer} className="w-full bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Salvar Alterações</button>
                       <button onClick={() => setIsEditing(false)} className="w-full py-2 text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest">Cancelar</button>
                   </div>
                </div>
            </div>
        )}

        {/* Participants Modal Overlay */}
        {managingParticipants && (
            <div className="fixed inset-0 bg-secondary/40 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4">
                <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col h-[85vh] sm:h-auto max-h-[90vh]">
                   <div className="p-8 border-b border-primary-container/5 bg-surface-container/30">
                       <div className="flex justify-between items-center mb-6">
                           <div>
                               <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tight">Gerenciar <span className="text-primary">Participantes</span></h3>
                               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{new Date(managingParticipants.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                           </div>
                           <button onClick={() => setManagingParticipants(null)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center material-symbols-outlined opacity-40">close</button>
                       </div>

                       {/* Search Box */}
                       <div className="relative group">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/30 text-lg">search</span>
                           <input 
                               type="text" 
                               placeholder="Adicionar aluno pelo nome..." 
                               value={studentSearch}
                               onChange={(e) => handleSearchStudents(e.target.value)}
                               className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border-2 border-primary-container/5 focus:border-primary/20 focus:ring-0 transition-all font-bold text-sm"
                           />
                           
                           {/* Search Results Dropdown */}
                           {searchResults.length > 0 && (
                               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-primary-container/10 overflow-hidden z-20">
                                   {searchResults.map(s => (
                                       <button 
                                           key={s.id} 
                                           onClick={() => handleAddParticipant(s.id)}
                                           className="w-full p-4 flex items-center gap-4 hover:bg-primary/5 transition-all text-left border-b border-primary-container/5 last:border-0"
                                       >
                                           <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                                               <img src={s.avatar_url || 'https://via.placeholder.com/150'} alt={s.full_name} className="w-full h-full object-cover" />
                                           </div>
                                           <div>
                                               <p className="font-bold text-sm text-on-surface">{s.full_name}</p>
                                               <p className="text-[10px] font-medium text-on-surface-variant opacity-60 italic">{s.email}</p>
                                           </div>
                                           <span className="material-symbols-outlined ml-auto text-primary text-sm">add_circle</span>
                                       </button>
                                   ))}
                               </div>
                           )}
                           {studentSearch.length >= 2 && searchResults.length === 0 && !searching && (
                               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl p-4 shadow-xl border text-center text-xs font-bold text-on-surface-variant/40">Nenhum aluno encontrado.</div>
                           )}
                       </div>
                   </div>

                   {/* Current Participants List */}
                   <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                       <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-2">Confirmados ({participants.length}/{managingParticipants.max_spots})</h4>
                       <div className="space-y-3">
                           {participants.length > 0 ? participants.map(p => (
                               <div key={p.id} className="bg-surface-container/30 p-4 rounded-2xl flex items-center justify-between border border-primary-container/5 group transition-all hover:bg-white hover:shadow-md">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border-2 border-white shadow-sm">
                                           <img src={p.student?.avatar_url || 'https://via.placeholder.com/150'} alt={p.student?.full_name} className="w-full h-full object-cover" />
                                       </div>
                                       <div>
                                           <p className="font-bold text-sm text-on-surface">{p.student?.full_name}</p>
                                           <p className="text-[10px] font-medium text-on-surface-variant/50">Confirmado em {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                       </div>
                                   </div>
                                   <button 
                                       onClick={() => handleRemoveParticipant(p.id)}
                                       className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-error hover:text-white"
                                   >
                                       <span className="material-symbols-outlined text-sm">close</span>
                                   </button>
                               </div>
                           )) : (
                               <div className="py-10 text-center opacity-20 font-black text-xs uppercase tracking-widest">Nenhum participante ainda.</div>
                           )}
                       </div>
                   </div>

                   <div className="p-8 bg-surface-container/10 border-t border-primary-container/5">
                       <p className="text-[10px] font-bold text-center text-on-surface-variant/40 italic">O saldo de pontos dos alunos é atualizado automaticamente ao entrar ou sair do Day Use.</p>
                   </div>
                </div>
            </div>
        )}

        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        `}</style>
      </div>
    </WavyBackground>
  );
}
