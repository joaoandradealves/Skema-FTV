import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import WavyBackground from '../components/WavyBackground';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'splash' | 'form'>('splash');
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | null>(null);

  // Redirecionamento Automático se já houver sessão ativa
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setLoading(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') navigate('/admin');
        else if (profile?.role === 'teacher') navigate('/teacher');
        else navigate('/student');
      }
    }
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else if (profile?.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    }
  };

  const startLoginFlow = (role: 'student' | 'teacher') => {
    setLoginRole(role);
    setStep('form');
  };

  return (
    <WavyBackground topHeight="60%">
      <div className="flex flex-col relative" style={{ minHeight: '100vh' }}>

      <main className="relative z-20 flex-grow flex flex-col items-center px-8 pt-10">
        {/* Logo & Header Section - Naturally Flowing in the Blue Area */}
        <div className="flex flex-col items-center w-full mb-8">
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -15, 0]
              }}
              transition={{ 
                scale: { type: 'spring', damping: 20, stiffness: 100 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }}
              alt="Skema Mermaid"
              className="w-80 h-80 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-4"
              src="/sereia.svg"
            />
            <header className="text-center">
              <h1 className="font-headline font-black text-6xl tracking-[0.15em] leading-tight text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                SKEMA
              </h1>
              <p className="text-sm font-black tracking-[0.5em] uppercase text-white drop-shadow-md mt-2">
                BEACH CLUB
              </p>
            </header>
        </div>

        <div className="w-full flex flex-col items-center">
        <AnimatePresence mode="wait">
          {step === 'splash' ? (
            <motion.div
              key="splash"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xs flex flex-col items-center space-y-4"
            >
              <div className="w-full space-y-4 pt-4">
                <button
                  onClick={() => startLoginFlow('student')}
                  className="w-full h-16 px-6 rounded-3xl font-headline font-bold text-on-surface bg-[#48D1E0] shadow-md hover:bg-[#3bc2d1] active:scale-95 transition-all text-base uppercase tracking-widest border border-white/20"
                >
                  LOGIN ALUNO
                </button>
                <button
                  onClick={() => startLoginFlow('teacher')}
                  className="w-full h-16 px-6 rounded-3xl font-headline font-bold text-white bg-[#EF7651] shadow-md hover:bg-[#d46545] active:scale-95 transition-all text-base uppercase tracking-widest border border-white/20"
                >
                  LOGIN PROFESSOR
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-xs space-y-4"
            >
              <div className="flex items-center mb-2">
                <button onClick={() => setStep('splash')} className="text-on-surface-variant flex items-center text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Voltar
                </button>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Login {loginRole === 'student' ? 'Aluno' : 'Professor'}
                </span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] text-center font-bold">
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-[#48D1E0] transition-all placeholder:text-gray-300"
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-[#48D1E0] transition-all placeholder:text-gray-300"
                  required
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                style={{ backgroundColor: loginRole === 'teacher' ? '#EF7651' : '#006971' }}
                className="w-full py-4 px-6 rounded-2xl font-headline font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 mt-2"
              >
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>

              <div className="text-center pt-4">
                <Link 
                  to="/forgot-password" 
                  className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-60 hover:opacity-100 transition-opacity"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <footer className="mt-4 text-center pb-4 relative z-20">
          <p className="font-label font-medium text-sm text-on-surface">
            Não tem conta? <Link to="/register" className="font-bold underline decoration-2 underline-offset-4 decoration-[#006971]/30">Cadastre-se</Link>
          </p>
        </footer>
      </main>
      </div>
    </WavyBackground>
  );
}
