import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { notifyAdmin } from '../lib/notifications';
import WavyBackground from '../components/WavyBackground';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  tag: string;
  type: string;
  classes_per_week: number;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: plansData } = await supabase.from('plans').select('*');
      setPlans(plansData || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(profileData);
      }
    } catch (error: any) {
        console.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/');

        const plan = plans.find(p => p.id === planId);
        if (!confirm(`Deseja realmente solicitar a assinatura do plano ${plan?.name || ''}?`)) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                pending_plan_id: planId,
                plan_status: 'pendente'
            })
            .eq('id', user.id);

        if (error) throw error;

        // Notify Admin
        notifyAdmin('plan_request', {
          full_name: profile?.full_name || 'Aluno',
          plan_name: plan?.name || 'Plano'
        });

        alert('Solicitação enviada! Aguarde a aprovação do administrador.');
        fetchData();
    } catch (error: any) {
        alert(error.message);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase tracking-widest animate-pulse">Carregando Planos Skema...</div>;

  const recorrentes = plans.filter(p => p.type === 'recorrente');
  const avulsos = plans.filter(p => p.type === 'avulso');

  return (
    <WavyBackground topHeight="25%">
      <div className="font-body text-on-surface antialiased min-h-screen pb-32 relative">
      <TopAppBar title="SKEMA BEACH CLUB" showBackButton />

      <main className="pt-24 px-6 max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute -right-16 top-32 opacity-5 pointer-events-none select-none">
          <span className="material-symbols-outlined text-[300px]">waves</span>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="mb-4">
            <span className="material-symbols-outlined text-secondary text-6xl">beach_access</span>
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight uppercase text-center">Selecione seu Plano</h1>
          <p className="text-on-surface-variant text-sm mt-2 font-medium opacity-80 uppercase tracking-widest">Academia de Futevôlei</p>
          
          {profile?.plan_status === 'pendente' && (
              <div className="mt-6 p-4 bg-secondary/10 border-2 border-secondary/20 rounded-2xl text-secondary text-xs font-bold uppercase tracking-widest text-center">
                  Sua solicitação está sendo analisada pelo Admin
              </div>
          )}
        </div>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-[2px] w-8 bg-secondary-container"></span>
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-secondary">PLANOS RECORRENTES</h2>
          </div>
          <div className="grid gap-6">
            {recorrentes.map(plan => (
                <div key={plan.id} className="group relative bg-surface-container-lowest p-6 rounded-xl transition-all hover:translate-y-[-4px]">
                    <div className="relative flex justify-between items-start">
                        <div className="flex-1">
                            {plan.tag && <span className="inline-block px-2 py-0.5 bg-secondary text-white text-[10px] font-bold rounded mb-2 uppercase tracking-tighter">{plan.tag}</span>}
                            <h3 className="font-headline font-bold text-xl text-on-surface">{plan.name}</h3>
                            <p className="text-on-surface-variant text-sm font-medium mt-1">
                                {plan.classes_per_week >= 99 ? 'Check-in Livre' : `${plan.classes_per_week} aulas / semana`}
                            </p>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-xs font-bold text-on-surface">R$</span>
                                <span className="text-2xl font-black text-on-surface">{plan.price}</span>
                                <span className="text-xs font-medium text-on-surface-variant">/mês</span>
                            </div>
                        </div>
                        <button 
                            disabled={profile?.plan_status === 'pendente' || profile?.plan_id === plan.id}
                            onClick={() => handleSubscribe(plan.id)}
                            className="bg-secondary text-white px-5 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
                        >
                            {profile?.plan_id === plan.id ? 'Ativo' : 'Assinar'}
                        </button>
                    </div>
                </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-[2px] w-8 bg-secondary-container opacity-50"></span>
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-on-surface-variant">AULAS AVULSAS</h2>
          </div>
          {avulsos.map(plan => (
            <div key={plan.id} className="bg-surface-container-highest p-8 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative mb-4">
                <div className="relative z-10">
                    <h3 className="font-headline font-bold text-2xl text-on-surface">{plan.name}</h3>
                    <p className="text-on-surface-variant text-sm font-medium mt-1">{plan.description || 'Perfeito para conhecer nossa vibe.'}</p>
                </div>
                <div className="relative z-10 flex flex-col items-start md:items-end gap-3">
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-on-surface">R$</span>
                        <span className="text-4xl font-black text-on-surface">{plan.price}</span>
                    </div>
                    <button 
                        onClick={() => handleSubscribe(plan.id)}
                        className="w-full md:w-auto bg-secondary text-white px-8 py-4 rounded-xl font-headline font-bold text-sm uppercase tracking-widest shadow-xl hover:translate-y-[-2px] transition-all"
                    >
                        Assinar
                    </button>
                </div>
            </div>
          ))}
        </section>
      </main>

      <StudentNavbar activePage="perfil" />
      </div>
    </WavyBackground>
  );
}
