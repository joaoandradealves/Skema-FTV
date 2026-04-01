import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { motion, AnimatePresence } from 'framer-motion';

interface RosterStudent {
    full_name: string;
    avatar_url: string;
}

export default function ClassSelection() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [weeklyBookingsCount, setWeeklyBookingsCount] = useState(0);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>([]);
  
  // Roster State
  const [roster, setRoster] = useState<{ className: string, students: RosterStudent[] } | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

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
        .select('*, plan:plan_id(classes_per_week, billing_cycle)')
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
          bookings(status)
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      // 2. Count bookings based on plan cycle
      const now = new Date();
      const { data: weeklyBookings } = await supabase
        .from('bookings')
        .select('*, class:class_id(start_time, id)')
        .eq('student_id', user.id)
        .neq('status', 'cancelado');

      // 1. Set Booked Class IDs
      setBookedClassIds(weeklyBookings?.map(b => b.class.id) || []);

      let cycleCount = 0;
      if (profileData?.plan?.billing_cycle === 'mensal') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        cycleCount = weeklyBookings?.filter(b => {
          const classTime = new Date(b.class.start_time);
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

        cycleCount = weeklyBookings?.filter(b => {
          const classTime = new Date(b.class.start_time);
          return classTime >= monday && classTime <= sunday;
        }).length || 0;
      }

      setWeeklyBookingsCount(cycleCount);

    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function handleBooking(cls: any) {
    try {
      if (!profile || profile.plan_status !== 'ativo') {
          alert('Você precisa de um plano ATIVO e APROVADO para fazer check-in. Vá em Perfil > Meus Planos.');
          return;
      }

      const limit = profile.plan?.classes_per_week || 0;
      const cycleText = profile.plan?.billing_cycle === 'mensal' ? 'mês' : 'semana';
      if (limit < 99 && weeklyBookingsCount >= limit) {
          alert(`Você já atingiu seu limite de ${limit} aulas nest${cycleText === 'mês' ? 'e' : 'a'} ${cycleText}!`);
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
          // Caso não exista nenhum registro prévio, criamos do zero
          const { error: insertError } = await supabase.from('bookings').insert({
            class_id: cls.id,
            student_id: user.id,
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

      // Se o plano for do tipo 'avulso', consumimos ele
      if (profile.plan?.type === 'avulso') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_id: null, plan_status: 'nenhum' })
          .eq('id', user.id);
        if (profileError) throw profileError;
      }
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
      <TopAppBar 
        title="CHECK-IN" 
        showBackButton 
        avatarSrc={profile?.avatar_url} 
        avatarAlt={profile?.full_name} 
      />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
        <section className="space-y-1">
            <div className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-sm">wb_sunny</span>
                {profile?.plan ? `${weeklyBookingsCount}/${profile.plan.classes_per_week} aulas no ${profile.plan.billing_cycle === 'mensal' ? 'mês' : 'semana'}` : 'Vagas Disponíveis'}
            </div>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Agende seu <span className="text-secondary">Treino</span></h2>
        </section>

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
                const activeBookings = (cls.bookings || []).filter((b: any) => b.status === 'agendado');
                const isFull = activeBookings.length >= (cls.capacity || cls.max_students || 6);
                const isBooked = bookedClassIds.includes(cls.id);

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
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Prof. {cls.teacher?.full_name || 'Skema'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full text-xs font-bold underline decoration-secondary decoration-2 h-7">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          
                          {/* Quem vai treinar? CLICKABLE AREA */}
                          <button 
                            onClick={() => fetchRoster(cls)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-xs font-black transition-all hover:bg-secondary/20 active:scale-95 h-7"
                          >
                            <span className="material-symbols-outlined text-sm">groups</span>
                            {(cls.bookings || []).filter((b: any) => b.status === 'agendado').length}/{cls.capacity || cls.max_students || 6} <span className="text-[9px] uppercase tracking-tighter opacity-70">Ver Alunos</span>
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleBooking(cls)}
                        disabled={bookingLoading === cls.id || isFull || isLocked || profile?.plan_status !== 'ativo' || isBooked}
                        className={`h-14 px-8 rounded-2xl font-headline font-extrabold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95
                          ${isFull || isLocked || profile?.plan_status !== 'ativo' || isBooked
                            ? 'bg-surface-container-highest text-on-surface-variant/30 cursor-not-allowed shadow-none'
                            : 'bg-secondary text-white hover:bg-secondary/90'
                          }
                        `}
                      >
                        {isBooked ? 'Agendado' : isLocked ? 'Em 48h' : isFull ? 'Lotado' : (bookingLoading === cls.id ? '...' : 'Check-in')}
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

      {/* Roster Modal */}
      <AnimatePresence>
        {roster && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setRoster(null)}
                    className="absolute inset-0 bg-on-background/80 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="relative bg-surface w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl space-y-6"
                >
                    <div className="text-center space-y-1">
                        <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight uppercase">QUEM VAI TREINAR? 🏐</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{roster.className}</p>
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loadingRoster ? (
                            <div className="py-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Chamando a turma...</div>
                        ) : roster.students.length > 0 ? (
                            roster.students.map((student, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={idx} 
                                    className="bg-white p-3 rounded-2xl border border-primary-container/10 flex items-center gap-3 shadow-sm"
                                >
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl overflow-hidden border border-primary/5 flex items-center justify-center">
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
                            <div className="py-10 text-center text-on-surface-variant/40 font-medium italic text-xs px-10">Você será o primeiro desta turma! Agende e inspire outros. ✨</div>
                        )}
                    </div>

                    <button 
                        onClick={() => setRoster(null)}
                        className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        FECHAR
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <StudentNavbar activePage="home" />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 105, 113, 0.1); border-radius: 10px; }
      `}</style>
      </div>
    </WavyBackground>
  );
}
