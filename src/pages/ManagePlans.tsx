import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  tag: string;
  type: string;
  classes_per_week: number;
}

export default function ManagePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPlan, setNewPlan] = useState<Omit<Plan, 'id'>>({ name: '', price: 0, description: '', tag: '', type: 'recorrente', classes_per_week: 2 });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('plans').select('*');
      if (error) throw error;
      setPlans(data || []);
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

  async function updatePlan(id: string, updates: Partial<Plan>) {
    try {
      const { error } = await supabase.from('plans').update(updates).eq('id', id);
      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Excluir este plano?')) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== id));
      showSuccess('Plano removido!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function addPlan() {
    if (!newPlan.name || !newPlan.price) return;
    try {
      const { data, error } = await supabase.from('plans').insert(newPlan).select().single();
      if (error) throw error;
      setPlans(prev => [...prev, data]);
      setNewPlan({ name: '', price: 0, description: '', tag: '', type: 'recorrente' });
      setShowNewForm(false);
      showSuccess('Plano criado!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function savePlan(id: string) {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    await updatePlan(id, plan);
    setEditingId(null);
    showSuccess('Plano atualizado!');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando planos...</div>;

  const recorrentes = plans.filter(p => p.type === 'recorrente');
  const avulsos = plans.filter(p => p.type === 'avulso');

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-32">
      <TopAppBar title="Gestão de Planos" showBackButton />

      <main className="pt-24 px-6 max-w-2xl mx-auto relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute -right-16 top-32 opacity-5 pointer-events-none select-none">
          <span className="material-symbols-outlined text-[300px]">waves</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary-container rounded-2xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl">payments</span>
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">Gerenciar Planos</h1>
              <p className="text-on-surface-variant text-sm font-medium">Edite preços, nomes e tipos de plano</p>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Planos Recorrentes */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-[2px] w-8 bg-secondary-container"></span>
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-secondary">PLANOS RECORRENTES</h2>
          </div>

          <div className="space-y-4">
            {recorrentes.map(plan => (
              <div key={plan.id} className="group relative bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_4px_20px_rgba(164,60,18,0.06)] transition-all">
                {editingId === plan.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Nome</label>
                        <input
                          value={plan.name}
                          onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, name: e.target.value } : p))}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Preço</label>
                        <input
                          value={plan.price}
                          onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price: Number(e.target.value) } : p))}
                          type="number"
                          className="w-full h-12 px-4 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Aulas/Sem</label>
                        <input
                          value={plan.classes_per_week}
                          onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, classes_per_week: Number(e.target.value) } : p))}
                          type="number"
                          className="w-full h-12 px-4 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                       <button onClick={() => savePlan(plan.id)} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Salvar</button>
                       <button onClick={() => setEditingId(null)} className="px-6 py-3 bg-surface-container-highest rounded-xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      {plan.tag && <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[10px] font-bold rounded mb-2 inline-block">{plan.tag}</span>}
                      <h3 className="font-headline font-bold text-xl">{plan.name}</h3>
                      <p className="text-on-surface-variant text-sm">{plan.description || `${plan.classes_per_week} aulas por semana`}</p>
                      <p className="mt-3 text-2xl font-black">R$ {plan.price}<span className="text-xs font-medium opacity-50">/mês</span></p>
                    </div>
                    <div className="flex flex-col gap-2">
                       <button onClick={() => setEditingId(plan.id)} className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button>
                       <button onClick={() => deletePlan(plan.id)} className="w-10 h-10 bg-error/10 text-error rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ... Rest of UI for avulsos and new form ... */}
        {showNewForm ? (
          <section className="p-6 bg-white rounded-3xl border-2 border-primary/20 space-y-4">
             <h3 className="font-headline font-bold text-xl">Novo Plano</h3>
             <input placeholder="Nome" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} className="w-full h-12 px-4 rounded-xl bg-surface-container" />
             <input placeholder="Preço" type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({...p, price: Number(e.target.value)}))} className="w-full h-12 px-4 rounded-xl bg-surface-container" />
             <select value={newPlan.type} onChange={e => setNewPlan(p => ({...p, type: e.target.value}))} className="w-full h-12 px-4 rounded-xl bg-surface-container">
                <option value="recorrente">Recorrente</option>
                <option value="avulso">Avulso</option>
             </select>
             <button onClick={addPlan} className="w-full bg-primary text-white py-4 rounded-xl font-bold">CRIAR PLANO</button>
          </section>
        ) : (
          <button onClick={() => setShowNewForm(true)} className="w-full bg-secondary text-white py-5 rounded-2xl font-bold shadow-lg">CRIAR NOVO PLANO</button>
        )}
      </main>
    </div>
  );
}
