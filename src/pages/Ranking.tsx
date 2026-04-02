import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import WavyBackground from '../components/WavyBackground';
import { motion } from 'framer-motion';

interface RankingUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  points_earned: number;
}

export default function Ranking() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        const { data, error } = await supabase
          .from('monthly_ranking')
          .select('*')
          .limit(20);

        if (error) throw error;
        setRanking(data || []);
      } catch (error) {
        console.error('Error fetching ranking:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const top3 = ranking.slice(0, 3);
  const others = ranking.slice(3);

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Calculando Pódio Skema...</div>;

  return (
    <WavyBackground topHeight="20%">
      <div className="pb-32 min-h-screen font-body relative">
        <TopAppBar title="RANKING MENSAL" />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-10">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <h2 className="font-headline font-black text-4xl text-white uppercase italic tracking-tighter shadow-sm">
              TOP <span className="text-secondary">FERAS</span>
            </h2>
            <p className="text-white/60 font-black uppercase text-[10px] tracking-[0.3em]">
              Melhores de {capitalizedMonth}
            </p>
          </div>

          {/* Podium Section */}
          <div className="flex items-end justify-center gap-2 pt-8">
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center flex-1"
              >
                <div className="relative">
                    <img src={top3[1].avatar_url || '/sereia.svg'} className="w-16 h-16 rounded-full border-4 border-slate-300 object-cover shadow-lg hover:scale-105 transition-transform" />
                    <div className="absolute -top-2 -right-2 bg-slate-300 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">2</div>
                </div>
                <p className="mt-2 text-[10px] font-bold text-white uppercase text-center truncate w-full">{top3[1].full_name.split(' ')[0]}</p>
                <div className="bg-slate-300 w-full h-16 rounded-t-2xl mt-2 flex flex-col items-center justify-center text-slate-800 shadow-inner">
                    <span className="text-xs font-black">{top3[1].points_earned}</span>
                    <span className="text-[10px] font-bold uppercase opacity-60">pts</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="flex flex-col items-center flex-1 z-10"
              >
                <div className="relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <span className="material-symbols-outlined text-[#D4AF37] text-4xl animate-bounce">workspace_premium</span>
                    </div>
                    <img src={top3[0].avatar_url || '/sereia.svg'} className="w-24 h-24 rounded-full border-4 border-[#D4AF37] object-cover shadow-xl hover:scale-105 transition-transform" />
                    <div className="absolute -top-2 -right-2 bg-[#D4AF37] text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg">1</div>
                </div>
                <p className="mt-2 text-xs font-black text-white uppercase text-center truncate w-full">{top3[0].full_name.split(' ')[0]}</p>
                <div className="bg-[#D4AF37] w-full h-24 rounded-t-2xl mt-2 flex flex-col items-center justify-center text-white shadow-2xl">
                    <span className="text-xl font-black">{top3[0].points_earned}</span>
                    <span className="text-[10px] font-bold uppercase opacity-80">pontos</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center flex-1"
              >
                <div className="relative">
                    <img src={top3[2].avatar_url || '/sereia.svg'} className="w-14 h-14 rounded-full border-4 border-orange-400 object-cover shadow-lg hover:scale-105 transition-transform" />
                    <div className="absolute -top-2 -right-2 bg-orange-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">3</div>
                </div>
                <p className="mt-2 text-[10px] font-bold text-white uppercase text-center truncate w-full">{top3[2].full_name.split(' ')[0]}</p>
                <div className="bg-orange-400 w-full h-12 rounded-t-2xl mt-2 flex flex-col items-center justify-center text-white shadow-inner">
                    <span className="text-xs font-black">{top3[2].points_earned}</span>
                    <span className="text-[10px] font-bold uppercase opacity-60">pts</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Full Ranking List */}
          <section className="bg-white rounded-[32px] shadow-xl border border-primary-container/10 overflow-hidden mb-10">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
                <h3 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant/60">Classificação Geral</h3>
                <span className="text-[10px] font-black bg-secondary/10 text-secondary px-3 py-1 rounded-full uppercase">Top 20</span>
            </div>

            <div className="divide-y divide-surface-container">
                {ranking.length > 3 ? ranking.slice(3).map((user, index) => {
                    const isMe = user.user_id === currentUser?.id;
                    return (
                        <div key={user.user_id} className={`flex items-center gap-4 p-5 transition-colors ${isMe ? 'bg-primary/5' : ''}`}>
                            <span className="w-6 text-sm font-black text-on-surface-variant/40">#{index + 4}</span>
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10">
                                <img src={user.avatar_url || '/sereia.svg'} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <p className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-on-surface'}`}>
                                    {user.full_name}
                                    {isMe && <span className="ml-2 text-[9px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded italic">VOCÊ</span>}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-on-surface">{user.points_earned}</p>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase opacity-40">pts</p>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="p-10 text-center text-on-surface-variant/40 italic font-medium uppercase text-xs tracking-widest leading-loose">
                        Continue treinando para aparecer aqui! <br/> Os pontos resetam todo dia 1º.
                    </div>
                )}
            </div>
          </section>

          {/* Mini Info Card */}
          <div className="bg-secondary/10 p-6 rounded-[28px] border-2 border-secondary/20 flex items-start gap-4">
              <span className="material-symbols-outlined text-secondary text-3xl">info</span>
              <div className="space-y-1">
                  <h4 className="font-headline font-bold text-secondary text-sm uppercase">Como subir no Ranking?</h4>
                  <p className="text-[10px] font-medium text-secondary/70 leading-relaxed uppercase">
                      Agende aulas, participe de aluguéis e Day Use. Cada interação gera pontos! O ranking é atualizado em tempo real e reinicia no início de cada mês.
                  </p>
              </div>
          </div>
        </main>

        <StudentNavbar activePage="ranking" />
      </div>
    </WavyBackground>
  );
}
