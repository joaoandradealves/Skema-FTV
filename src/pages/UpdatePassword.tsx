import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import { useNavigate } from 'react-router-dom';

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if there is an active session (valid reset link)
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // We're good to stay on this page
                console.log('Recovery flow active');
            }
        });
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
           setError('A senha deve ter pelo menos 6 caracteres.');
           setLoading(false);
           return;
        }

        const { error } = await supabase.auth.updateUser({ 
            password: password 
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => navigate('/'), 3000);
        }
        setLoading(false);
    };

    return (
        <WavyBackground topHeight="40%">
            <div className="flex flex-col relative min-h-screen pt-12 px-8">
                <main className="relative z-20 flex-grow flex flex-col items-center max-w-sm mx-auto w-full">
                    <div className="mb-8 text-center text-white">
                        <h1 className="font-headline font-black text-3xl tracking-widest uppercase">Nova Senha</h1>
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2">Escolha uma senha forte</p>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full space-y-6">
                        {success ? (
                            <div className="text-center space-y-4 py-8">
                                <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
                                </div>
                                <h3 className="font-headline font-black text-2xl">Senha Atualizada!</h3>
                                <p className="text-on-surface-variant text-xs font-medium">Redirecionando para o login em instantes...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-4">
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Nova Senha</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-14 px-6 rounded-2xl bg-surface-container border-none shadow-inner focus:ring-2 focus:ring-primary transition-all font-bold"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-14 px-6 rounded-2xl bg-surface-container border-none shadow-inner focus:ring-2 focus:ring-primary transition-all font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-bold text-center border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-16 bg-primary text-white rounded-2xl font-headline font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50"
                                >
                                    {loading ? 'ATUALIZANDO...' : 'ALTERAR SENHA'}
                                </button>
                            </form>
                        )}
                    </div>
                </main>
            </div>
        </WavyBackground>
    );
}
