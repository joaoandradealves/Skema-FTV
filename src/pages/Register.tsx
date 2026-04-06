import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { notifyAdmin } from '../lib/notifications';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica de CPF
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      setError('CPF inválido. Deve conter 11 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
          cpf: cleanCPF
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Notify Admin
      notifyAdmin('registration', {
        full_name: fullName,
        email: email,
        phone: phone,
        role: role,
        cpf: cleanCPF
      });

      alert('Cadastro realizado com sucesso! Verifique seu e-mail (se habilitado) ou faça login.');
      navigate('/');
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-container/30 min-h-screen relative overflow-hidden flex flex-col px-6 pt-12 pb-24">
      {/* Decorative Mermaid Watermark */}
      <div className="opacity-[0.03] pointer-events-none absolute right-[-10%] top-[15%] transform rotate-[15deg] select-none">
        <span className="material-symbols-outlined text-[32rem]">waves</span>
      </div>

      <header className="relative z-10 mb-8">
        <h1 className="font-headline font-bold text-4xl tracking-tight text-on-surface leading-tight">
          Crie sua Conta
        </h1>
        <p className="font-body text-on-surface-variant mt-2 text-sm max-w-[240px]">
          Junte-se ao círculo exclusivo de atletas do Skema Beach Club.
        </p>
      </header>

      <section className="flex-grow relative z-10 max-w-md mx-auto w-full">
        <form className="space-y-4" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Eu sou...</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${role === 'student' ? 'bg-[#48D1E0] text-on-surface' : 'bg-surface-container-highest text-on-surface-variant opacity-60'}`}
              >
                ALUNO
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${role === 'teacher' ? 'bg-[#EF7651] text-white' : 'bg-surface-container-highest text-on-surface-variant opacity-60'}`}
              >
                PROFESSOR
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</label>
            <input
              className="w-full h-12 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium"
              placeholder="Digite seu nome completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">E-mail</label>
            <input
              className="w-full h-12 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium"
              placeholder="exemplo@skema.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Senha</label>
            <input
              className="w-full h-12 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">CPF (apenas números)</label>
            <input
              className="w-full h-12 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium"
              placeholder="000.000.000-00"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Telefone</label>
            <input
              className="w-full h-12 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium"
              placeholder="+55 (11) 00000-0000"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              className="w-full h-14 bg-[#006971] text-white font-headline font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? 'CADASTRANDO...' : 'CADASTRAR'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-on-surface-variant">
            Já tem uma conta?
            <Link to="/" className="text-primary font-bold ml-1 hover:underline">Entrar</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
