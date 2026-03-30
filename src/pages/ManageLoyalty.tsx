import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

interface Reward {
  id: string;
  name: string;
  points_cost: number;
  description: string;
  image_url: string;
  active: boolean;
}

export default function ManageLoyalty() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [newReward, setNewReward] = useState<Omit<Reward, 'id'>>({
    name: '',
    points_cost: 100,
    description: '',
    image_url: '',
    active: true
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('loyalty_rewards').select('*').order('points_cost', { ascending: true });
      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  async function handleAddReward() {
    if (!newReward.name || !newReward.points_cost) return;
    try {
      setSubmitting(true);
      const { data, error } = await supabase.from('loyalty_rewards').insert([newReward]).select().single();
      if (error) throw error;
      setRewards(prev => [...prev, data]);
      setNewReward({ name: '', points_cost: 100, description: '', image_url: '', active: true });
      setShowNewForm(false);
      showSuccess('Prêmio cadastrado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateReward(id: string) {
    const reward = rewards.find(r => r.id === id);
    if (!reward) return;
    try {
      setSubmitting(true);
      const { error } = await supabase.from('loyalty_rewards').update(reward).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      showSuccess('Prêmio atualizado!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReward(id: string) {
    if (!confirm('Deseja realmente excluir este prêmio?')) return;
    try {
      const { error } = await supabase.from('loyalty_rewards').delete().eq('id', id);
      if (error) throw error;
      setRewards(prev => prev.filter(r => r.id !== id));
      showSuccess('Prêmio removido!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="GESTÃO DE FIDELIDADE" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
          <section className="space-y-1">
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Prêmios & <span className="text-secondary">Pontos</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Cadastre os produtos que podem ser trocados por pontos.</p>
          </section>

          {successMsg && (
            <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest text-center animate-bounce">
                {successMsg}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-on-surface-variant/30 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Carregando catálogo...</div>
          ) : (
            <div className="space-y-4">
              {rewards.length === 0 && !showNewForm && (
                <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">Nenhum prêmio cadastrado</div>
              )}

              {rewards.map(reward => (
                <div key={reward.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm space-y-4 transition-all">
                  {editingId === reward.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Nome do Produto</label>
                          <input 
                            value={reward.name}
                            onChange={e => setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, name: e.target.value } : r))}
                            className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Custo (Pontos)</label>
                          <input 
                            type="number"
                            value={reward.points_cost}
                            onChange={e => setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, points_cost: Number(e.target.value) } : r))}
                            className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary text-center"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                           <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Ativo</label>
                           <input 
                            type="checkbox"
                            checked={reward.active}
                            onChange={e => setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, active: e.target.checked } : r))}
                            className="w-6 h-6 rounded-lg text-secondary focus:ring-secondary"
                           />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          disabled={submitting}
                          onClick={() => handleUpdateReward(reward.id)} 
                          className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          SALVAR
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">CANCELAR</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 bg-surface-container-highest rounded-2xl flex items-center justify-center text-secondary shadow-inner`}>
                          <span className="material-symbols-outlined text-3xl font-bold">{reward.active ? 'redeem' : 'lock'}</span>
                        </div>
                        <div>
                          <h4 className="font-headline font-black text-xl text-on-surface leading-tight tracking-tight">{reward.name}</h4>
                          <p className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em]">{reward.points_cost} PONTOS</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(reward.id)} className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button>
                        <button onClick={() => handleDeleteReward(reward.id)} className="w-10 h-10 bg-error/10 text-error rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showNewForm ? (
                <section className="bg-white p-6 rounded-[32px] border-2 border-secondary/20 shadow-xl space-y-4 animate-[fadeIn_0.3s_ease]">
                  <h3 className="font-headline font-black text-lg text-secondary uppercase tracking-tight">Novo Produto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Nome</label>
                      <input 
                        placeholder="Ex: Água Mineral 500ml"
                        value={newReward.name}
                        onChange={e => setNewReward({...newReward, name: e.target.value})}
                        className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Custo (Pontos)</label>
                      <input 
                        type="number"
                        value={newReward.points_cost}
                        onChange={e => setNewReward({...newReward, points_cost: Number(e.target.value)})}
                        className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Descrição (Opcional)</label>
                      <input 
                        placeholder="Breve descritivo"
                        value={newReward.description}
                        onChange={e => setNewReward({...newReward, description: e.target.value})}
                        className="w-full bg-surface-container border-none rounded-xl font-bold text-secondary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      disabled={submitting}
                      onClick={handleAddReward}
                      className="flex-1 bg-secondary text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                      {submitting ? 'CADASTRANDO...' : 'CADASTRAR PRODUTO'}
                    </button>
                    <button onClick={() => setShowNewForm(false)} className="px-6 bg-surface-container-highest text-on-surface-variant rounded-2xl font-bold text-xs uppercase tracking-widest">FECHAR</button>
                  </div>
                </section>
              ) : (
                <button 
                  onClick={() => setShowNewForm(true)}
                  className="w-full bg-surface-container-highest hover:bg-secondary/10 text-secondary py-6 rounded-[32px] border-2 border-dashed border-secondary/30 font-headline font-black text-xs uppercase tracking-[0.2em] transition-all"
                >
                  + CADASTRAR NOVO PRODUTO
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </WavyBackground>
  );
}
