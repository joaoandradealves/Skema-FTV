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
      const { data, error } = await supabase.from('plans').select('*').order('created_at', { ascending: false });
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

  async function updatePlan(id: string) {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    try {
      const { error } = await supabase.from('plans').update({
          name: plan.name,
          price: plan.price,
          description: plan.description,
          tag: plan.tag,
          type: plan.type,
          classes_per_week: plan.classes_per_week
      }).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      showSuccess('Plano atualizado!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Deseja realmente excluir este plano? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== id));
      showSuccess('Plano removido com sucesso!');
    } catch (error: any) {
      alert("Erro ao excluir: Verifique se existem alunos vinculados a este plano antes de excluir.");
    }
  }

  async function addPlan() {
    if (!newPlan.name || !newPlan.price) {
        alert("Preencha o nome e o preço.");
        return;
    }
    try {
      const { data, error } = await supabase.from('plans').insert(newPlan).select().single();
      if (error) throw error;
      setPlans(prev => [data, ...prev]);
      setNewPlan({ name: '', price: 0, description: '', tag: '', type: 'recorrente', classes_per_week: 2 });
      setShowNewForm(false);
      showSuccess('Plano criado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-headline font-bold text-primary animate-pulse">CARREGANDO PLANOS...</p>
    </div>
  );

  const recorrentes = plans.filter(p => p.type === 'recorrente');
  const avulsos = plans.filter(p => p.type === 'avulso');

  const PlanCard = ({ plan }: { plan: Plan }) => (
    <div key={plan.id} className="group relative bg-white p-6 rounded-3xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/10 transition-all hover:shadow-md">
      {editingId === plan.id ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Nome do Plano</label>
              <input
                value={plan.name}
                onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, name: e.target.value } : p))}
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Preço (R$)</label>
              <input
                value={plan.price}
                onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price: Number(e.target.value) } : p))}
                type="number"
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 ml-1">Check-ins Semanais</label>
            <div className="flex gap-2">
              <input
                value={plan.classes_per_week >= 99 ? '' : plan.classes_per_week}
                disabled={plan.classes_per_week >= 99}
                onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, classes_per_week: Number(e.target.value) } : p))}
                type="number"
                placeholder="Ilimitado"
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-semibold disabled:opacity-50"
              />
              <button 
                onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, classes_per_week: p.classes_per_week >= 99 ? 2 : 99 } : p))}
                className={`px-4 rounded-xl font-bold text-[10px] uppercase transition-all ${plan.classes_per_week >= 99 ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant'}`}
              >
                {plan.classes_per_week >= 99 ? 'LIMITAR' : 'LIVRE'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
             <button onClick={() => updatePlan(plan.id)} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">SALVAR</button>
             <button onClick={() => setEditingId(null)} className="px-6 py-4 bg-surface-container rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform">CANCELAR</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${plan.type === 'recorrente' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                    {plan.type}
                </span>
                {plan.tag && <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[9px] font-black rounded-md uppercase">{plan.tag}</span>}
            </div>
            <h3 className="font-headline font-bold text-xl text-on-surface">{plan.name}</h3>
            <p className="text-on-surface-variant text-sm mt-1">
                {plan.description || (plan.classes_per_week >= 99 ? 'Check-in Livre / Ilimitado' : `${plan.classes_per_week} aulas por semana`)}
            </p>
            <p className="mt-4 text-2xl font-black text-on-surface flex items-baseline gap-1">
                R$ {plan.price}
                <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                    {plan.type === 'recorrente' ? '/ mês' : '/ avulso'}
                </span>
            </p>
          </div>
          <div className="flex flex-col gap-2 ml-4">
             <button onClick={() => setEditingId(plan.id)} className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-[20px]">edit</span>
             </button>
             <button onClick={() => deletePlan(plan.id)} className="w-10 h-10 bg-error/5 text-error rounded-xl flex items-center justify-center hover:bg-error hover:text-white transition-all">
                <span className="material-symbols-outlined text-[20px]">delete</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-32">
      <TopAppBar title="GESTÃO DE PLANOS" showBackButton />

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col gap-2">
            <h1 className="font-headline font-extrabold text-3xl tracking-tight">Planos & Preços</h1>
            <p className="text-on-surface-variant text-sm font-medium">Gerencie as opções que seus alunos podem contratar.</p>
        </header>

        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Planos Recorrentes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Mensalidades (Recorrentes)
            </h2>
            <span className="text-[10px] font-bold text-on-surface-variant">{recorrentes.length} Registrados</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recorrentes.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            {recorrentes.length === 0 && (
                <div className="text-center py-10 bg-surface-container rounded-3xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant italic text-sm font-medium">Nenhum plano recorrente criado.</div>
            )}
          </div>
        </section>

        {/* Planos Avulsos */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Vendas Avulsas
            </h2>
            <span className="text-[10px] font-bold text-on-surface-variant">{avulsos.length} Registrados</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {avulsos.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            {avulsos.length === 0 && (
                <div className="text-center py-10 bg-surface-container rounded-3xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant italic text-sm font-medium">Nenhum plano avulso criado.</div>
            )}
          </div>
        </section>

        {/* Create New Plan Form */}
        <section className="pt-6">
            {showNewForm ? (
                <div className="bg-white p-8 rounded-[40px] border-4 border-primary/10 shadow-xl space-y-6 animate-in slide-in-from-bottom duration-500">
                    <div className="flex justify-between items-center">
                        <h3 className="font-headline font-extrabold text-2xl tracking-tighter">Criar Novo Plano</h3>
                        <button onClick={() => setShowNewForm(false)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Nome do Plano</label>
                            <input 
                                placeholder="Ex: Mensal Premium" 
                                value={newPlan.name} 
                                onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} 
                                className="w-full h-14 px-5 rounded-2xl bg-surface-container border-none focus:ring-4 focus:ring-primary/20 font-bold" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Valor Final (R$)</label>
                                <input 
                                    placeholder="0,00" 
                                    type="number" 
                                    value={newPlan.price || ''} 
                                    onChange={e => setNewPlan(p => ({...p, price: Number(e.target.value)}))} 
                                    className="w-full h-14 px-5 rounded-2xl bg-surface-container border-none focus:ring-4 focus:ring-primary/20 font-bold" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Tipo de Cobrança</label>
                                <select 
                                    value={newPlan.type} 
                                    onChange={e => setNewPlan(p => ({...p, type: e.target.value}))} 
                                    className="w-full h-14 px-5 rounded-2xl bg-surface-container border-none focus:ring-4 focus:ring-primary/20 font-bold appearance-none"
                                >
                                    <option value="recorrente">Ativo (Recorrente)</option>
                                    <option value="avulso">Avulso (Único)</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-[32px] border-2 border-primary/10 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Regra de Check-in</span>
                                <span className="text-lg font-black text-on-surface leading-tight">
                                    {newPlan.classes_per_week >= 99 ? 'LIVRE / ILIMITADO' : `${newPlan.classes_per_week || 0} Aulas / Semana`}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={newPlan.classes_per_week >= 99 ? '' : newPlan.classes_per_week} 
                                    disabled={newPlan.classes_per_week >= 99}
                                    onChange={e => setNewPlan(p => ({...p, classes_per_week: Number(e.target.value)}))}
                                    placeholder="Qtd"
                                    className="w-16 h-12 rounded-xl border-none bg-white text-center font-black shadow-sm disabled:opacity-20"
                                />
                                <button 
                                    onClick={() => setNewPlan(p => ({...p, classes_per_week: p.classes_per_week >= 99 ? 2 : 99}))}
                                    className={`px-4 rounded-xl font-black text-[10px] uppercase tracking-tighter shadow-sm transition-all ${newPlan.classes_per_week >= 99 ? 'bg-secondary text-white' : 'bg-white text-secondary'}`}
                                >
                                    {newPlan.classes_per_week >= 99 ? 'LIMITAR' : 'TORNAR LIVRE'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={addPlan} className="w-full bg-primary text-white h-16 rounded-2xl font-headline font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform">
                        PUBLICAR NOVO PLANO
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowNewForm(true)} 
                    className="w-full bg-secondary text-white py-6 rounded-[32px] font-headline font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-3xl">add_circle</span>
                    CRIAR NOVO PLANO
                </button>
            )}
        </section>
      </main>
    </div>
  );
}
