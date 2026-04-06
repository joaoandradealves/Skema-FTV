import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface CPFModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cpf: string) => void;
}

export default function CPFModal({ isOpen, onClose, onSuccess }: CPFModalProps) {
    const [cpf, setCpf] = useState('');
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

    const handleSave = async () => {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) {
            setError('CPF inválido. Deve conter 11 dígitos.');
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada. Faça login novamente.');

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ cpf: cleanCPF })
                .eq('id', user.id);

            if (updateError) throw updateError;
            
            onSuccess(cleanCPF);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar CPF');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose}
                        className="absolute inset-0 bg-secondary/80 backdrop-blur-md" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6"
                    >
                        <div className="text-center space-y-2">
                             <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl font-black">badge</span>
                             </div>
                             <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tighter">Só mais um detalhe!</h3>
                             <p className="text-[11px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest leading-relaxed">
                                 Precisamos do seu CPF para processar o pagamento com segurança no Mercado Pago.
                             </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Seu CPF</label>
                                <input 
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                                    className="w-full h-14 bg-surface-container-highest rounded-2xl px-5 font-black text-center text-lg focus:ring-2 focus:ring-secondary/20 border-none transition-all text-on-surface"
                                />
                            </div>
                            {error && <p className="text-[10px] text-error font-black text-center uppercase tracking-widest animate-pulse">{error}</p>}
                        </div>

                        <div className="space-y-3 pt-2">
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full h-16 bg-secondary text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                            >
                                {loading ? 'PROCESSANDO...' : 'SALVAR E IR PARA PAGAMENTO'}
                                {!loading && <span className="material-symbols-outlined ml-2">check_circle</span>}
                            </button>
                            <button 
                                onClick={onClose} 
                                className="w-full text-on-surface-variant/40 font-black text-[10px] uppercase tracking-widest hover:text-on-surface transition-colors py-2"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
