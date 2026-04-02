import React, { useEffect, useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingModal from '../components/MarketingModal';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [courtRentals, setCourtRentals] = useState<any[]>([]);
  const [dayUseBookings, setDayUseBookings] = useState<any[]>([]);
  const [nextActivity, setNextActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyBookingsCount, setWeeklyBookingsCount] = useState(0);
  const [dayClasses, setDayClasses] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  // Roster State
  const [roster, setRoster] = useState<{ className: string, students: any[] } | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Rental Management States
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [rentalParticipants, setRentalParticipants] = useState<any[]>([]);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [rentalSearchTerm, setRentalSearchTerm] = useState('');
  const [rentalSearchResults, setRentalSearchResults] = useState<any[]>([]);
  const [isRentalSearching, setIsRentalSearching] = useState(false);
  
  // Day Use Management States
  const [selectedDayUse, setSelectedDayUse] = useState<any>(null);
  const [dayUseParticipants, setDayUseParticipants] = useState<any[]>([]);
  const [isDayUseModalOpen, setIsDayUseModalOpen] = useState(false);

  // Marketing States
  const [marketingMessage, setMarketingMessage] = useState<any>(null);
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, plan:plan_id(name, classes_per_week, billing_cycle)')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`id, status, plan_id, classes:class_id (*)`)
          .eq('student_id', user.id)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false });
        
        const futureBookings = (bookingsData || []).filter((b: any) => new Date(b.classes.start_time) >= new Date());
        setBookings(futureBookings);

        const { data: rentalsData } = await supabase
          .from('court_rentals')
          .select('*')
          .or(`student_id.eq.${user.id},participants.cs.{${user.id}}`)
          .neq('status', 'cancelado')
          .order('rental_date', { ascending: true });
        setCourtRentals(rentalsData || []);

        const { data: dayUseData } = await supabase
          .from('day_use_bookings')
          .select('*, day_use_offers(*)')
          .eq('student_id', user.id)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false });
        setDayUseBookings(dayUseData || []);

        const now = new Date();
        let cycleCount = 0;
        if (profileData?.plan?.billing_cycle === 'mensal') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            cycleCount = bookingsData?.filter((b: any) => new Date(b.classes.start_time) >= startOfMonth && new Date(b.classes.start_time) <= endOfMonth).length || 0;
        } else {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.getFullYear(), now.getMonth(), diff);
            monday.setHours(0,0,0,0);
            cycleCount = bookingsData?.filter((b: any) => new Date(b.classes.start_time) >= monday).length || 0;
        }
        setWeeklyBookingsCount(cycleCount);


        const { data: pointsData } = await supabase.from('loyalty_points').select('balance').eq('user_id', user.id).single();
        setLoyaltyPoints(pointsData?.balance || 0);

        // Calculate Next Activity
        const allPotentialNext = [
            ...(futureBookings || []).map((b: any) => ({
                id: b.id,
                type: 'AULA',
                title: b.classes.name,
                startTime: new Date(b.classes.start_time),
                endTime: new Date(new Date(b.classes.start_time).getTime() + 60 * 60 * 1000), // assume 1h
                location: b.classes.court,
                icon: 'sports_volleyball',
                color: 'bg-primary/10 text-primary',
                raw: b
            })),
            ...(rentalsData || []).map((r: any) => ({
                id: r.id,
                type: 'ALUGUEL',
                title: r.court_name,
                startTime: new Date(`${r.rental_date}T${r.start_time}`),
                endTime: new Date(`${r.rental_date}T${r.end_time}`),
                location: 'Quadra Reservada',
                icon: 'stadium',
                color: 'bg-secondary/10 text-secondary',
                raw: r
            })),
            ...(dayUseData || []).map((d: any) => ({
                id: d.id,
                type: 'DAY USE',
                title: 'Acesso ao Clube',
                startTime: new Date(`${d.day_use_offers?.offer_date}T${d.day_use_offers?.start_time}`),
                endTime: new Date(`${d.day_use_offers?.offer_date}T${d.day_use_offers?.end_time}`),
                location: 'Skema Beach Club',
                icon: 'wb_sunny',
                color: 'bg-orange-100 text-orange-600',
                raw: d
            }))
        ].filter(e => e.startTime > new Date())
         .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        if (allPotentialNext.length > 0) {
            setNextActivity(allPotentialNext[0]);
        } else {
            setNextActivity(null);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Marketing Logic: Show once per day
  useEffect(() => {
     async function checkMarketing() {
         try {
             const lastShow = localStorage.getItem('skema_last_marketing_show');
             const today = new Date().toISOString().split('T')[0];

             if (lastShow !== today) {
                 const { data, error } = await supabase
                     .from('marketing_messages')
                     .select('*')
                     .eq('is_active', true);
                 
                 if (!error && data && data.length > 0) {
                     // Pick a random active message
                     const randomMsg = data[Math.floor(Math.random() * data.length)];
                     setMarketingMessage(randomMsg);
                     setIsMarketingModalOpen(true);
                     localStorage.setItem('skema_last_marketing_show', today);
                 }
             }
         } catch (e) {
             console.error('Marketing error:', e);
         }
     }
     checkMarketing();
  }, []);

  useEffect(() => {
    async function fetchDayClasses() {
      try {
        const start = new Date(selectedDate);
        start.setHours(0,0,0,0);
        const end = new Date(selectedDate);
        end.setHours(23,59,59,999);

        const { data } = await supabase
          .from('classes')
          .select('*, teacher:teacher_id(full_name), bookings(status)')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .order('start_time', { ascending: true });
        setDayClasses(data || []);
      } catch (error) {
        console.error(error);
      }
    }
    fetchDayClasses();
  }, [selectedDate, bookings]); // Adicionado 'bookings' para atualizar o contador após cancelamento

  async function fetchRoster(cls: any) {
    try {
        setLoadingRoster(true);
        setRoster({ className: cls.name, students: [] }); // Set title immediately
        
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                student_id,
                profiles:student_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('class_id', cls.id)
            .eq('status', 'agendado');

        if (error) throw error;
        
        const students = data?.map((b: any) => ({
            full_name: b.profiles?.full_name || 'Aluno',
            avatar_url: b.profiles?.avatar_url
        })) || [];

        setRoster({ className: cls.name, students });
    } catch (error: any) {
        alert('Erro ao carregar lista: ' + error.message);
    } finally {
        setLoadingRoster(false);
    }
  }

  // Rental Management
  async function openRentalModal(rental: any) {
      setSelectedRental(rental);
      setIsRentalModalOpen(true);
      setRentalParticipants([]);
      if (rental.participants && rental.participants.length > 0) {
          const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', rental.participants);
          setRentalParticipants(data || []);
      }
  }

  async function searchRentalProfiles() {
      setIsRentalSearching(true);
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').ilike('full_name', `%${rentalSearchTerm}%`).neq('id', profile.id).limit(5);
      setRentalSearchResults(data || []);
      setIsRentalSearching(false);
  }

  useEffect(() => {
    if (rentalSearchTerm.length >= 2) searchRentalProfiles();
    else setRentalSearchResults([]);
  }, [rentalSearchTerm]);

  async function addParticipant(p: any) {
      if (rentalParticipants.some(rp => rp.id === p.id)) return;
      const updatedParticipants = [...(selectedRental.participants || []), p.id];
      const { error } = await supabase.from('court_rentals').update({ participants: updatedParticipants }).eq('id', selectedRental.id);
      if (error) { alert('Erro ao adicionar'); return; }
      setRentalParticipants([...rentalParticipants, p]);
      setSelectedRental({ ...selectedRental, participants: updatedParticipants });
      setCourtRentals(current => current.map(r => r.id === selectedRental.id ? { ...r, participants: updatedParticipants } : r));
      setRentalSearchTerm('');
  }

  async function removeParticipant(pId: string) {
      try {
          const updatedParticipants = selectedRental.participants.filter((id: string) => id !== pId);
          const { error } = await supabase.from('court_rentals').update({ participants: updatedParticipants }).eq('id', selectedRental.id);
          if (error) throw error;
          setRentalParticipants(rentalParticipants.filter(p => p.id !== pId));
          setSelectedRental({ ...selectedRental, participants: updatedParticipants });
          setCourtRentals(current => current.map(r => r.id === selectedRental.id ? { ...r, participants: updatedParticipants } : r));
      } catch (error: any) {
          alert('Erro ao remover: ' + error.message);
      }
  }

  async function handleCancelRental() {
      try {
          const now = new Date();
          const rentalTime = new Date(`${selectedRental.rental_date}T${selectedRental.start_time}`);
          const hoursDiff = (rentalTime.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursDiff < 2) { alert('Mínimo 2 horas para cancelar!'); return; }
          if (!confirm('Deseja cancelar o aluguel? Todos os pontos serão estornados.')) return;

          const { error } = await supabase.from('court_rentals').update({ status: 'cancelado' }).eq('id', selectedRental.id);
          if (error) throw error;
          alert('Aluguel cancelado!');
          window.location.reload();
      } catch (error: any) {
          console.error(error);
          alert('Erro ao cancelar aluguel: ' + error.message);
      }
  }

  async function openDayUseModal(booking: any) {
      setSelectedDayUse(booking);
      setIsDayUseModalOpen(true);
      setDayUseParticipants([]);
      const { data } = await supabase
        .from('day_use_bookings')
        .select('profiles:student_id(id, full_name, avatar_url)')
        .eq('offer_id', booking.offer_id)
        .eq('status', 'aprovado');
      
      const participants = data?.map((d: any) => d.profiles) || [];
      setDayUseParticipants(participants);
  }

  async function handleCancelDayUse() {
      if (!confirm('Deseja cancelar sua participação no Day Use? Os pontos serão estornados.')) return;
      try {
          const { error } = await supabase
            .from('day_use_bookings')
            .update({ status: 'cancelado' })
            .eq('id', selectedDayUse.id);
            
          if (error) throw error;
          
          alert('reserva cancelada com sucesso!');
          setSelectedDayUse(null);
          window.location.reload();
      } catch (error: any) {
          alert('Erro ao cancelar: ' + error.message);
      }
  }

  async function handleBooking(cls: any) {
    try {
      setBookingLoading(cls.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;
      if (profile.plan_status !== 'ativo') { alert('Seu plano não está ativo!'); return; }
      
      const now = new Date();
      const classStart = new Date(cls.start_time);
      const diffMs = classStart.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 48) { alert('Vagas abrem 48h antes!'); return; }
      if (diffMs < 0) { alert('Aula já começou!'); return; }

      const limit = profile.plan.classes_per_week;
      if (weeklyBookingsCount >= limit) { alert('Limite de aulas atingido!'); return; }

      if (!confirm(`Confirmar futevôlei às ${new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}?`)) return;

      // 1. Verificar se já existe QUALQUER registro (inclusive cancelado)
      const { data: existingAll } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('class_id', cls.id)
        .eq('student_id', user.id)
        .single();

      if (existingAll) {
          if (existingAll.status === 'agendado') {
              alert('Você já está inscrito nesta aula!');
              return;
          }

          // Se estava cancelado, REATIVAMOS o registro existente
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
                status: 'agendado',
                plan_id: profile.plan_id 
            })
            .eq('id', existingAll.id);

          if (updateError) throw updateError;
      } else {
          const { error: insertError } = await supabase.from('bookings').insert({ 
            student_id: user.id, 
            class_id: cls.id, 
            status: 'agendado',
            plan_id: profile.plan_id 
          });
          if (insertError) throw insertError;
      }

      // Enviar e-mail de confirmação para o aluno
      const { notifyAdmin } = await import('../lib/notifications');
      await notifyAdmin('booking_confirmed', {
        email: profile.email,
        full_name: profile.full_name,
        class_name: cls.name,
        date: new Date(cls.start_time).toLocaleDateString('pt-BR'),
        time: new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        court: cls.court
      });

      // Se o plano for do tipo 'avulso', consumimos ele imediatamente
      if (profile.plan?.type === 'avulso') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            plan_id: null, 
            plan_status: 'nenhum' 
          })
          .eq('id', user.id);
        if (profileError) throw profileError;
      }

      alert('Check-in realizado!');
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setBookingLoading(null);
    }
  }

  async function handleCancelBooking(booking: any) {
    try {
      const classStart = new Date(booking.classes.start_time);
      const now = new Date();
      const diffMs = classStart.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 2) {
        alert('O cancelamento deve ser feito com pelo menos 2 horas de antecedência.');
        return;
      }

      if (!confirm('Deseja realmente cancelar este check-in?')) return;

      setBookingLoading(booking.id);

      // 1. Marcar agendamento como cancelado
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelado' })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // 2. Se a aula foi paga com um plano, verificar se precisamos devolver
      if (booking.plan_id) {
          // Buscamos o tipo do plano que foi usado
          const { data: planData } = await supabase
            .from('plans')
            .select('type')
            .eq('id', booking.plan_id)
            .single();

          // Se o plano era 'avulso', devolvemos ele ao aluno
          if (planData?.type === 'avulso') {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ 
                plan_id: booking.plan_id, 
                plan_status: 'ativo' 
              })
              .eq('id', booking.student_id);
            if (profileError) throw profileError;
            alert('Check-in cancelado e crédito avulso devolvido!');
          } else {
            alert('Check-in cancelado com sucesso!');
          }
      } else {
          alert('Check-in cancelado com sucesso!');
      }

      window.location.reload();
    } catch (error: any) {
      alert('Erro ao cancelar: ' + error.message);
    } finally {
      setBookingLoading(null);
    }
  }

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : '...';
  const weekDays = (() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const nextDay = new Date(startOfWeek);
        nextDay.setDate(startOfWeek.getDate() + i);
        days.push(nextDay);
    }
    return days;
  })();

  const capitalizedMonth = selectedDate.toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase());

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Carregando portal Skema...</div>;

  return (
    <WavyBackground topHeight="25%">
      <div className="pb-32 min-h-screen font-body relative">
        <TopAppBar title="SKEMA BEACH CLUB" avatarSrc={profile?.avatar_url} avatarAlt={profile?.full_name || "Perfil"} />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
          {/* 1. Welcome Header & Vagas */}
          <section className="flex justify-between items-start text-white">
            <div>
              <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight">Olá, {firstName}!</h2>
              <p className="text-white/70 font-medium mt-1 uppercase text-[10px] tracking-widest leading-none">
                  {profile?.plan ? `${profile.plan.name} • ${weeklyBookingsCount}/${profile.plan.classes_per_week} no ciclo` : 'Sem plano ativo'}
              </p>
            </div>
            {profile?.plan && (
                <div className="bg-white p-3 rounded-2xl shadow-lg border border-primary-container/20 min-w-[120px] text-primary">
                    <div className="text-[10px] font-black uppercase tracking-tighter">Vagas Restantes</div>
                    <div className="text-xl font-headline font-black leading-none">
                        {profile.plan.classes_per_week - weeklyBookingsCount}
                    </div>
                </div>
            )}
          </section>

          {/* 2. Skema Points Card (O FAVORITO) */}
          <Link to="/meu-pontos" className="block bg-[#1A1A1A] border-2 border-[#D4AF37]/30 p-6 rounded-[32px] shadow-xl group active:scale-95 transition-all overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transform rotate-12 transition-all">
                  <span className="material-symbols-outlined text-[100px] text-[#D4AF37]">workspace_premium</span>
              </div>
              <div className="flex justify-between items-center relative z-10">
                  <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/80">Seu Programa de Fidelidade</p>
                      <h3 className="font-headline font-black text-2xl text-white uppercase italic tracking-tighter">SKEMA <span className="text-[#D4AF37]">POINTS</span></h3>
                      <div className="flex items-center gap-2 text-[#D4AF37]">
                          <span className="material-symbols-outlined text-sm font-bold">celebration</span>
                          <p className="text-[10px] font-bold uppercase tracking-widest leading-none">Resgate prêmios exclusivos</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Saldo</p>
                      <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-3xl font-black text-[#D4AF37]">{loyaltyPoints}</span>
                          <span className="text-[10px] font-bold text-white/60">pts</span>
                      </div>
                  </div>
              </div>
          </Link>

          {/* 2.5 Next Activity Card */}
          {nextActivity && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-primary-container/10 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                      <span className="material-symbols-outlined text-6xl">{nextActivity.icon}</span>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${nextActivity.color}`}>
                          <span className="material-symbols-outlined text-3xl font-black">{nextActivity.icon}</span>
                      </div>
                      <div className="flex-1">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-1">SUA PRÓXIMA ATIVIDADE</p>
                          <h4 className="font-headline font-black text-xl text-on-surface leading-tight">{nextActivity.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-xs font-bold text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  {nextActivity.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                                  {nextActivity.startTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                          </div>
                      </div>
                      <button 
                         onClick={() => {
                             if (nextActivity.type === 'AULA') fetchRoster(nextActivity.raw.classes);
                             else if (nextActivity.type === 'ALUGUEL') openRentalModal(nextActivity.raw);
                             else if (nextActivity.type === 'DAY USE') openDayUseModal(nextActivity.raw);
                         }}
                         className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-secondary hover:text-white transition-all shadow-sm"
                      >
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                  </div>
              </motion.div>
          )}

          {/* 3. Quick Actions */}
          <section className="grid grid-cols-2 gap-4">
             <Link to="/court-booking" className="bg-white p-6 rounded-[32px] shadow-sm border border-primary-container/10 flex flex-col items-center gap-3 active:scale-95 transition-all text-center group">
                <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">stadium</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-secondary-container uppercase tracking-widest">Aluguel</p>
                  <h4 className="font-headline font-black text-on-surface">Quadra</h4>
                </div>
             </Link>
             <Link to="/day-use" className="bg-white p-6 rounded-[32px] shadow-sm border border-primary-container/10 flex flex-col items-center gap-3 active:scale-95 transition-all text-center group">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">wb_sunny</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary-container uppercase tracking-widest">Reserva</p>
                  <h4 className="font-headline font-black text-on-surface">Day Use</h4>
                </div>
             </Link>
          </section>

          {/* 4. Quadras Reservadas Section (WITH GESTÃO) */}
          <section className="space-y-6">
              <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-secondary decoration-4 underline-offset-8 mb-8">Quadras Reservadas</h4>
              <div className="space-y-4">
                  {courtRentals.length > 0 ? courtRentals.map(rental => {
                      const isPast = new Date(`${rental.rental_date}T${rental.start_time}`) < new Date();
                      return (
                          <button key={rental.id} onClick={() => openRentalModal(rental)} className={`w-full bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm flex items-center gap-4 text-left active:scale-[0.98] transition-all group ${isPast ? 'opacity-40 grayscale-[0.6]' : ''}`}>
                              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all">
                                  <span className="material-symbols-outlined font-black">stadium</span>
                              </div>
                              <div className="flex-1">
                                  <h5 className="font-headline font-black text-on-surface leading-tight uppercase text-sm">{rental.court_name}</h5>
                                  <p className="text-xs font-bold text-on-surface-variant tracking-tight mt-0.5">
                                      {new Date(rental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {rental.start_time.slice(0, 5)} às {rental.end_time.slice(0, 5)}
                                  </p>
                              </div>
                              <div className="text-right">
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isPast ? 'bg-surface-container-highest text-on-surface-variant' : (rental.status === 'aprovado' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600')}`}>
                                      {isPast ? 'FINALIZADO' : (rental.status === 'aprovado' ? 'PAGO' : rental.status.toUpperCase())}
                                  </span>
                              </div>
                          </button>
                      );
                  }) : (
                      <div className="text-center py-10 bg-white/30 rounded-[32px] border-2 border-dashed border-primary-container/10">
                           <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-40 italic">Nenhuma quadra reservada.</p>
                      </div>
                  )}
              </div>
          </section>

          {/* 4.5. Day Use Section */}
          <section className="space-y-6">
              <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-primary decoration-4 underline-offset-8 mb-8">Meus Day Use</h4>
              <div className="space-y-4">
                  {dayUseBookings.length > 0 ? dayUseBookings.map(booking => {
                      const isPast = booking.day_use_offers ? new Date(booking.day_use_offers.offer_date + 'T00:00:00') < new Date() : false;
                      return (
                          <button key={booking.id} onClick={() => openDayUseModal(booking)} className={`w-full bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm flex items-center gap-4 text-left transition-all active:scale-[0.98] group ${isPast ? 'opacity-40 grayscale-[0.6]' : ''}`}>
                              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
                                  <span className="material-symbols-outlined font-black">wb_sunny</span>
                              </div>
                              <div className="flex-1">
                                  <h5 className="font-headline font-black text-on-surface leading-tight uppercase text-sm">DAY USE</h5>
                                  <p className="text-xs font-bold text-on-surface-variant tracking-tight mt-0.5">
                                      {booking.day_use_offers ? (
                                          `${new Date(booking.day_use_offers.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • ${booking.day_use_offers.start_time.slice(0,5)} às ${booking.day_use_offers.end_time.slice(0,5)}`
                                      ) : 'Data não definida'}
                                  </p>
                              </div>
                              <div className="text-right">
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isPast ? 'bg-surface-container-highest text-on-surface-variant' : (booking.status === 'aprovado' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600 animate-pulse')}`}>
                                      {isPast ? 'FINALIZADO' : (booking.status === 'aprovado' ? 'APROVADO' : 'AGUARDANDO')}
                                  </span>
                              </div>
                          </button>
                      );
                  }) : (
                      <div className="text-center py-10 bg-white/30 rounded-[32px] border-2 border-dashed border-primary-container/10">
                           <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-40 italic">Nenhum Day Use solicitado.</p>
                      </div>
                  )}
              </div>
          </section>

          {/* 5. Meus Check-ins (AULAS) */}
          <section className="space-y-6">
            <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-primary decoration-4 underline-offset-8 mb-8">Meus Check-ins</h4>
            <div className="space-y-4">
              {bookings.length > 0 ? bookings.map(booking => {
                const isPast = new Date(booking.classes.start_time) < new Date();
                return (
                  <div key={booking.id} className={`flex items-center gap-4 p-5 bg-white rounded-[28px] border-2 border-primary-container/10 shadow-sm transition-all ${isPast ? 'opacity-40 grayscale-[0.6]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined font-bold">sports_volleyball</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-headline font-bold text-on-surface text-lg leading-none mb-1">{booking.classes.name}</h5>
                      <p className="text-xs font-bold text-on-surface-variant tracking-tight uppercase">
                        {new Date(booking.classes.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(booking.classes.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${isPast ? 'bg-surface-container-highest text-on-surface-variant' : 'text-secondary bg-secondary-container/30'}`}>
                            {isPast ? 'FINALIZADO' : booking.status}
                        </span>
                        {!isPast && (
                            <button 
                                onClick={() => handleCancelBooking(booking)}
                                disabled={bookingLoading === booking.id}
                                className="text-[9px] font-black uppercase text-error/60 hover:text-error transition-colors"
                            >
                                {bookingLoading === booking.id ? '...' : 'Cancelar'}
                            </button>
                        )}
                    </div>
                  </div>
                );
              }) : (
                  <div className="text-center py-10 text-on-surface-variant font-medium italic opacity-50 px-12 leading-tight">Sua agenda de futevôlei está livre.</div>
              )}
            </div>
          </section>

          {/* 6. Calendário & Horários de Aula */}
          <section className="space-y-8">
            <div className="grid grid-cols-7 gap-2 bg-white p-4 rounded-[32px] shadow-sm border border-primary-container/10">
                {weekDays.map((date, idx) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    return (
                        <button key={idx} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isSelected ? 'bg-secondary text-white shadow-md scale-105' : 'text-on-surface-variant'}`}>
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][date.getDay()]}
                            </span>
                            <span className="text-sm font-black">{date.getDate()}</span>
                        </button>
                    )
                })}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface-variant/40">Horários de Aula</h4>
                <Link to="/book-class" className="text-[10px] font-black text-secondary flex items-center gap-1 uppercase tracking-widest">Explorar Tudo <span className="material-symbols-outlined text-sm">chevron_right</span></Link>
              </div>
              <div className="space-y-3">
                {dayClasses.map(cls => {
                    const isPast = new Date(cls.start_time) < new Date();
                    const isBooked = bookings.some(b => b.classes.id === cls.id && b.status === 'agendado');
                    return (
                        <div key={cls.id} className={`bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm flex items-center justify-between group transition-all ${isPast ? 'opacity-40 grayscale-[0.6]' : ''}`}>
                                <div 
                                    onClick={() => fetchRoster(cls)}
                                    className="cursor-pointer group flex items-center gap-4"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPast ? 'bg-surface-container-highest text-on-surface-variant/40' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                                        <span className="material-symbols-outlined text-sm">groups</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h5 className={`font-headline font-bold text-sm uppercase leading-none ${isPast ? 'text-on-surface-variant/40' : 'text-on-surface'}`}>{new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {cls.name}</h5>
                                            {(cls.bookings || []).filter((b: any) => b.status === 'agendado').length > 0 && (
                                                <span className="text-[9px] font-black bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md">
                                                    {(cls.bookings || []).filter((b: any) => b.status === 'agendado').length}/{cls.capacity || 8}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">{cls.court} • {cls.teacher?.full_name}</p>
                                    </div>
                                </div>
                            <button 
                                onClick={() => !isPast && !isBooked && handleBooking(cls)} 
                                disabled={isPast || bookingLoading === cls.id || isBooked} 
                                className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all ${isPast || isBooked ? 'bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed shadow-none' : 'bg-primary text-white active:scale-95'}`}
                            >
                                {bookingLoading === cls.id ? '...' : (isBooked ? 'Agendado' : (isPast ? 'Encerrado' : 'Check-in'))}
                            </button>
                        </div>
                    );
                })}
              </div>
            </div>
          </section>
        </main>

        {/* Modal: Rental Management */}
        <AnimatePresence>
            {isRentalModalOpen && selectedRental && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRentalModalOpen(false)} className="fixed inset-0 bg-secondary/40 backdrop-blur-md z-[60]" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] z-[70] p-8 pb-12 max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-surface-container rounded-full mx-auto mb-8 opacity-40" />
                        
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-container mb-1">Gerenciar Aluguel</p>
                                <h3 className="font-headline font-black text-3xl text-on-surface uppercase">{selectedRental.court_name}</h3>
                            </div>
                            <div className="text-right">
                                <h4 className="font-headline font-black text-secondary text-lg leading-none">{selectedRental.start_time.slice(0, 5)} às {selectedRental.end_time.slice(0, 5)}</h4>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{new Date(selectedRental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>

                        {/* Team Section */}
                        <div className="space-y-6">
                            <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface/50">Time Convocado</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-primary-container/5 relative overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-black">⭐</div>
                                    <span className="font-bold text-sm uppercase flex-1">{profile.full_name} (Você)</span>
                                    <span className="text-[9px] font-black uppercase text-secondary/60">Capitão</span>
                                </div>
                                {rentalParticipants.map(p => (
                                    <div key={p.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-primary-container/10 shadow-sm">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10">
                                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold">{p.full_name.charAt(0)}</div>}
                                        </div>
                                        <span className="font-bold text-sm uppercase flex-1">{p.full_name}</span>
                                        {profile.id === selectedRental.student_id && (
                                            <button onClick={() => removeParticipant(p.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all"><span className="material-symbols-outlined text-sm">remove</span></button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {profile.id === selectedRental.student_id && (
                                <div className="space-y-3 pt-4 border-t border-surface-container/20">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar parceiros..." 
                                            value={rentalSearchTerm}
                                            onChange={(e) => setRentalSearchTerm(e.target.value)}
                                            className="w-full h-14 bg-surface rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-secondary transition-all"
                                        />
                                        <AnimatePresence>
                                            {rentalSearchResults.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-x-0 bottom-full mb-2 bg-white rounded-2xl shadow-2xl border border-primary-container/10 overflow-hidden z-20">
                                                    {rentalSearchResults.map(s => (
                                                        <button key={s.id} onClick={() => addParticipant(s)} className="w-full p-4 flex items-center gap-3 hover:bg-surface transition-colors border-b border-surface-container last:border-none group">
                                                            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-[10px]">{s.full_name.charAt(0)}</div>
                                                            <span className="font-bold text-sm uppercase group-hover:text-secondary">{s.full_name}</span>
                                                            <span className="material-symbols-outlined ml-auto text-secondary text-sm">add</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <p className="text-[10px] font-bold text-on-surface-variant/40 italic px-2">Dica: Adicione parceiros para sincronizar os pontos!</p>
                                </div>
                            )}

                            <div className="pt-8 flex flex-col gap-4">
                                <button onClick={handleCancelRental} className="w-full h-16 bg-error/10 text-error rounded-3xl font-headline font-black uppercase tracking-widest text-xs">Cancelar Aluguel</button>
                                <button onClick={() => setIsRentalModalOpen(false)} className="w-full h-12 text-on-surface-variant/40 font-black uppercase tracking-widest text-[10px]">Fechar</button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {/* Modal: Day Use Management */}
        <AnimatePresence>
            {isDayUseModalOpen && selectedDayUse && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDayUseModalOpen(false)} className="fixed inset-0 bg-secondary/40 backdrop-blur-md z-[80]" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] z-[90] p-8 pb-12 max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="w-12 h-1.5 bg-surface-container rounded-full mx-auto mb-8 opacity-40" />
                        
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-container mb-1">Gerenciar Day Use</p>
                                <h3 className="font-headline font-black text-3xl text-on-surface uppercase italic">DAY <span className="text-secondary">USE</span></h3>
                            </div>
                            <div className="text-right">
                                <h4 className="font-headline font-black text-secondary text-lg leading-none">{selectedDayUse.day_use_offers?.start_time.slice(0, 5)}</h4>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{selectedDayUse.day_use_offers ? new Date(selectedDayUse.day_use_offers.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'Dia Confirmado'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface/50">Quem vai estar lá ☀️</h4>
                            <div className="space-y-3">
                                {dayUseParticipants.length > 0 ? dayUseParticipants.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-primary-container/10 shadow-sm">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10">
                                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold">{p.full_name?.charAt(0) || 'S'}</div>}
                                        </div>
                                        <span className="font-bold text-sm uppercase flex-1">{p.full_name} {p.id === profile.id && '(Você)'}</span>
                                        {p.id === profile.id && <span className="text-[9px] font-black uppercase text-secondary/60">Titular</span>}
                                    </div>
                                )) : (
                                    <div className="text-center py-6 opacity-40 text-[10px] font-black uppercase tracking-widest italic">Aguardando participantes...</div>
                                )}
                            </div>

                            <div className="pt-8 flex flex-col gap-4">
                                <button onClick={handleCancelDayUse} className="w-full h-16 bg-error/10 text-error rounded-3xl font-headline font-black uppercase tracking-widest text-xs">Cancelar Minha Reserva</button>
                                <button onClick={() => setIsDayUseModalOpen(false)} className="w-full h-12 text-on-surface-variant/40 font-black uppercase tracking-widest text-[10px]">Fechar</button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        <StudentNavbar activePage="home" />

        {/* Modal: Roster View (Quem vai treinar) */}
        <AnimatePresence>
            {roster && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setRoster(null)}
                        className="absolute inset-0 bg-secondary/40 backdrop-blur-md"
                    />
                    <motion.div 
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl space-y-6 overflow-hidden"
                    >
                        <div className="text-center space-y-1">
                            <div className="w-12 h-1.5 bg-surface-container rounded-full mx-auto mb-4 opacity-20" />
                            <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight uppercase leading-none">QUEM VAI TREINAR? 🏐</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{roster.className}</p>
                        </div>

                        <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[100px]">
                            {loadingRoster ? (
                                <div className="py-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Chamando a turma...</div>
                            ) : roster.students.length > 0 ? (
                                roster.students.map((student: any, idx: number) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={idx} 
                                        className="bg-surface p-4 rounded-3xl border border-primary-container/10 flex items-center gap-4 shadow-sm"
                                    >
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl overflow-hidden border border-primary/5 flex items-center justify-center">
                                            {student.avatar_url ? (
                                                <img src={student.avatar_url} alt={student.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-primary/30">person</span>
                                            )}
                                        </div>
                                        <span className="font-headline font-black text-sm text-on-surface uppercase tracking-tight">{student.full_name}</span>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-on-surface-variant/40 font-medium italic text-xs px-10">Ninguém agendado ainda. Seja o primeiro! 🎾</div>
                            )}
                        </div>

                        <button 
                            onClick={() => setRoster(null)}
                            className="w-full h-16 bg-secondary text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg shadow-secondary/20 active:scale-95 transition-all"
                        >
                            FECHAR
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <MarketingModal 
            isOpen={isMarketingModalOpen} 
            onClose={() => setIsMarketingModalOpen(false)} 
            message={marketingMessage} 
        />
      </div>
    </WavyBackground>
  );
}
