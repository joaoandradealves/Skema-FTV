import React, { useEffect, useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [courtRentals, setCourtRentals] = useState<any[]>([]);
  const [nextClass, setNextClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyBookingsCount, setWeeklyBookingsCount] = useState(0);
  const [dayClasses, setDayClasses] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        // Profile with Plan
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, plan:plan_id(name, classes_per_week, billing_cycle)')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // All Bookings (Classes)
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            classes:class_id (*)
          `)
          .eq('student_id', user.id)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false });
        
        const futureBookings = (bookingsData || []).filter((b: any) => {
          return new Date(b.classes.start_time) >= new Date();
        });
        setBookings(futureBookings);

        // Court Rentals (As Requester OR Participant)
        const { data: rentalsData } = await supabase
          .from('court_rentals')
          .select('*')
          .or(`student_id.eq.${user.id},participants.cs.{${user.id}}`)
          .neq('status', 'cancelado')
          .order('rental_date', { ascending: true });
        setCourtRentals(rentalsData || []);

        // Cycle Count
        const now = new Date();
        let cycleCount = 0;
        if (profileData?.plan?.billing_cycle === 'mensal') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            cycleCount = bookingsData?.filter((b: any) => {
                const classTime = new Date(b.classes.start_time);
                return classTime >= startOfMonth && classTime <= endOfMonth;
            }).length || 0;
        } else {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.getFullYear(), now.getMonth(), diff);
            monday.setHours(0,0,0,0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23,59,59,999);

            cycleCount = bookingsData?.filter((b: any) => {
                const classTime = new Date(b.classes.start_time);
                return classTime >= monday && classTime <= sunday;
            }).length || 0;
        }
        setWeeklyBookingsCount(cycleCount);

        // Find Next Class
        const future = (bookingsData || [])
          .filter((b: any) => new Date(b.classes.start_time) > new Date() && b.status === 'agendado')
          .sort((a: any, b: any) => new Date(a.classes.start_time).getTime() - new Date(b.classes.start_time).getTime());
        if (future.length > 0) setNextClass(future[0].classes);

        // Fetch Loyalty Points
        const { data: pointsData } = await supabase
          .from('loyalty_points')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        setLoyaltyPoints(pointsData?.balance || 0);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
          .select('*, teacher:teacher_id(full_name)')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .order('start_time', { ascending: true });
        setDayClasses(data || []);
      } catch (error) {
        console.error(error);
      }
    }
    fetchDayClasses();
  }, [selectedDate]);

  async function handleBooking(cls: any) {
    try {
      setBookingLoading(cls.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      if (profile.plan_status !== 'ativo') {
        alert('Seu plano não está ativo ou aguarda aprovação!');
        return;
      }

      const now = new Date();
      const classStart = new Date(cls.start_time);
      const diffMs = classStart.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 48) {
        alert('As vagas abrem apenas 48 horas antes da aula!');
        return;
      }
      if (diffMs < 0) {
        alert('Esta aula já começou ou terminou!');
        return;
      }

      const limit = profile.plan.classes_per_week;
      const cycleText = profile.plan.billing_cycle === 'mensal' ? 'mensal' : 'semanal';
      if (weeklyBookingsCount >= limit) {
        alert(`Você atingiu seu limite ${cycleText} de ${limit} aulas!`);
        return;
      }

      const isAlreadyBooked = bookings.some(b => b.classes.id === cls.id);
      if (isAlreadyBooked) {
          alert('Você já tem check-in nesta aula!');
          return;
      }

      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .neq('status', 'cancelado');
      if ((count || 0) >= cls.max_students) {
        alert('Esta aula já está lotada!');
        return;
      }

      if (!confirm(`Confirmar check-in para ${cls.name} às ${new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}?`)) return;

      const { error } = await supabase.from('bookings').insert({
        student_id: user.id,
        class_id: cls.id,
        status: 'agendado'
      });

      if (error) throw error;
      alert('Check-in realizado com sucesso!');
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setBookingLoading(null);
    }
  }

  async function handleCancel(bookingId: string, startTime: string) {
    try {
      const now = new Date();
      const classTime = new Date(startTime);
      const diffInMs = classTime.getTime() - now.getTime();
      const hoursDiff = diffInMs / (1000 * 60 * 60);

      if (hoursDiff < 1.9) { 
          alert('Limite para cancelamento: Você só pode cancelar com até 2 horas de antecedência!');
          return;
      }

      if (confirm('Deseja realmente cancelar este agendamento?')) {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelado' })
            .eq('id', bookingId);
          if (error) throw error;
          alert('Cancelamento realizado!');
          window.location.reload();
      }
    } catch (error: any) {
      alert(error.message);
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
      <TopAppBar
        title="SKEMA BEACH CLUB"
        avatarSrc={profile?.avatar_url}
        avatarAlt={profile?.full_name || "Perfil"}
      />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-10">
        {/* Welcome Header */}
        <section className="flex justify-between items-start">
          <div className="text-white">
            <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight">Olá, {firstName}!</h2>
            <p className="text-white/70 font-medium mt-1 uppercase text-[10px] tracking-widest">
                {profile?.plan ? `${profile.plan.name} • ${weeklyBookingsCount}/${profile.plan.classes_per_week} no ciclo` : 'Sem plano ativo'}
            </p>
          </div>
          {profile?.plan && (
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-primary-container/20 min-w-[120px]">
                  <div className="text-[10px] font-black text-primary uppercase tracking-tighter">Vagas Restantes</div>
                  <div className="text-xl font-headline font-black text-primary leading-none">
                      {profile.plan.classes_per_week - weeklyBookingsCount}
                  </div>
              </div>
          )}
        </section>

        {/* Skema Points Card */}
        <Link to="/meu-pontos" className="block bg-[#1A1A1A] border-2 border-[#D4AF37]/30 p-6 rounded-[32px] shadow-xl group active:scale-95 transition-all overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transform rotate-12 transition-all">
                <span className="material-symbols-outlined text-[100px] text-[#D4AF37]">workspace_premium</span>
            </div>
            <div className="flex justify-between items-center relative z-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/80">Seu Programa de Fidelidade</p>
                    <h3 className="font-headline font-black text-2xl text-white">SKEMA <span className="text-[#D4AF37]">POINTS</span></h3>
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                        <span className="material-symbols-outlined text-sm font-bold">celebration</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Resgate prêmios exclusivos</p>
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

        {/* Leisure Quick Actions */}
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

        {/* Next Class or Promo */}
        {nextClass ? (
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-secondary to-secondary-container p-8 text-white shadow-xl">
             <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">Sua Próxima Aula</span>
              <h3 className="font-headline font-black text-3xl mb-2 tracking-tight">
                {new Date(nextClass.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {nextClass.name}
              </h3>
              <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {nextClass.court}
              </p>
            </div>
          </section>
        ) : null}

        {/* My Court Rentals SECTION - NEW */}
        <section className="space-y-6">
            <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-secondary decoration-4 underline-offset-8 mb-8">Quadras Reservadas</h4>
            <div className="space-y-4">
                {courtRentals.length > 0 ? courtRentals.map(rental => (
                    <div key={rental.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined font-black">stadium</span>
                        </div>
                        <div className="flex-1">
                            <h5 className="font-headline font-black text-on-surface leading-tight uppercase text-sm">{rental.court_name}</h5>
                            <p className="text-xs font-bold text-on-surface-variant tracking-tight mt-0.5">
                                {new Date(rental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {rental.start_time.slice(0, 5)} - {rental.end_time.slice(0, 5)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                                rental.status === 'aprovado' ? 'bg-primary/10 text-primary' : 
                                rental.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 'bg-surface text-on-surface-variant'
                            }`}>
                                {rental.status === 'aprovado' ? 'CONCLUÍDO' : rental.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 bg-white/30 rounded-[32px] border-2 border-dashed border-primary-container/10">
                         <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-40 italic">Nenhuma quadra agendada pela frente.</p>
                    </div>
                )}
            </div>
        </section>


        {/* My Class Bookings Section */}
        <section className="space-y-6">
          <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-primary decoration-4 underline-offset-8 mb-8">Meus Check-ins</h4>
          <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(booking => (
              <div key={booking.id} className="flex items-center gap-4 p-5 bg-white rounded-[28px] border-2 border-primary-container/10 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined font-bold">sports_volleyball</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-headline font-bold text-on-surface text-lg leading-none mb-1">{booking.classes.name}</h5>
                  <p className="text-xs font-bold text-on-surface-variant tracking-tight">
                    {new Date(booking.classes.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(booking.classes.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full text-secondary bg-secondary-container/30">
                    {booking.status}
                  </span>
                  <button onClick={() => handleCancel(booking.id, booking.classes.start_time)} className="text-[10px] font-black text-error/60 uppercase tracking-widest">Sair</button>
                </div>
              </div>
            )) : (
                <div className="text-center py-10 text-on-surface-variant font-medium italic opacity-50">Sua agenda de futevôlei está livre.</div>
            )}
          </div>
        </section>

        {/* Year/Month Selector - Simplified */}
        <section className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-[32px] shadow-sm border border-primary-container/10">
                {weekDays.map((date, idx) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    return (
                        <button key={idx} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isSelected ? 'bg-secondary text-white shadow-md' : 'text-on-surface-variant'}`}>
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][date.getDay()]}
                            </span>
                            <span className="text-sm font-black">{date.getDate()}</span>
                        </button>
                    )
                })}
            </div>
        </section>

         {/* Today's Classes List */}
         <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface-variant/40">Horários de Aula</h4>
            <Link to="/book-class" className="text-[10px] font-black text-secondary flex items-center gap-1 uppercase tracking-widest">Explorar Tudo <span className="material-symbols-outlined text-sm">chevron_right</span></Link>
          </div>
          <div className="space-y-3">
            {dayClasses.map(cls => (
                <div key={cls.id} className="bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                        </div>
                        <div>
                            <h5 className="font-headline font-bold text-on-surface text-sm uppercase leading-none">{new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {cls.name}</h5>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">{cls.court} • {cls.teacher?.full_name}</p>
                        </div>
                    </div>
                    <button onClick={() => handleBooking(cls)} disabled={bookingLoading === cls.id} className="h-10 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">
                        {bookingLoading === cls.id ? '...' : 'Check-in'}
                    </button>
                </div>
            ))}
          </div>
        </section>
      </main>

      <StudentNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
