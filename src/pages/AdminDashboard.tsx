import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Gestão de Alunos', icon: 'groups', path: '/admin/students', color: 'bg-primary' },
    { title: 'Dashboard & Métricas', icon: 'analytics', path: '/admin/analytics', color: 'bg-secondary' },
    { title: 'Aprovações Pendentes', icon: 'how_to_reg', path: '/admin/approvals', color: 'bg-primary-container' },
    { title: 'Gestão de Lazer', icon: 'stadium', path: '/admin/leisure', color: 'bg-secondary' },
    { title: 'Prêmios (Fidelidade)', icon: 'redeem', path: '/admin/loyalty', color: 'bg-primary' },
    { title: 'Caixa (Resgate)', icon: 'qr_code_scanner', path: '/admin/scan-pontos', color: 'bg-secondary' },
    { title: 'Gestão de Professores', icon: 'badge', path: '/manage-teachers', color: 'bg-primary' },
    { title: 'Gestão de Planos', icon: 'payments', path: '/manage-plans', color: 'bg-secondary' },
    { title: 'Gestão de Marketing', icon: 'campaign', path: '/admin/marketing', color: 'bg-primary' },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="min-h-screen pb-32 font-body relative">
      <TopAppBar title="PAINEL ADMINISTRATIVO" />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <header>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-white">Olá, Administrador!</h2>
          <p className="text-white/70 font-medium mt-1">O que vamos gerenciar hoje?</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menuItems.map((item, idx) => (
            <Link 
              key={idx} 
              to={item.path}
              className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/20 shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col gap-4"
            >
              <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <h3 className="font-headline font-bold text-lg leading-tight">{item.title}</h3>
            </Link>
          ))}
        </section>

        <section className="bg-surface-container-highest p-6 rounded-3xl space-y-4">
          <h3 className="font-headline font-bold text-xl">Atalhos Rápidos</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate('/profile')} className="w-full h-14 bg-white rounded-xl font-bold flex items-center px-6 gap-3 shadow-sm active:scale-95 transition-transform text-sm">
              <span className="material-symbols-outlined text-primary">person</span>
              Meu Perfil
            </button>
            <button onClick={handleLogout} className="w-full h-14 bg-white rounded-xl font-bold flex items-center px-6 gap-3 shadow-sm active:scale-95 transition-transform text-error text-sm">
              <span className="material-symbols-outlined">logout</span>
              Sair do App
            </button>
          </div>
        </section>
      </main>
      </div>
    </WavyBackground>
  );
}
