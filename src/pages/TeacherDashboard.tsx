import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import TeacherNavbar from '../components/TeacherNavbar';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Busca perfil do professor
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();
          
          if (profileData) setProfile(profileData);

          // Busca as aulas do professor
          const { data: classesData } = await supabase
            .from('classes')
            .select(`
              *,
              bookings:bookings(count)
            `)
            .eq('teacher_id', user.id)
            .order('start_time', { ascending: true });
          
          setClasses(classesData || []);

          // NOVO: Busca os 3 alunos mais recentes para a home
          const { data: studentsData } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              avatar_url,
              plan_id,
              plans:plan_id (name)
            `)
            .eq('role', 'student')
            .order('created_at', { ascending: false })
            .limit(3);
          
          setStudents(studentsData || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : '...';

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Carregando painel...</div>;

  return (
    <WavyBackground topHeight="25%">
      <div className="pb-32 min-h-screen font-body relative text-on-surface">
      <TopAppBar
        title={`Painel do Prof. ${firstName}`}
        avatarSrc={profile?.avatar_url || undefined}
        avatarAlt={profile?.full_name || "Perfil"}
      />

      <main className="pt-20 px-6 max-w-2xl mx-auto space-y-8">
        {/* Welcome Section */}
        <section className="relative overflow-hidden pt-4">
          <h2 className="font-headline text-3xl font-extrabold text-white tracking-tight">Bom dia, {firstName}!</h2>
          <p className="text-white/70 text-sm mt-1 uppercase font-bold tracking-widest text-[10px]">Pronto para as sessões de hoje?</p>
        </section>

        {/* Action Button */}
        <button 
          onClick={() => navigate('/create-class')}
          className="w-full bg-primary text-white font-headline font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:brightness-110"
        >
          <span className="material-symbols-outlined text-2xl">add_circle</span>
          CRIAR NOVA TURMA
        </button>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm">
             <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
             <p className="font-headline font-black text-2xl mt-2 text-on-surface">{classes.length}</p>
             <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Aulas Marcadas</p>
           </div>
           <div className="bg-white p-5 rounded-[28px] border border-primary-container/10 shadow-sm">
             <span className="material-symbols-outlined text-secondary text-2xl">person_check</span>
             <p className="font-headline font-black text-2xl mt-2 text-on-surface">
                {classes.reduce((acc, cls) => acc + (cls.bookings[0]?.count || 0), 0)}
             </p>
             <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Alunos Hoje</p>
           </div>
        </div>

        {/* Upcoming Classes */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
                <h3 className="font-headline text-xl font-black">Suas Aulas</h3>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest">Próximas sessões</p>
            </div>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest cursor-pointer">Ver Todas</span>
          </div>
          <div className="space-y-3">
            {classes.map(cls => {
              const isPast = new Date(cls.start_time) < new Date();
              return (
                <div 
                  key={cls.id} 
                  onClick={() => navigate(`/class-management/${cls.id}`)}
                  className={`bg-white p-4 rounded-[28px] border border-primary-container/5 flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer shadow-sm hover:border-primary/20 ${isPast ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border border-outline-variant/10 ${isPast ? 'bg-surface-container-highest' : 'bg-surface-container'}`}>
                    <span className={`text-[9px] font-black uppercase ${isPast ? 'text-on-surface-variant/40' : 'text-secondary'}`}>
                      {new Date(cls.start_time).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className={`text-xl font-headline font-black ${isPast ? 'text-on-surface-variant/40' : ''}`}>
                      {new Date(cls.start_time).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 ml-3">
                    <p className={`font-bold text-sm leading-tight ${isPast ? 'text-on-surface-variant/40 line-through' : ''}`}>{cls.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`material-symbols-outlined text-xs ${isPast ? 'text-on-surface-variant/20' : 'text-primary'}`}>schedule</span>
                      <span className={`text-[11px] font-medium ${isPast ? 'text-on-surface-variant/40' : 'text-on-surface-variant'}`}>
                        {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {isPast && <span className="ml-2 font-black uppercase text-[8px] tracking-tight"> FINALIZADA</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-high px-3 py-1.5 rounded-xl border border-outline-variant/10">
                    <span className="material-symbols-outlined text-[16px] opacity-40">groups</span>
                    <span className="text-[11px] font-black">{cls.bookings[0]?.count || 0}/{cls.capacity}</span>
                  </div>
                </div>
              );
            })}
            {classes.length === 0 && (
                <div className="text-center py-12 px-6 border-2 border-dashed border-outline-variant/20 rounded-[40px] space-y-2">
                    <span className="material-symbols-outlined text-4xl opacity-10">event_busy</span>
                    <p className="text-on-surface-variant font-medium text-sm">Nenhuma aula cadastrada ainda.</p>
                </div>
            )}
          </div>
        </section>

        {/* Dynamic Students List */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
                <h3 className="font-headline text-xl font-black">Alunos Recentes</h3>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest">Base de dados Skema</p>
            </div>
            <button 
                onClick={() => navigate('/admin/students')}
                className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
                Ver Todos
            </button>
          </div>
          
          <div className="bg-surface-container-highest/20 rounded-[36px] p-3 space-y-2 border border-primary-container/10">
            {students.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-3xl flex items-center gap-4 shadow-sm border border-outline-variant/5 group active:scale-[0.99] transition-all">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-container shadow-inner border border-outline-variant/10">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-container/30">
                        <span className="material-symbols-outlined text-3xl">person</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-on-surface">{student.full_name || 'Aluno sem nome'}</h4>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-secondary/10 text-secondary uppercase tracking-widest border border-secondary/5">
                        {student.plans?.name || 'Sem Plano Ativo'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-primary/20 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
            ))}
            {students.length === 0 && (
                <p className="text-center py-8 text-on-surface-variant text-sm font-medium italic">Nenhum aluno cadastrado.</p>
            )}
          </div>
        </section>

        <div className="flex justify-center py-10 opacity-10 grayscale pointer-events-none">
          <span className="material-symbols-outlined text-[80px] animate-pulse">waves</span>
        </div>
      </main>

      <TeacherNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
