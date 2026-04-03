import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';

interface PendingApproval {
  id: string;
  full_name: string;
  email: string;
  pending_plan_id: string;
  plan_name?: string;
}

export default function ManageApprovals() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          pending_plan_id,
          pending_plan:pending_plan_id(name, classes_per_week, type, billing_cycle),
          remaining_checkins
        `)
        .eq('plan_status', 'pendente');

      if (error) throw error;

      if (data) {
        const updated = data.map((p: any) => ({
          ...p,
          plan_name: p.pending_plan?.name
        }));
        setApprovals(updated);
      } else {
        setApprovals([]);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, planId: string | null, approve: boolean) {
    try {
      if (approve) {
        const app = approvals.find(a => a.id === userId);
        if (app) {
          const { data: planData } = await supabase.from('plans').select('*').eq('id', planId).single();
          
          let updates: any = { 
            plan_status: 'ativo', 
            pending_plan_id: null 
          };

          if (planData) {
            // Se for recorrente, trocamos o plano e a data âncora
            if (planData.type === 'recorrente') {
              updates.plan_id = planId;
              updates.plan_activated_at = new Date().toISOString();
              updates.remaining_checkins = (app.remaining_checkins || 0) + planData.classes_per_week;
            } else {
              // Se for avulso, apenas incrementamos o saldo (Skema Day)
              updates.remaining_checkins = (app.remaining_checkins || 0) + 1;
            }
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

          if (updateError) throw updateError;

          const { notifyAdmin } = await import('../lib/notifications');
          await notifyAdmin('plan_approved', {
            email: app.email,
            full_name: app.full_name,
            plan_name: app.plan_name
          });
        }
      } else {
        // Recusa
        await supabase
          .from('profiles')
          .update({ plan_status: 'nenhum', pending_plan_id: null })
          .eq('id', userId);
      }
      
      setSuccessMsg(approve ? 'Plano aprovado com sucesso!' : 'Solicitação recusada.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchApprovals();
    } catch (error: any) {
      alert(error.message);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Carregando solicitações...</div>;

  return (
    <WavyBackground topHeight="25%">
      <div className="font-body text-on-surface antialiased min-h-screen pb-32 relative">
      <TopAppBar title="Aprovações de Planos" showBackButton />

      <main className="pt-24 px-6 max-w-2xl mx-auto relative">
        <div className="mb-10">
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">Solicitações Pendentes</h1>
          <p className="text-on-surface-variant text-sm font-medium">Aprovação de novos planos para alunos</p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest text-center animate-bounce">
            {successMsg}
          </div>
        )}

        {approvals.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-outline-variant/30 rounded-3xl p-12 text-center">
            <span className="material-symbols-outlined text-outline-variant/30 text-6xl mb-4">check_circle</span>
            <p className="text-on-surface-variant font-medium">Nenhuma solicitação pendente no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map(app => (
              <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-primary-container/10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline font-bold text-lg">{app.full_name || 'Aluno Sem Nome'}</h3>
                    <p className="text-on-surface-variant text-sm lowercase">{app.email}</p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-secondary text-sm">payments</span>
                      <span className="text-secondary text-xs font-black uppercase tracking-widest">{app.plan_name || 'Plano Desconhecido'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAction(app.id, app.pending_plan_id, true)}
                    className="flex-1 bg-secondary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:opacity-90 transition-all"
                  >
                    Aprovar
                  </button>
                  <button 
                    onClick={() => handleAction(app.id, null, false)}
                    className="px-6 py-3 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-error/10 hover:text-error transition-all"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </div>
    </WavyBackground>
  );
}
