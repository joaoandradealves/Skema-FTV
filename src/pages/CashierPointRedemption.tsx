import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  username: string;
}

interface Reward {
  id: string;
  name: string;
  points_cost: number;
}

export default function CashierPointRedemption() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    const { data } = await supabase.from('loyalty_rewards').select('*').eq('active', true).order('points_cost', { ascending: true });
    setRewards(data || []);
  }

  async function handleSearch() {
    if (searchTerm.length < 3) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectUser(user: Profile) {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm('');
    
    // Fetch User Points
    const { data } = await supabase
      .from('loyalty_points')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    setUserPoints(data?.balance || 0);
  }

  async function handleRedeem(reward: Reward) {
    if (!selectedUser) return;
    if (userPoints < reward.points_cost) {
      alert('Saldo insuficiente!');
      return;
    }

    if (!confirm(`Confirmar resgate de "${reward.name}" para ${selectedUser.full_name}?`)) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from('loyalty_transactions').insert({
        user_id: selectedUser.id,
        amount: -reward.points_cost,
        type: 'resgate',
        description: `Resgate de prêmio: ${reward.name}`
      });

      if (error) throw error;

      setUserPoints(prev => prev - reward.points_cost);
      setSuccessMsg(`Resgate de ${reward.name} realizado!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="CAIXA - RESGATE DE PONTOS" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
          <section className="space-y-1">
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Atendimento <span className="text-secondary">Caixa</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Troque os pontos do aluno por produtos.</p>
          </section>

          {successMsg && (
            <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest text-center animate-bounce">
                {successMsg}
            </div>
          )}

          {/* Search Section */}
          <section className="space-y-4">
             <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar aluno por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-white border-2 border-primary-container/20 p-4 rounded-2xl font-bold"
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-secondary text-white px-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg"
                >
                   {loading ? '...' : 'BUSCAR'}
                </button>
             </div>

             {searchResults.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-secondary/10 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                   {searchResults.map(user => (
                      <button 
                        key={user.id} 
                        onClick={() => selectUser(user)}
                        className="w-full text-left p-4 hover:bg-secondary/5 flex items-center justify-between border-b border-surface-container last:border-0"
                      >
                         <div>
                            <p className="font-black text-on-surface">{user.full_name}</p>
                            <p className="text-xs font-bold text-on-surface-variant/60">{user.email}</p>
                         </div>
                         <span className="material-symbols-outlined text-secondary">add_circle</span>
                      </button>
                   ))}
                </div>
             )}
          </section>

          {/* User Profile & Rewards */}
          {selectedUser && (
             <section className="space-y-6 animate-in slide-in-from-bottom duration-300">
                <div className="bg-secondary text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                   <div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-12">
                      <span className="material-symbols-outlined text-[150px]">verified</span>
                   </div>
                   <div className="relative z-10 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Aluno Selecionado</p>
                        <h3 className="font-headline font-black text-2xl truncate max-w-[200px]">{selectedUser.full_name}</h3>
                        <p className="text-xs font-bold opacity-60 lowercase">{selectedUser.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Atual</p>
                        <p className="text-4xl font-black leading-none">{userPoints}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">PONTOS</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => setSelectedUser(null)}
                    className="mt-6 w-full py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                   >
                     TROCAR ALUNO
                   </button>
                </div>

                <div className="space-y-4">
                   <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight ml-2">Escolha o Prêmio</h3>
                   <div className="grid grid-cols-1 gap-3">
                      {rewards.map(reward => {
                         const canAfford = userPoints >= reward.points_cost;
                         return (
                            <button 
                              key={reward.id}
                              disabled={!canAfford || submitting}
                              onClick={() => handleRedeem(reward)}
                              className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all active:scale-95
                                ${canAfford 
                                  ? 'bg-white border-primary-container/20 shadow-sm hover:border-secondary/30' 
                                  : 'bg-surface-container-highest border-transparent opacity-40 grayscale cursor-not-allowed'
                                }
                              `}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 ${canAfford ? 'bg-secondary/10 text-secondary' : 'bg-on-surface-variant/10 text-on-surface-variant'} rounded-2xl flex items-center justify-center`}>
                                     <span className="material-symbols-outlined font-bold text-2xl">redeem</span>
                                  </div>
                                  <div className="text-left">
                                     <p className="font-black text-on-surface">{reward.name}</p>
                                     <p className={`text-[10px] font-black uppercase tracking-widest ${canAfford ? 'text-secondary' : 'text-on-surface-variant'}`}>{reward.points_cost} PONTOS</p>
                                  </div>
                               </div>
                               {canAfford ? (
                                  <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center font-black">
                                     <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                                  </div>
                               ) : (
                                  <span className="material-symbols-outlined text-on-surface-variant/30 italic">lock</span>
                               )}
                            </button>
                         );
                      })}
                   </div>
                </div>
             </section>
          )}
        </main>
      </div>
    </WavyBackground>
  );
}
