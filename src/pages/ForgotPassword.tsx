import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Enviamos um link de recuperação para o seu e-mail! Verifique sua caixa de entrada e spam.');
        }
        setLoading(false);
    };

    return (
        <WavyBackground topHeight="40%">
            <div className="flex flex-col relative min-h-screen pt-12 px-8">
                <main className="relative z-20 flex-grow flex flex-col items-center max-w-sm mx-auto w-full">
                    <div className="mb-8 text-center">
                        <h1 className="font-headline font-black text-3xl text-white tracking-widest uppercase">Recuperar Senha</h1>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-2">Skema Beach Club</p>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full space-y-6">
                        <button onClick={() => navigate(-1)} className="text-on-surface-variant flex items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                            <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Voltar
                        </button>

                        <div className="space-y-2">
                            <h2 className="font-headline font-black text-xl leading-tight">Esqueceu sua senha?</h2>
                            <p className="text-on-surface-variant text-xs leading-relaxed">Insira seu e-mail abaixo e enviaremos instruções para criar uma nova senha.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-bold text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        {message ? (
                            <div className="bg-primary/10 text-primary p-6 rounded-2xl text-xs font-bold text-center border border-primary/20 space-y-4">
                                <p>{message}</p>
                                <button onClick={() => navigate('/')} className="w-full py-3 bg-primary text-white rounded-xl uppercase tracking-widest text-[10px]">Ir para o Login</button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetRequest} className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Seu e-mail cadastrado"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl bg-surface-container border-none shadow-inner focus:ring-2 focus:ring-primary transition-all font-bold"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-16 bg-primary text-white rounded-2xl font-headline font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50"
                                >
                                    {loading ? 'ENVIANDO...' : 'ENVIAR LINK'}
                                </button>
                            </form>
                        )}
                    </div>
                </main>
            </div>
        </WavyBackground>
    );
}
