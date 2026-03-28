import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';

export default function ClassSelection() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [weeklyBookingsCount, setWeeklyBookingsCount] = useState(0);

  useEffect(() => {
    fetchProfileAndData();
  }, [selectedDate]);

  async function fetchProfileAndData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/');

      // Fetch Profile with Plan
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, plan:plan_id(classes_per_week)')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      // Fetch Available Classes for day
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:teacher_id (full_name),
          bookings:bookings(count)
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Calculate Weekly Bookings (Monday to Sunday)
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);

      const { data: weeklyBookings } = await supabase
        .from('bookings')
        .select('*, class:class_id(start_time)')
        .eq('student_id', user.id)
        .neq('status', 'cancelado');

      // Filter only those where class start_time is this week
      const thisWeekCount = weeklyBookings?.filter(b => {
          const classTime = new Date(b.class.start_time);
          return classTime >= monday && classTime <= sunday;
      }).length || 0;

      setWeeklyBookingsCount(thisWeekCount);

    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBooking(cls: any) {
    try {
      if (!profile || profile.plan_status !== 'ativo') {
          alert('Você precisa de um plano ATIVO e APROVADO para fazer check-in. Vá em Perfil > Meus Planos.');
          return;
      }

      const limit = profile.plan?.classes_per_week || 0;
      if (weeklyBookingsCount >= limit) {
          alert(`Você já atingiu seu limite de ${limit} aulas nesta semana!`);
          return;
      }

      const now = new Date();
      const startTime = new Date(cls.start_time);
      const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 48) {
          alert('As vagas abrem apenas 48 horas antes da aula!');
          return;
      }

      setBookingLoading(cls.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login para agendar');

      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', cls.id)
        .eq('student_id', user.id)
        .neq('status', 'cancelado')
        .single();
      
      if (existing) {
        alert('Você já está inscrito nesta aula!');
        return;
      }

      const { error } = await supabase.from('bookings').insert({
        class_id: cls.id,
        student_id: user.id,
        status: 'agendado'
      });

      if (error) throw error;
      alert('Reserva realizada com sucesso!');
      navigate('/student');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setBookingLoading(null);
    }
  }

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <WavyBackground topHeight="20%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden text-sm">
      {/* Background Decorative Elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <TopAppBar title="CHECK-IN" showBackButton />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
        {/* Profile Status */}
        {profile && profile.plan_status !== 'ativo' && (
            <div className="p-4 bg-error/10 border-2 border-error/20 rounded-2xl text-error text-[10px] font-bold uppercase tracking-widest text-center">
                Check-in bloqueado: {profile.plan_status === 'pendente' ? 'Aguardando aprovação do plano' : 'Selecione um plano no Perfil'}
            </div>
        )}

        {/* Header Section */}
        <section className="space-y-1">
            <div className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-sm">wb_sunny</span>
                {profile?.plan ? `${weeklyBookingsCount}/${profile.plan.classes_per_week} aulas usadas na semana` : 'Vagas Disponíveis'}
            </div>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Agende seu <span className="text-secondary">Treino</span></h2>
        </section>

        {/* Horizontal Date Picker */}
        <section className="relative">
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            {weekDays.map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
              const dayNum = date.getDate();

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 w-16 h-20 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-300 
                    ${isSelected 
                      ? 'bg-secondary border-secondary text-white shadow-lg scale-105' 
                      : 'bg-white border-primary-container/20 text-on-surface-variant hover:border-secondary/30'
                    }
                  `}
                >
                  <span className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-white/80' : 'text-on-surface-variant/60'}`}>{dayName}</span>
                  <span className="text-xl font-headline font-black">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Available Classes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline font-bold text-lg text-on-surface font-headline uppercase tracking-tighter">Horários</h3>
            <span className="px-2 py-1 bg-surface-container-highest rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{classes.length} Turmas</span>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-on-surface-variant/50 animate-pulse font-bold uppercase tracking-widest text-xs">Preparando a areia...</div>
            ) : classes.length > 0 ? (
              classes.map(cls => {
                const now = new Date();
                const startTime = new Date(cls.start_time);
                const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                const isLocked = hoursDiff > 48;
                const isFull = (cls.bookings[0]?.count || 0) >= cls.capacity;

                return (
                  <div key={cls.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm transition-all group overflow-hidden relative">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 ${isLocked ? 'bg-surface-container' : 'bg-secondary-container'} rounded-2xl flex items-center justify-center ${isLocked ? 'text-on-surface-variant/30' : 'text-secondary'} shadow-inner group-hover:scale-110 transition-transform`}>
                            <span className="material-symbols-outlined text-3xl font-bold">{isLocked ? 'lock' : 'sports_volleyball'}</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-0.5">{cls.court}</p>
                            <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{cls.name}</h4>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-5 text-on-surface-variant">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full text-xs font-bold underline decoration-secondary decoration-2 h-7">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full text-xs font-bold h-7">
                            <span className="material-symbols-outlined text-sm text-secondary">groups</span>
                            {cls.bookings[0]?.count || 0}/{cls.capacity} vagas
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleBooking(cls)}
                        disabled={bookingLoading === cls.id || isFull || isLocked || profile?.plan_status !== 'ativo'}
                        className={`h-14 px-8 rounded-2xl font-headline font-extrabold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95
                          ${isFull || isLocked || profile?.plan_status !== 'ativo'
                            ? 'bg-surface-container-highest text-on-surface-variant/30 cursor-not-allowed shadow-none'
                            : 'bg-secondary text-white hover:bg-secondary/90'
                          }
                        `}
                      >
                        {isLocked ? 'Em 48h' : isFull ? 'Lotado' : (bookingLoading === cls.id ? '...' : 'Check-in')}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center space-y-4">
                 <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">wb_twilight</span>
                 </div>
                 <div className="space-y-1 text-sm font-medium">
                    <p className="text-on-surface font-black text-lg">Sem turmas agendadas</p>
                    <p className="text-on-surface-variant">Selecione outro dia no calendário.</p>
                 </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <StudentNavbar activePage="home" />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
    </WavyBackground>
  );
}
