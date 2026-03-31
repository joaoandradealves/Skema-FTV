import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingDetail {
    id: string;
    class_name: string;
    start_time: string;
    court: string;
}

export default function StudentHistory() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [historyMap, setHistoryMap] = useState<Record<string, BookingDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<{ date: string, classes: BookingDetail[] } | null>(null);

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
        .select(`
          id,
          classes:class_id (
            name,
            start_time,
            court
          )
        `)
        .eq('student_id', user.id)
        .neq('status', 'cancelado')
        .gte('classes.start_time', `${year}-01-01T00:00:00Z`)
        .lte('classes.start_time', `${year}-12-31T23:59:59Z`);

      if (error) throw error;

      const map: Record<string, BookingDetail[]> = {};
      data?.forEach((b: any) => {
        if (b.classes?.start_time) {
          const dateStr = new Date(b.classes.start_time).toDateString();
          if (!map[dateStr]) map[dateStr] = [];
          map[dateStr].push({
            id: b.id,
            class_name: b.classes.name,
            start_time: b.classes.start_time,
            court: b.classes.court
          });
        }
      });
      setHistoryMap(map);
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
    
    // Count days that have at least one booking
    const activeDaysInMonth = Object.keys(historyMap).filter((d: string) => {
        const date = new Date(d);
        return date.getMonth() === monthIdx && date.getFullYear() === year;
    }).length;

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthIdx, i);
      const dateStr = date.toDateString();
      const hasClasses = !!historyMap[dateStr];
      const classesOnDay = historyMap[dateStr] || [];

      dots.push(
        <button 
          key={i} 
          onClick={() => hasClasses && setSelectedDay({ date: dateStr, classes: classesOnDay })}
          disabled={!hasClasses}
          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all relative
            ${hasClasses 
              ? 'bg-primary text-white cursor-pointer hover:scale-125 shadow-sm active:bg-secondary' 
              : 'bg-surface-container-highest cursor-default'
            }`}
        >
          {hasClasses && <span className="material-symbols-outlined text-[8px] font-black">check</span>}
        </button>
      );
    }

    return (
      <div key={monthIdx} className="space-y-4 bg-white p-5 rounded-[40px] border border-primary-container/10 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-on-surface-variant/40 tracking-widest">{months[monthIdx]}</span>
          <span className="w-5 h-5 bg-on-surface-variant/5 rounded-full flex items-center justify-center text-[9px] font-black">{activeDaysInMonth}</span>
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
      <TopAppBar title="MEU HISTÓRICO" showBackButton />

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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/50 text-center">Clique nos dias marcados para ver os detalhes da sua jornada!</p>
        </header>

        {loading ? (
             <div className="py-20 text-center animate-pulse text-on-surface-variant/30 font-bold uppercase tracking-widest text-xs">Preparando sua linha do tempo...</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map((_, idx) => renderMonth(idx))}
            </div>
        )}

        {/* Footer Info */}
        <footer className="flex items-center gap-3 py-6 px-1 border-t border-primary-container/10">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[10px] font-black">check</span>
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">Skema Beach Club: Evolução Constante</span>
        </footer>
      </main>

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDay && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedDay(null)}
                    className="absolute inset-0 bg-on-background/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="relative bg-surface w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl space-y-6"
                >
                    <div className="text-center space-y-1">
                        <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight uppercase">TREINO CONCLUÍDO! 🏆</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                           {new Date(selectedDay.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {selectedDay.classes.map(cls => (
                            <div key={cls.id} className="bg-white p-4 rounded-[32px] border border-primary-container/10 flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined font-black">sports_volleyball</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-headline font-black text-sm text-on-surface leading-tight">{cls.class_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-bold text-on-surface-variant uppercase bg-surface-container px-2 py-0.5 rounded-full">{cls.court}</span>
                                        <span className="text-[9px] font-bold text-primary uppercase">{new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={() => setSelectedDay(null)}
                        className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        FECHAR
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <StudentNavbar activePage="agenda" />
      </div>
    </WavyBackground>
  );
}
