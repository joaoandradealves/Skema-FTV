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
  const [config, setConfig] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
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

  async function fetchConfig() {
    try {
      setLoadingConfig(true);
      const { data, error } = await supabase.from('loyalty_config').select('*').order('id', { ascending: true });
      if (error) throw error;
      setConfig(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoadingConfig(false);
    }
  }

  useEffect(() => {
    fetchConfig();
  }, []);

  async function handleUpdateConfig(id: string, newValue: number) {
    try {
      setSubmitting(true);
      const { error } = await supabase.from('loyalty_config').update({ value: newValue }).eq('id', id);
      if (error) throw error;
      showSuccess('Configuração de pontos atualizada!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  async function uploadImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('loyalty_images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('loyalty_images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
      return null;
    }
  }

  async function handleAddReward() {
    if (!newReward.name || !newReward.points_cost) return;
    try {
      setSubmitting(true);
      
      let imageUrl = newReward.image_url;
      const fileInput = document.getElementById('new-reward-image') as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        const uploadedUrl = await uploadImage(fileInput.files[0]);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const { data, error } = await supabase.from('loyalty_rewards').insert([{
        ...newReward,
        image_url: imageUrl
      }]).select().single();
      
      if (error) throw error;
      setRewards(prev => [...prev, data]);
      setNewReward({ name: '', points_cost: 100, description: '', image_url: '', active: true });
      if (fileInput) fileInput.value = '';
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
      
      let imageUrl = reward.image_url;
      const fileInput = document.getElementById(`edit-image-${id}`) as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        const uploadedUrl = await uploadImage(fileInput.files[0]);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const { error } = await supabase.from('loyalty_rewards').update({
        ...reward,
        image_url: imageUrl
      }).eq('id', id);
      
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
                         <div className="col-span-2">
                            <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Alterar Foto</label>
                            <input 
                              id={`edit-image-${reward.id}`}
                              type="file" 
                              accept="image/*"
                              className="w-full text-[10px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
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
                        <div className={`w-14 h-14 bg-surface-container-highest rounded-2xl flex items-center justify-center overflow-hidden text-secondary shadow-inner border border-primary/10`}>
                          {reward.image_url ? (
                            <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-3xl font-bold">{reward.active ? 'redeem' : 'lock'}</span>
                          )}
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
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase ml-2">Foto do Produto</label>
                      <input 
                        id="new-reward-image"
                        type="file" 
                        accept="image/*"
                        className="w-full text-xs file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 cursor-pointer bg-surface-container rounded-2xl"
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

          {/* Points Configuration Section */}
          <section className="pt-12 space-y-6">
            <div className="space-y-1 border-t-2 border-primary-container/10 pt-12">
               <h3 className="font-headline text-3xl font-black tracking-tighter text-on-surface">💰 Gestão de <span className="text-primary">Pontuação</span></h3>
               <p className="text-on-surface-variant text-sm font-medium">Defina quantos pontos o aluno ganha por cada ação.</p>
            </div>

            {loadingConfig ? (
                <div className="py-10 text-center opacity-30 animate-pulse font-black text-[10px] uppercase tracking-widest">Carregando regras...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {config.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-[32px] border-2 border-primary-container/5 shadow-sm flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl font-bold">
                                        {item.id === 'class_checkin' ? 'school' : item.id === 'day_use' ? 'umbrella' : 'sports_tennis'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-headline font-black text-lg text-on-surface leading-tight">{item.label}</h4>
                                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{item.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-surface-container rounded-2xl p-2 min-w-[140px]">
                                <input 
                                    type="number"
                                    value={item.value}
                                    onChange={e => setConfig(prev => prev.map(c => c.id === item.id ? { ...c, value: Number(e.target.value) } : c))}
                                    className="w-16 bg-transparent border-none font-headline font-black text-2xl text-primary p-0 text-center focus:ring-0"
                                />
                                <button 
                                    onClick={() => handleUpdateConfig(item.id, item.value)}
                                    className="bg-primary text-white h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </section>
        </main>
      </div>
    </WavyBackground>
  );
}
