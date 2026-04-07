import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyAdmin } from '../lib/notifications';
import CPFModal from '../components/CPFModal';

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
}

export default function CourtBooking() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<number[]>([]);
  
  // Participant State
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [pointsPerHour, setPointsPerHour] = useState(15);
  const [userCPF, setUserCPF] = useState<string | null>(null);
  const [showCPFModal, setShowCPFModal] = useState(false);
  const [courtPrice, setCourtPrice] = useState(60);

  // Horários de funcionamento: 08:00 às 22:00
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  useEffect(() => {
    fetchOccupiedSlots();
    fetchPointsConfig();
    fetchUserProfile();
    fetchCourtPrice();
  }, [selectedDate]);

  useEffect(() => {
    if (searchTerm.length > 2) {
        searchProfiles();
    } else {
        setSearchResults([]);
    }
  }, [searchTerm]);

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

  async function fetchPointsConfig() {
      const { data } = await supabase
        .from('loyalty_config')
        .select('value')
        .eq('id', 'court_rental')
        .single();
      if (data) setPointsPerHour(data.value);
  }

  async function fetchCourtPrice() {
      const { data } = await supabase
        .from('court_configs')
        .select('court_price_per_hour')
        .eq('id', 'default')
        .single();
      if (data) setCourtPrice(Number(data.court_price_per_hour));
  }

  async function searchProfiles() {
      try {
        setSearching(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        // Busca fuzzy por nome (ilike com % no início e fim)
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .ilike('full_name', `%${searchTerm}%`)
            .neq('id', user?.id) // Não buscar a si mesmo
            .limit(6);
        setSearchResults(data || []);
      } catch (error) {
          console.error(error);
      } finally {
          setSearching(false);
      }
  }

  async function fetchOccupiedSlots() {
    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      // 1. Buscar aulas (classes) do dia
      const { data: classes } = await supabase
        .from('classes')
        .select('start_time')
        .filter('start_time', 'gte', `${dateString}T00:00:00`)
        .filter('start_time', 'lte', `${dateString}T23:59:59`);

      // 2. Buscar aluguéis de quadra aprovados
      const { data: rentals } = await supabase
        .from('court_rentals')
        .select('start_time, end_time')
        .eq('rental_date', dateString)
        .eq('status', 'aprovado');

      const occupied: number[] = [];
      
      classes?.forEach(c => {
        const hour = new Date(c.start_time).getHours();
        occupied.push(hour);
      });

      rentals?.forEach(r => {
        const start = parseInt(r.start_time.split(':')[0]);
        const end = parseInt(r.end_time.split(':')[0]);
        for (let i = start; i < end; i++) {
          occupied.push(i);
        }
      });

      setOccupiedSlots(Array.from(new Set(occupied)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSlot = (hour: number) => {
    if (occupiedSlots.includes(hour)) return;
    if (selectedSlots.includes(hour)) {
      setSelectedSlots(prev => prev.filter(s => s !== hour));
    } else {
      setSelectedSlots(prev => [...prev, hour].sort((a,b) => a - b));
    }
  };

  const addParticipant = (p: Profile) => {
    if (participants.some(existing => existing.id === p.id)) return;
    setParticipants([...participants, p]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  async function handleConfirm() {
    if (selectedSlots.length === 0) return;
    
    const isSequential = selectedSlots.every((val, i, arr) => 
        i === 0 || val === arr[i-1] + 1
    );

    if (!isSequential) {
        if (!confirm('Os horários selecionados não são sequenciais. Deseja continuar?')) return;
    }

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

      const dateString = selectedDate.toISOString().split('T')[0];
      const startHour = Math.min(...selectedSlots);
      const endHour = Math.max(...selectedSlots) + 1;

      // 1. Criar a reserva no banco (status pendente)
      const { data: rental, error: rentalError } = await supabase
        .from('court_rentals')
        .insert({
          student_id: user.id,
          court_name: 'QUADRA 1',
           rental_date: dateString,
          start_time: `${String(startHour).padStart(2, '0')}:00:00`,
          end_time: `${String(endHour).padStart(2, '0')}:00:00`,
          total_price: selectedSlots.length * courtPrice,
          status: 'pendente',
          participants: participants.map(p => p.id)
        })
        .select()
        .single();

      if (rentalError) throw rentalError;

      // 2. Chamar a Edge Function de Checkout
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { 
            booking_id: rental.id, 
            service_type: 'court_rental' 
        }
      });

      if (checkoutError) {
          console.error('Erro no Checkout MP:', checkoutError);
          alert(`Erro no Checkout (Supabase): ${checkoutError.message} - ${checkoutError.name}`);
          return;
      }

      // Notify Admin
      notifyAdmin('court_rental', {
        full_name: user.user_metadata?.full_name || 'Aluno',
        rental_date: new Date(dateString).toLocaleDateString('pt-BR'),
        time_label: `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`,
        price: selectedSlots.length * courtPrice
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
      <div className="bg-surface text-on-surface min-h-screen pb-48 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="ALUGUEL DE QUADRA" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
          {/* Header Section */}
          <section className="space-y-1">
            <div className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-[0.2em]">
              <span className="material-symbols-outlined text-sm">stadium</span>
              RESIDENCIAL SKEMA
            </div>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Agende sua <span className="text-secondary">Quadra</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Valor: R$ {courtPrice},00 por hora</p>
          </section>

          {/* Date Picker */}
          <section className="bg-white p-4 rounded-3xl shadow-sm border border-primary-container/10">
            <input 
                type="date" 
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => {
                    setSelectedDate(new Date(e.target.value));
                    setSelectedSlots([]);
                }}
                className="w-full bg-transparent border-none font-black text-center text-secondary focus:ring-0"
            />
          </section>

          {/* Participant Selection */}
          <section className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Quem vai jogar?</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Nome dos parceiros (ex: Felipe)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 bg-white rounded-2xl px-6 border border-primary-container/10 shadow-sm font-bold text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {searching ? (
                            <div className="w-5 h-5 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
                        ) : searchTerm.length > 0 ? (
                            <button onClick={() => setSearchTerm('')} className="text-on-surface-variant/40 hover:text-secondary">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        ) : (
                            <span className="material-symbols-outlined text-secondary/40 text-lg">search</span>
                        )}
                    </div>

                    {/* Search Results Dropdown - Now inside Relative for alignment */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-2xl shadow-2xl border border-primary-container/10 overflow-hidden absolute w-full left-0 z-[100] mt-2 ring-1 ring-black/5"
                            >
                                {searchResults.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => addParticipant(p)}
                                        className="w-full p-4 flex items-center gap-3 hover:bg-surface transition-colors border-b border-surface-container last:border-none group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 shrink-0">
                                            {p.avatar_url ? (
                                                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xs uppercase">{p.full_name.charAt(0)}</div>
                                            )}
                                        </div>
                                        <span className="font-bold text-sm text-on-surface group-hover:text-secondary">{p.full_name}</span>
                                        <span className="material-symbols-outlined ml-auto text-secondary/40 group-hover:text-secondary text-sm">add_circle</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </div>

              {/* Selected Chips */}
              <div className="flex flex-wrap gap-2">
                    {participants.map(p => (
                        <motion.div 
                            layout
                            key={p.id}
                            className="bg-secondary/10 border border-secondary/20 pl-2 pr-3 py-1.5 rounded-full flex items-center gap-2"
                        >
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{p.full_name.charAt(0)}</div>}
                            </div>
                            <span className="text-[10px] font-black text-secondary uppercase truncate max-w-[100px]">{p.full_name}</span>
                            <button onClick={() => removeParticipant(p.id)} className="text-secondary/40 hover:text-secondary active:scale-90 transition-all">
                                <span className="material-symbols-outlined text-sm font-black">close</span>
                            </button>
                        </motion.div>
                    ))}
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <p className="text-[10px] font-bold text-primary leading-relaxed uppercase tracking-widest text-center italic">
                      "Participantes que não forem incluídos na lista acima não receberão o crédito automático de pontos no Skema Points."
                  </p>
              </div>
          </section>

          {/* Time Slots Grid */}
          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Escolha os horários</label>
            <div className="grid grid-cols-3 gap-3">
                {hours.map(hour => {
                const isOccupied = occupiedSlots.includes(hour);
                const isSelected = selectedSlots.includes(hour);
                
                return (
                    <button
                    key={hour}
                    disabled={isOccupied}
                    onClick={() => toggleSlot(hour)}
                    className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all 
                        ${isOccupied 
                        ? 'bg-surface-container opacity-30 border-transparent cursor-not-allowed' 
                        : isSelected 
                            ? 'bg-secondary border-secondary text-white shadow-lg' 
                            : 'bg-white border-primary-container/20 text-on-surface-variant hover:border-secondary/30'
                        }
                    `}
                    >
                    <span className="text-sm font-headline font-black">{hour}:00</span>
                    <span className="text-[10px] font-bold uppercase opacity-60">{isOccupied ? 'Ocupado' : isSelected ? 'Selecionado' : 'Livre'}</span>
                    </button>
                );
                })}
            </div>
          </section>

          {/* Footer Summary - Responsive floating card */}
          {selectedSlots.length > 0 && (
            <div className="fixed bottom-24 left-6 right-6 z-50 animate-[slideUp_0.3s_ease]">
              <div className="bg-white px-8 py-6 rounded-[40px] shadow-2xl border-2 border-secondary/20 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">Total do Aluguel ({selectedSlots.length}h)</p>
                       <p className="text-3xl font-black text-secondary leading-none">R$ {selectedSlots.length * courtPrice},00</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-secondary/5 rounded-[24px] border border-secondary/10">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white shadow-lg shadow-secondary/20">
                        <span className="material-symbols-outlined font-black">stars</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Skema Points Bônus</p>
                        <p className="text-sm font-black text-on-surface leading-tight">
                            {selectedSlots.length * pointsPerHour} pontos <span className="text-on-surface-variant font-medium text-[11px] normal-case">para cada jogador!</span>
                        </p>
                    </div>
                </div>

                <button 
                    disabled={submitting}
                    onClick={handleConfirm}
                    className="w-full bg-on-surface text-surface h-16 rounded-[24px] font-headline font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {submitting ? 'PROCESSANDO...' : 'SOLICITAR RESERVA'}
                    {!submitting && <span className="material-symbols-outlined">bolt</span>}
                </button>
              </div>
            </div>
          )}

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
