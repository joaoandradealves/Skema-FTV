import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';

export default function StudentHistory() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [completedClasses, setCompletedClasses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [year]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('classes(start_time)')
        .eq('student_id', user.id)
        .gte('classes.start_time', `${year}-01-01T00:00:00Z`)
        .lte('classes.start_time', `${year}-12-31T23:59:59Z`);

      if (error) throw error;

      const dates = new Set<string>();
      data?.forEach((b: any) => {
        if (b.classes?.start_time) {
          dates.add(new Date(b.classes.start_time).toDateString());
        }
      });
      setCompletedClasses(dates);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const months = [
    'JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.',
    'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'
  ];

  const renderMonth = (monthIdx: number) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const dots = [];
    const classesInMonthCount = Array.from(completedClasses).filter((d: string) => {
        const date = new Date(d);
        return date.getMonth() === monthIdx && date.getFullYear() === year;
    }).length;

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthIdx, i);
      const isCompleted = completedClasses.has(date.toDateString());
      dots.push(
        <div 
          key={i} 
          className={`w-3 h-3 rounded-full flex items-center justify-center transition-all
            ${isCompleted 
              ? 'bg-[#006971] text-[6px] text-white' 
              : 'bg-surface-container-highest'
            }`}
        >
          {isCompleted && <span className="material-symbols-outlined text-[8px] font-black">check</span>}
        </div>
      );
    }

    return (
      <div key={monthIdx} className="space-y-4 bg-white p-4 rounded-3xl border border-primary-container/5 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-on-surface-variant/40 tracking-widest">{months[monthIdx]}</span>
          <span className="w-5 h-5 bg-on-surface-variant/5 rounded-full flex items-center justify-center text-[9px] font-black">{classesInMonthCount}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dots}
        </div>
      </div>
    );
  };

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-32 relative selection:bg-primary/30">
      <TopAppBar title="HISTÓRICO DO ANO" showBackButton />

      <main className="mt-20 px-6 max-w-4xl mx-auto space-y-10">
        {/* Year Selector */}
        <header className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-primary-container/10">
                <button onClick={() => setYear(year - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
                </button>
                <span className="font-headline font-black text-2xl tracking-tight">{year}</span>
                <button onClick={() => setYear(year + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
            </div>
        </header>

        {loading ? (
             <div className="py-20 text-center animate-pulse text-on-surface-variant/30 font-bold uppercase tracking-widest text-xs">Aguarde, rebuscando suas conquistas...</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map((_, idx) => renderMonth(idx))}
            </div>
        )}

        {/* Footer Info */}
        <footer className="flex items-center gap-3 py-6 px-1 border-t border-primary-container/10">
            <div className="w-5 h-5 bg-[#006971] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[10px] font-black">check</span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">Aulas Concluídas no Skema Beach Club</span>
        </footer>
      </main>

      <StudentNavbar activePage="agenda" />
      </div>
    </WavyBackground>
  );
}
