import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface MarketingModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: {
        title: string;
        content: string;
        icon: string;
        button_text: string;
        button_link: string;
    } | null;
}

export default function MarketingModal({ isOpen, onClose, message }: MarketingModalProps) {
    const navigate = useNavigate();

    if (!message) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-secondary/60 backdrop-blur-xl" 
                    />
                    <motion.div 
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                        className="relative bg-white w-full max-w-sm rounded-[42px] overflow-hidden shadow-2xl border-4 border-white"
                    >
                        {/* Header com Ícone Gigante */}
                        <div className="bg-secondary p-10 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <span className="material-symbols-outlined text-[150px] absolute -right-10 -bottom-10 rotate-12">{message.icon}</span>
                            </div>
                            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl relative z-10 animate-bounce">
                                <span className="material-symbols-outlined text-5xl text-secondary font-black">{message.icon}</span>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-10 text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight leading-none italic">{message.title}</h3>
                                <div className="w-12 h-1 bg-secondary mx-auto rounded-full opacity-30" />
                            </div>
                            
                            <p className="text-sm font-bold text-on-surface-variant leading-relaxed opacity-80 uppercase tracking-wide">
                                {message.content}
                            </p>

                            <div className="pt-4 space-y-3">
                                <button 
                                    onClick={() => {
                                        onClose();
                                        navigate(message.button_link);
                                    }}
                                    className="w-full h-16 bg-secondary text-white rounded-3xl font-headline font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-secondary/30 active:scale-95 transition-all"
                                >
                                    {message.button_text}
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="w-full h-10 text-on-surface-variant/40 font-black text-[10px] uppercase tracking-widest hover:text-secondary transition-colors"
                                >
                                    VER DEPOIS
                                </button>
                            </div>
                        </div>

                        {/* Decoration Footer */}
                        <div className="h-2 bg-gradient-to-r from-secondary via-white to-secondary opacity-20" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
