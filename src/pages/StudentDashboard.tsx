import React, { useEffect, useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
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

        // All Bookings
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

        // Cycle Count (Weekly or Monthly)
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
            // Default: Weekly
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

      // 1. Plan Active Check
      if (profile.plan_status !== 'ativo') {
        alert('Seu plano não está ativo ou aguarda aprovação!');
        return;
      }

      // 2. 48h Check
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

      // 3. Cycle Limit Check
      const limit = profile.plan.classes_per_week;
      const cycleText = profile.plan.billing_cycle === 'mensal' ? 'mensal' : 'semanal';
      if (weeklyBookingsCount >= limit) {
        alert(`Você atingiu seu limite ${cycleText} de ${limit} aulas!`);
        return;
      }

      // 4. Duplicate Check
      const isAlreadyBooked = bookings.some(b => b.classes.id === cls.id);
      if (isAlreadyBooked) {
          alert('Você já tem check-in nesta aula!');
          return;
      }

      // 5. Full Class Check
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .neq('status', 'cancelado');
      
      if ((count || 0) >= cls.max_students) {
        alert('Esta aula já está lotada!');
        return;
      }

      // 6. Confirm
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

      // Buffer de 5 minutos para erros de fuso horário de milissegundos
      if (hoursDiff < 1.9) { 
          alert('Limite para cancelamento: Você só pode cancelar com até 2 horas de antecedência! Entre em contato com o suporte se necessário.');
          return;
      }

      if (confirm('Deseja realmente cancelar este agendamento?')) {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelado' })
            .eq('id', bookingId)
            .select(); // Força o retorno para garantir que deu certo

          if (error) throw error;
          
          alert('Cancelamento realizado! Seus pontos foram estornados.');
          window.location.reload();
      }
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      alert(`Erro no cancelamento: ${error.message || 'Verifique sua conexão'}`);
    }
  }

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : '...';

  const getWeekDays = () => {
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
  };

  const weekDays = getWeekDays();
  const monthName = selectedDate.toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const yearName = selectedDate.getFullYear();

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Carregando portal Skema...</div>;

  return (
    <WavyBackground topHeight="25%">
      <div className="pb-32 min-h-screen font-body relative">
      <TopAppBar
        title="SKEMA BEACH CLUB"
        avatarSrc={profile?.avatar_url}
        avatarAlt={profile?.full_name || "Perfil"}
      />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        {/* Welcome Header */}
        <section className="flex justify-between items-start">
          <div className="text-white">
            <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight">
                Olá, {firstName}!
            </h2>
            <p className="text-white/70 font-medium mt-1 uppercase text-[10px] tracking-widest">
                {profile?.plan ? `${profile.plan.name} • ${weeklyBookingsCount}/${profile.plan.classes_per_week} no ${profile.plan.billing_cycle === 'mensal' ? 'mês' : 'semana'}` : 'Sem plano ativo'}
            </p>
          </div>
          {profile?.plan && (
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-primary-container/20 min-w-[120px]">
                  <div className="text-[10px] font-black text-primary uppercase tracking-tighter">Saldo {profile.plan.billing_cycle === 'mensal' ? 'Mensal' : 'Semanal'}</div>
                  <div className="text-xl font-headline font-black text-primary leading-none">
                      {profile.plan.classes_per_week - weeklyBookingsCount} <span className="text-[10px] opacity-60">Restantes</span>
                  </div>
              </div>
          )}
        </section>

        {/* Skema Points Reward Card */}
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


        {/* Next Class Highlight */}
        {nextClass ? (
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-secondary to-secondary-container p-8 text-white shadow-xl">
             <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">Sua Próxima Aula</span>
              <h3 className="font-headline font-black text-3xl mb-2 tracking-tight">
                {new Date(nextClass.start_time).toLocaleDateString('pt-BR', { weekday: 'long' }) === new Date().toLocaleDateString('pt-BR', { weekday: 'long' }) ? 'Hoje' : 'Em breve'}, {new Date(nextClass.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </h3>
              <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {nextClass.court} • {nextClass.name}
              </p>
            </div>
            <div className="absolute -bottom-8 -right-8 opacity-10 rotate-12">
              <span className="material-symbols-outlined text-[160px]">waves</span>
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] bg-white p-8 border-2 border-dashed border-primary-container/20 text-center space-y-4 shadow-sm">
             <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto">
                 <span className="material-symbols-outlined text-primary/30 text-3xl">event_busy</span>
             </div>
             <div>
                <p className="text-on-surface font-headline font-black text-lg">Nenhuma aula agendada</p>
                <p className="text-on-surface-variant text-sm font-medium px-8 leading-tight">Agende seu futevôlei ou alugue uma quadra abaixo!</p>
             </div>
             <Link to="/book-class" className="inline-block px-6 py-3 bg-secondary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">Agendar Agora</Link>
          </section>
        )}
        
        {/* Leisure Services Section */}
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

        {/* Calendar Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h4 className="font-headline font-bold text-xl uppercase tracking-tighter">{capitalizedMonth} {yearName}</h4>
          </div>
          <div className="grid grid-cols-7 gap-2 bg-white p-4 rounded-[32px] shadow-sm border border-primary-container/10">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{day}</div>
            ))}
            {weekDays.map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-2xl font-black text-sm transition-all duration-300 relative
                    ${isSelected 
                      ? 'bg-secondary text-white shadow-lg scale-110 z-10' 
                      : 'bg-surface text-on-surface-variant border border-primary-container/20'
                    }
                  `}
                >
                  {date.getDate()}
                  {isToday && !isSelected && <span className="absolute -bottom-1 w-1 h-1 bg-secondary rounded-full animate-ping"></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Classes for Selected Day */}
        <section className="space-y-4">
          <h4 className="font-headline font-bold text-lg uppercase tracking-widest text-on-surface/50 text-center">Aulas para {selectedDate.toLocaleDateString('pt-BR', {day: 'numeric', month: 'long'})}</h4>
          <div className="space-y-3">
            {dayClasses.length > 0 ? dayClasses.map(cls => {
                const isBooked = bookings.some(b => b.classes.id === cls.id);
                return (
                  <div key={cls.id} className="bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined font-black">sports_volleyball</span>
                        </div>
                        <div>
                            <h5 className="font-headline font-bold text-on-surface">{new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {cls.name}</h5>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{cls.court} • Prof. {cls.teacher?.full_name || 'Skema'}</p>
                        </div>
                    </div>
                    {isBooked ? (
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Já agendado</span>
                    ) : (
                        <button 
                            onClick={() => handleBooking(cls)}
                            disabled={bookingLoading === cls.id}
                            className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all disabled:opacity-50"
                        >
                            {bookingLoading === cls.id ? '...' : 'Check-in'}
                        </button>
                    )}
                  </div>
                );
            }) : (
                <div className="text-center py-6 bg-white/30 rounded-[32px] border-2 border-dashed border-primary-container/10">
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest opacity-40 italic">Sem aulas programadas para hoje</p>
                </div>
            )}
          </div>
        </section>

        {/* Action Button */}
        <Link to="/book-class" className="w-full h-16 bg-white border-2 border-primary/20 text-primary font-headline font-black rounded-[24px] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform uppercase tracking-widest">
          <span className="material-symbols-outlined text-primary">search</span>
          Explorar mais aulas
        </Link>

        {/* My Bookings List */}
        <section className="space-y-6">
          <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-secondary decoration-4 underline-offset-8 mb-8">Minhas Reservas</h4>
          <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(booking => (
              <div key={booking.id} className={`flex items-center gap-4 p-5 rounded-[28px] border-2 transition-all ${booking.status === 'agendado' ? 'bg-white border-primary-container/10 shadow-sm' : 'bg-surface-container opacity-40 grayscale border-transparent'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${booking.status === 'agendado' ? 'bg-secondary/10 text-secondary' : 'bg-on-surface-variant/10 text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined font-bold">{booking.status === 'agendado' ? 'sports_volleyball' : 'check_circle'}</span>
                </div>
                <div className="flex-1">
                  <h5 className="font-headline font-bold text-on-surface text-lg leading-none mb-1">{booking.classes.name}</h5>
                  <p className="text-xs font-bold text-on-surface-variant tracking-tight">
                    {new Date(booking.classes.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(booking.classes.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${booking.status === 'agendado' ? 'text-secondary bg-secondary-container/30' : 'text-on-surface-variant bg-surface'}`}>
                    {booking.status}
                  </span>
                  
                  {booking.status === 'agendado' && (
                    <button 
                      onClick={() => handleCancel(booking.id, booking.classes.start_time)}
                      className="text-[10px] font-black text-error/60 uppercase tracking-widest hover:text-error transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )) : (
                <div className="text-center py-12 text-on-surface-variant font-medium italic opacity-50">Nenhuma reserva encontrada nas suas ondas...</div>
            )}
          </div>
        </section>
      </main>

      <StudentNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
