import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (method: 'app' | 'local') => void;
    price: number;
}

export default function PaymentChoiceModal({ isOpen, onClose, onSelect, price }: PaymentChoiceModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-secondary/40 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative z-10 space-y-6 overflow-hidden"
                    >
                        {/* Decorative background element */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-2 text-center">
                            <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl font-black">payments</span>
                            </div>
                            <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tight">
                                Como deseja <span className="text-secondary">pagar?</span>
                            </h3>
                            <p className="text-on-surface-variant/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                Valor da reserva: <span className="text-on-surface">R$ {price},00</span>
                            </p>
                        </div>

                        <div className="grid gap-3">
                            <button 
                                onClick={() => onSelect('app')}
                                className="group relative bg-on-surface text-surface p-6 rounded-[28px] text-left transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-on-surface/10 overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Pagar agora</p>
                                        <h4 className="font-headline font-black text-lg leading-tight uppercase italic">Pelo App</h4>
                                        <p className="text-[9px] font-medium opacity-60 normal-case">Liberação imediata e pontos automáticos.</p>
                                    </div>
                                    <span className="material-symbols-outlined text-secondary text-2xl font-black">bolt</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => onSelect('local')}
                                className="group relative bg-surface-container-highest p-6 rounded-[28px] text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-secondary/20 overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Pagar depois</p>
                                        <h4 className="font-headline font-black text-lg text-on-surface leading-tight uppercase italic">No Local (Bar)</h4>
                                        <p className="text-[9px] font-medium text-on-surface-variant/60 normal-case">Pague ao chegar para retirar sua pulseira.</p>
                                    </div>
                                    <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl">storefront</span>
                                </div>
                            </button>
                        </div>

                        <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-[24px] space-y-2">
                            <div className="flex items-center gap-2 text-amber-700">
                                <span className="material-symbols-outlined text-lg font-black">warning</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">Aviso Obrigatório</p>
                            </div>
                            <p className="text-[11px] text-amber-900/70 font-bold leading-tight">
                                É obrigatória a retirada da pulseira no bar do clube antes de entrar na quadra. A prática de Day Use sem pulseira é proibida e sujeita a regras da quadra.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-2 text-[10px] font-black uppercase text-on-surface-variant/40 tracking-[0.3em] hover:text-on-surface transition-colors"
                        >
                            Cancelar
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
