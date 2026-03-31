import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function AdminAnalytics() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activePlans: 0,
    totalBookings: 0,
    pendingApprovals: 0,
    pointsDistributed: 0,
    bookingsByDay: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);

      // 1. Total Students
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // 2. Active Plans
      const { count: activePlansCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_status', 'ativo');

      // 3. Total Bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'cancelado');

      // 4. Pending Approvals
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_status', 'pendente');

      // 5. Total Points
      const { data: pointsData } = await supabase
        .from('loyalty_points')
        .select('balance');
      const totalPoints = pointsData?.reduce((acc, curr) => acc + curr.balance, 0) || 0;

      // 6. Bookings by Day (simplified)
      const { data: bookingsByDay } = await supabase
        .from('bookings')
        .select('created_at');
      
      const dayStats = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      bookingsByDay?.forEach(b => {
        const day = new Date(b.created_at).getDay();
        dayStats[day]++;
      });

      setStats({
        totalStudents: studentsCount || 0,
        activePlans: activePlansCount || 0,
        totalBookings: bookingsCount || 0,
        pendingApprovals: pendingCount || 0,
        pointsDistributed: totalPoints,
        bookingsByDay: dayStats
      });

    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-headline font-bold text-primary animate-pulse">RECOLHENDO DADOS DO CLUBE...</p>
    </div>
  );

  const maxBookings = Math.max(...stats.bookingsByDay, 1);
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-32">
      <TopAppBar title="INDICADORES" showBackButton />

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="font-headline font-black text-3xl tracking-tighter leading-none">Dashboard Executivo</h1>
          <p className="text-on-surface-variant text-sm font-medium mt-1">Acompanhe a saúde do Skema Beach Club em tempo real.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Alunos Totais" value={stats.totalStudents} icon="groups" color="bg-primary" />
          <StatCard title="Planos Ativos" value={stats.activePlans} icon="verified" color="bg-secondary" />
          <StatCard title="Check-ins" value={stats.totalBookings} icon="sports_volleyball" color="bg-orange-500" />
          <StatCard title="Aguardando" value={stats.pendingApprovals} icon="pending" color="bg-error" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Booking Frequency Chart */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-primary-container/10 space-y-6">
            <h3 className="font-headline font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Adesão por Dia
            </h3>
            <div className="flex items-end justify-between h-40 gap-2">
              {stats.bookingsByDay.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / maxBookings) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`w-full max-w-[20px] rounded-t-lg ${i === new Date().getDay() ? 'bg-primary' : 'bg-primary/20'}`}
                  ></motion.div>
                  <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-tighter">{dayNames[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loyalty Distribution */}
          <div className="bg-gradient-to-br from-secondary to-secondary-container p-8 rounded-[40px] shadow-lg text-white space-y-6">
            <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-headline font-black text-2xl leading-tight">Sistema de Fidelidade</h3>
                 <p className="text-white/70 text-xs font-medium">Economia de pontos circulando no app</p>
               </div>
               <span className="material-symbols-outlined text-4xl opacity-20">loyalty</span>
            </div>
            <div className="space-y-2">
                <div className="text-5xl font-headline font-black leading-none">{stats.pointsDistributed.toLocaleString()}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">PONTOS TOTAIS EMITIDOS</div>
            </div>
            <button className="w-full bg-white/20 backdrop-blur-md py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/30 transition-all border border-white/10">Ver Relatório de Resgates</button>
          </div>
        </div>

        {/* Growth Highlight */}
        <section className="bg-white p-8 rounded-[40px] border border-primary-container/10 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-primary/5 rounded-[24px] flex items-center justify-center text-primary">
                 <span className="material-symbols-outlined text-3xl">trending_up</span>
              </div>
              <div>
                 <h4 className="font-headline font-bold text-xl">Taxa de Conversão</h4>
                 <p className="text-on-surface-variant text-xs font-medium">
                    {stats.totalStudents > 0 ? ((stats.activePlans / stats.totalStudents) * 100).toFixed(1) : 0}% dos cadastros são alunos pagantes ativos.
                 </p>
              </div>
           </div>
           <div className="hidden md:block">
              <div className="text-3xl font-headline font-black text-primary">
                +12% <span className="text-[10px] font-bold text-on-surface-variant align-middle">ESTE MÊS</span>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-primary-container/10 space-y-3 transition-transform hover:-translate-y-1">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-headline font-black text-on-surface leading-none">{value.toLocaleString()}</div>
        <div className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest mt-1">{title}</div>
      </div>
    </div>
  );
}
