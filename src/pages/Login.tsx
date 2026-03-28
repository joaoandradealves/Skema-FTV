import React, { useState } from 'react';
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
    <WavyBackground topHeight="55%">
      <div className="flex flex-col relative" style={{ minHeight: '100vh' }}>

      <main className="relative z-20 flex-grow flex flex-col items-center pt-12 px-8">
        <div className="mt-8 mb-4 relative z-30 flex flex-col items-center">
          <img
            alt="Skema Mermaid"
            className="w-40 h-40 object-contain drop-shadow-sm mb-4"
            src="/sereia.svg"
          />
          <header className="text-center">
            <h1 className="font-headline font-bold text-3xl tracking-[0.15em] leading-tight text-white drop-shadow-md">
              SKEMA
            </h1>
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/80 mt-1 ml-1">
              BEACH CLUB
            </p>
          </header>
        </div>

        <AnimatePresence mode="wait">
          {step === 'splash' ? (
            <motion.div
              key="splash"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xs flex flex-col items-center space-y-6"
            >
              <p className="text-on-surface font-bold text-lg text-center mt-2">
                Jogue na areia com quem sabe!
              </p>

              <div className="w-full space-y-4 pt-4">
                <button
                  onClick={() => startLoginFlow('student')}
                  className="w-full py-4 px-6 rounded-3xl font-headline font-bold text-on-surface bg-[#48D1E0] shadow-md hover:bg-[#3bc2d1] active:scale-95 transition-all text-sm uppercase tracking-widest border border-white/20"
                >
                  LOGIN ALUNO
                </button>
                <button
                  onClick={() => startLoginFlow('teacher')}
                  className="w-full py-4 px-6 rounded-3xl font-headline font-bold text-white bg-[#EF7651] shadow-md hover:bg-[#d46545] active:scale-95 transition-all text-sm uppercase tracking-widest border border-white/20"
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
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-8 text-center pb-8 relative z-20">
          <p className="font-label font-medium text-sm text-on-surface">
            Não tem conta? <Link to="/register" className="font-bold underline decoration-2 underline-offset-4 decoration-[#006971]/30">Cadastre-se</Link>
          </p>
        </footer>
      </main>
      </div>
    </WavyBackground>
  );
}
