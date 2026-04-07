import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';
import WavyBackground from '../components/WavyBackground';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketingMessage {
    id: string;
    title: string;
    content: string;
    icon: string;
    button_text: string;
    button_link: string;
    is_active: boolean;
}

export default function ManageMarketing() {
    const [messages, setMessages] = useState<MarketingMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMsg, setCurrentMsg] = useState<Partial<MarketingMessage>>({
        title: '',
        content: '',
        icon: 'campaign',
        button_text: 'BORA!',
        button_link: '/court-booking',
        is_active: true
    });
    const [pushTitle, setPushTitle] = useState('');
    const [pushMessage, setPushMessage] = useState('');
    const [sendingPush, setSendingPush] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, []);

    async function fetchMessages() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketing_messages')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setMessages(data || []);
        } catch (error: any) {
            alert('Erro ao buscar mensagens: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            if (!currentMsg.title || !currentMsg.content) return alert('Título e Conteúdo são obrigatórios!');
            
            if (currentMsg.id) {
                const { error } = await supabase
                    .from('marketing_messages')
                    .update(currentMsg)
                    .eq('id', currentMsg.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('marketing_messages')
                    .insert([currentMsg]);
                if (error) throw error;
            }
            
            setIsModalOpen(false);
            fetchMessages();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        }
    }

    async function toggleActive(msg: MarketingMessage) {
        try {
            const { error } = await supabase
                .from('marketing_messages')
                .update({ is_active: !msg.is_active })
                .eq('id', msg.id);
            if (error) throw error;
            fetchMessages();
        } catch (error: any) {
            alert('Erro ao atualizar: ' + error.message);
        }
    }

    async function deleteMessage(id: string) {
        if (!confirm('Deseja excluir esta mensagem?')) return;
        try {
            const { error } = await supabase
                .from('marketing_messages')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchMessages();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        }
    }

    async function handleSendGlobalPush() {
        if (!pushTitle || !pushMessage) return alert('Preencha título e mensagem!');
        if (!confirm('Deseja realmente enviar esta notificação para TODOS os alunos inscritos?')) return;

        try {
            setSendingPush(true);
            const { notifyAdmin } = await import('../lib/notifications');
            await notifyAdmin('marketing_push', {
                title: pushTitle,
                message: pushMessage
            });
            alert('🚀 Notificação disparada com sucesso!');
            setPushTitle('');
            setPushMessage('');
        } catch (error: any) {
            alert('Erro ao disparar push: ' + error.message);
        } finally {
            setSendingPush(false);
        }
    }

    return (
        <WavyBackground topHeight="25%">
            <div className="pb-32 min-h-screen font-body relative">
                <TopAppBar title="ADMIN: MARKETING" />

                <main className="mt-20 px-6 max-w-2xl mx-auto space-y-10">
                    {/* Novo: Seção de Notificação Push Global */}
                    <section className="bg-white p-8 rounded-[40px] border-2 border-primary/20 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 opacity-10 rotate-12">
                            <span className="material-symbols-outlined text-[100px] text-primary">send_and_archive</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tight">Disparar <span className="text-primary">Push Global</span></h3>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Envie um alerta agora para todos os alunos</p>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <input 
                                type="text"
                                placeholder="Título da Notificação (Ex: AULAS ABERTAS!)"
                                className="w-full h-14 bg-surface rounded-2xl px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all"
                                value={pushTitle}
                                onChange={e => setPushTitle(e.target.value.toUpperCase())}
                            />
                            <textarea 
                                placeholder="Sua mensagem de marketing ou aviso geral..."
                                className="w-full h-32 bg-surface rounded-2xl p-6 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all resize-none"
                                value={pushMessage}
                                onChange={e => setPushMessage(e.target.value)}
                            />
                            <button 
                                onClick={handleSendGlobalPush}
                                disabled={sendingPush}
                                className="w-full h-14 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-sm font-black">rocket_launch</span>
                                {sendingPush ? 'ENVIANDO...' : '🚀 DISPARAR PARA TODOS OS ALUNOS'}
                            </button>
                        </div>
                    </section>
                    <header className="flex justify-between items-center text-white pb-4">
                        <div>
                            <h2 className="font-headline font-black text-2xl uppercase tracking-tight">Comunicação</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-none mt-1">Gerencie as frases do dashboard</p>
                        </div>
                        <button 
                            onClick={() => {
                                setCurrentMsg({ title: '', content: '', icon: 'campaign', button_text: 'BORA!', button_link: '/court-booking', is_active: true });
                                setIsModalOpen(true);
                            }}
                            className="bg-secondary text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            Novo Comunicado
                        </button>
                    </header>

                    {loading ? (
                        <div className="py-20 text-center animate-pulse font-black text-secondary grayscale uppercase text-xs tracking-widest">Carregando campanhas...</div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={`bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm flex items-center gap-4 group transition-all ${!msg.is_active ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined font-black">{msg.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-headline font-black text-sm uppercase text-on-surface mb-0.5">{msg.title}</h3>
                                        <p className="text-[10px] font-medium text-on-surface-variant line-clamp-2 leading-relaxed">{msg.content}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <button 
                                            onClick={() => toggleActive(msg)}
                                            className={`p-2 rounded-xl transition-all ${msg.is_active ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm font-black">{msg.is_active ? 'visibility' : 'visibility_off'}</span>
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setCurrentMsg(msg); setIsModalOpen(true); }} className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button>
                                            <button onClick={() => deleteMessage(msg.id)} className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Modal de cadastro/edição */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-secondary/40 backdrop-blur-md" />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                            >
                                <h3 className="font-headline font-black text-2xl text-on-surface uppercase mb-6">{currentMsg.id ? 'Editar Comunicado' : 'Novo Comunicado'}</h3>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-secondary/60 ml-2 tracking-widest">Título da Seção</label>
                                        <input 
                                            value={currentMsg.title} 
                                            onChange={e => setCurrentMsg({...currentMsg, title: e.target.value.toUpperCase()})}
                                            className="w-full h-12 bg-surface rounded-2xl px-4 font-bold text-sm outline-none border-2 border-transparent focus:border-secondary transition-all"
                                            placeholder="EX: NOVIDADE SKEMA"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-secondary/60 ml-2 tracking-widest">O que falar pro aluno?</label>
                                        <textarea 
                                            value={currentMsg.content} 
                                            onChange={e => setCurrentMsg({...currentMsg, content: e.target.value})}
                                            className="w-full h-24 bg-surface rounded-2xl p-4 font-bold text-sm outline-none border-2 border-transparent focus:border-secondary transition-all resize-none"
                                            placeholder="Digite sua frase de marketing aqui..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-secondary/60 ml-2 tracking-widest">Ícone (Google Symbols)</label>
                                            <input 
                                                value={currentMsg.icon} 
                                                onChange={e => setCurrentMsg({...currentMsg, icon: e.target.value})}
                                                className="w-full h-12 bg-surface rounded-2xl px-4 font-bold text-sm outline-none"
                                                placeholder="shopping_basket"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-secondary/60 ml-2 tracking-widest">Texto do Botão</label>
                                            <input 
                                                value={currentMsg.button_text} 
                                                onChange={e => setCurrentMsg({...currentMsg, button_text: e.target.value.toUpperCase()})}
                                                className="w-full h-12 bg-surface rounded-2xl px-4 font-bold text-sm outline-none"
                                                placeholder="BORA!"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-secondary/60 ml-2 tracking-widest">Link de Destino</label>
                                        <input 
                                            value={currentMsg.button_link} 
                                            onChange={e => setCurrentMsg({...currentMsg, button_link: e.target.value})}
                                            className="w-full h-12 bg-surface rounded-2xl px-4 font-bold text-sm outline-none"
                                            placeholder="/court-booking ou /meu-pontos"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 flex flex-col gap-3">
                                    <button onClick={handleSave} className="w-full h-14 bg-secondary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-secondary/20">Salvar Alterações</button>
                                    <button onClick={() => setIsModalOpen(false)} className="w-full h-12 text-on-surface-variant/40 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </WavyBackground>
    );
}
