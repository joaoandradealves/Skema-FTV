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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();
          
          if (profileData) setProfile(profileData);

          const { data: classesData } = await supabase
            .from('classes')
            .select(`
              *,
              bookings:bookings(count)
            `)
            .eq('teacher_id', user.id)
            .order('start_time', { ascending: true });
          
          setClasses(classesData || []);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando painel...</div>;

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
          <p className="text-white/70 text-sm mt-1">Pronto para as sessões de hoje?</p>
        </section>

        {/* Action Button */}
        <button 
          onClick={() => navigate('/create-class')}
          className="w-full bg-primary text-white font-headline font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">add_circle</span>
          CRIAR NOVA TURMA
        </button>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* ... stats ... */}
        </div>

        {/* Upcoming Classes */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="font-headline text-xl font-bold">Suas Aulas</h3>
            <span className="text-[10px] font-bold uppercase text-primary tracking-tighter">Ver Todas</span>
          </div>
          <div className="space-y-3">
            {classes.map(cls => (
              <div 
                key={cls.id} 
                onClick={() => navigate(`/class-management/${cls.id}`)}
                className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-1 transition-transform active:scale-[0.98] cursor-pointer"
              >
                <div className="w-14 h-14 bg-white rounded-xl flex flex-col items-center justify-center border border-outline-variant/20">
                  <span className="text-[10px] font-black text-secondary uppercase">
                    {new Date(cls.start_time).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                  </span>
                  <span className="text-xl font-headline font-black">
                    {new Date(cls.start_time).getDate()}
                  </span>
                </div>
                <div className="flex-1 ml-3">
                  <p className="font-bold text-sm">{cls.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="material-symbols-outlined text-xs text-primary">schedule</span>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-xs opacity-40">groups</span>
                  <span className="text-xs font-bold">{cls.bookings[0]?.count || 0}/{cls.capacity}</span>
                </div>
              </div>
            ))}
            {classes.length === 0 && <p className="text-center py-8 text-on-surface-variant italic">Nenhuma aula cadastrada ainda.</p>}
          </div>
        </section>

        {/* All Students List */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="font-headline text-xl font-bold">Todos os Alunos</h3>
            <button className="bg-gradient-to-br from-primary to-primary-container text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform">Ver Todos</button>
          </div>
          <div className="bg-surface-container-highest/40 rounded-3xl p-2 space-y-1">
            <div className="bg-surface-container-lowest p-3 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-dim">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlVRc0gdOXjtPQfpCKONqrluAJutJ_svmGnhpMruBB1wjiYUYIUmMngdx1x9Nq06KRrbeZ6SLcNMkEZ4FRsPkSvNgNDPO70DcwiidQhOUBAupQe9vozn93wagBtTQLuCHNPQYjzSlpcfnGBxITnj8A6qAsRJ8RXPnubwPpT53isJU8S6Dx7ARZbgxnkCQrLv_UuGvXBdZgIn8vIb_2hGcPBEzB0jmdVwLy88fyc_ciznrqGB1aKArEuHNDdInKgeFjQPGsrHPaovX4" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">Ricardo Silva</h4>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-tertiary-fixed-variant">Plano Anual</span>
              </div>
              <span className="material-symbols-outlined text-primary/40">chevron_right</span>
            </div>
          </div>
        </section>

        <div className="flex justify-center py-6 opacity-10 grayscale pointer-events-none">
          <span className="material-symbols-outlined text-[80px]">waves</span>
        </div>
      </main>

      <TeacherNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
