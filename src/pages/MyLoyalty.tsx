import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import TopAppBar from '../components/TopAppBar';
import WavyBackground from '../components/WavyBackground';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Reward {
    id: string;
    name: string;
    points_cost: number;
    description: string;
    image_url: string;
}

interface Transaction {
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
}

export default function MyLoyalty() {
    const navigate = useNavigate();
    const [points, setPoints] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingReward, setPendingReward] = useState<Reward | null>(null);
    const [redemptionId, setRedemptionId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [activeTier, setActiveTier] = useState<number | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [showTransactions, setShowTransactions] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let timer: any;
        if (showQR && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0) {
            setShowQR(false);
            setRedemptionId(null);
        }
        return () => clearInterval(timer);
    }, [showQR, timeLeft]);

    // Polling to check if redeemed
    useEffect(() => {
        let poll: any;
        if (redemptionId && showQR) {
            poll = setInterval(async () => {
                const { data } = await supabase
                    .from('loyalty_redemptions')
                    .select('status')
                    .eq('id', redemptionId)
                    .single();
                
                if (data?.status === 'redeemed') {
                    setShowQR(false);
                    setRedemptionId(null);
                    fetchData(); // Refresh points
                }
            }, 3000);
        }
        return () => clearInterval(poll);
    }, [redemptionId, showQR]);

    async function fetchData() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/');

            // Fetch Profile for Avatar
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();
            setProfile(profileData);

            const { data: pointsData } = await supabase
                .from('loyalty_points')
                .select('balance')
                .eq('user_id', user.id)
                .single();
            setPoints(pointsData?.balance || 0);

            const { data: rewardsData } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .eq('active', true)
                .order('points_cost', { ascending: true });
            setRewards(rewardsData || []);

        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTransactions() {
        try {
            setLoadingTransactions(true);
            setShowTransactions(true);
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('loyalty_transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setTransactions(data || []);
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setLoadingTransactions(false);
        }
    }

    function handleAskRedeem(reward: Reward) {
        if (points < reward.points_cost) return;
        setPendingReward(reward);
        setShowConfirmModal(true);
    }

    async function handleGenerateCoupon(reward: Reward) {
        if (points < reward.points_cost) return;
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('loyalty_redemptions')
                .insert({
                    student_id: user?.id,
                    reward_id: reward.id,
                    points_cost: reward.points_cost,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            
            setRedemptionId(data.id);
            setSelectedReward(reward);
            setShowQR(true);
            setShowConfirmModal(false);
            setPendingReward(null);
            setTimeLeft(600);
        } catch (error: any) {
            alert('Erro ao gerar cupom: ' + error.message);
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get unique tiers from rewards
    const tiers = Array.from(new Set(rewards.map(r => r.points_cost))).sort((a: any, b: any) => a - b) as number[];
    
    const filteredRewards = activeTier 
        ? rewards.filter(r => r.points_cost <= activeTier)
        : rewards;

    return (
        <WavyBackground topHeight="25%" bgColor="bg-surface" dividerColor="fill-surface">
            <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/20">
                <TopAppBar 
                    title="SKEMA POINTS" 
                    showBackButton 
                    avatarSrc={profile?.avatar_url}
                    avatarAlt={profile?.full_name}
                />

                <main className="mt-20 relative z-10">
                    {/* Points Summary - McDonald's Style */}
                    <header className="px-6 pb-4 space-y-1">
                        <div className="flex items-center justify-between">
                            <h2 className="text-4xl font-black text-on-surface tracking-tight">
                                {new Intl.NumberFormat('pt-BR').format(points)} <span className="text-primary text-xl">pts.</span>
                            </h2>
                            <button 
                                onClick={fetchTransactions}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1 active:scale-95 transition-transform"
                            >
                                Extrato <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </header>

                    {/* Tier Filters - McDonald's Horizontal Scroll */}
                    <nav className="flex overflow-x-auto px-6 py-4 gap-3 no-scrollbar scroll-smooth">
                        <button 
                            onClick={() => setActiveTier(null)}
                            className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-2
                                ${activeTier === null ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-on-surface-variant border-surface-container-highest'}
                            `}
                        >
                            Todos
                        </button>
                        {tiers.map(tier => (
                            <button 
                                key={tier}
                                onClick={() => setActiveTier(tier)}
                                className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-2
                                    ${activeTier === tier ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-on-surface-variant border-surface-container-highest'}
                                `}
                            >
                                Até {new Intl.NumberFormat('pt-BR').format(tier)} pts
                            </button>
                        ))}
                    </nav>

                    {/* Rewards Grid */}
                    <section className="px-6 pt-2">
                        {loading ? (
                             <div className="py-20 text-center opacity-30 animate-pulse font-black text-[10px] uppercase tracking-[0.3em]">Carregando catálogo...</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                                {filteredRewards.map(reward => {
                                    const canAfford = points >= reward.points_cost;
                                    return (
                                        <motion.div 
                                            layout
                                            key={reward.id} 
                                            onClick={() => canAfford && handleAskRedeem(reward)}
                                            className="flex flex-col items-center space-y-4 group cursor-pointer"
                                        >
                                            {/* Card Container */}
                                            <div className="relative w-full aspect-square bg-white rounded-[40px] shadow-sm border border-surface-container-highest flex items-center justify-center p-6 overflow-hidden transition-all group-active:scale-95 shadow-lg shadow-black/5">
                                                {/* Points Tag - Yellow Pill at Top */}
                                                <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full flex items-center justify-center gap-1 z-10 shadow-sm
                                                    ${canAfford ? 'bg-[#FFD700] text-black' : 'bg-surface-container-highest text-on-surface-variant/40'}
                                                `}>
                                                    {!canAfford && <span className="material-symbols-outlined text-[10px] font-black">lock</span>}
                                                    <span className="text-[10px] font-black uppercase tracking-tighter tabular-nums">
                                                        {new Intl.NumberFormat('pt-BR').format(reward.points_cost)} pts
                                                    </span>
                                                </div>

                                                {/* Halo & Image */}
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    {/* Decorative Halo inspired by McDonalds screenshot */}
                                                    <div className={`absolute w-[120%] h-[120%] rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110
                                                        ${canAfford ? 'bg-primary border-[1.5px] border-primary' : 'bg-on-surface-variant/20 border-on-surface-variant/20'}
                                                    `} style={{ clipPath: 'path("M 0 50 A 50 50 0 1 1 100 50")' }}></div>

                                                    <div className={`w-full h-full flex items-center justify-center transition-all duration-300 ${!canAfford ? 'grayscale opacity-30' : 'group-hover:scale-110'}`}>
                                                        {reward.image_url ? (
                                                            <img 
                                                                src={reward.image_url} 
                                                                alt={reward.name} 
                                                                className="w-full h-full object-contain drop-shadow-xl" 
                                                            />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-6xl text-primary/20">redeem</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Title Below Card */}
                                            <p className={`text-[11px] font-black text-center leading-tight uppercase tracking-widest px-2 transition-colors
                                                ${canAfford ? 'text-on-surface' : 'text-on-surface-variant/40'}
                                            `}>
                                                {reward.name}
                                            </p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>

                {/* Transactions Modal */}
                <AnimatePresence>
                    {showTransactions && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-on-background/80 backdrop-blur-md" 
                                onClick={() => setShowTransactions(false)}
                            />
                            <motion.div 
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                className="bg-surface w-full max-w-sm rounded-t-[50px] sm:rounded-[50px] p-8 shadow-2xl relative z-10 space-y-6"
                            >
                                <div className="text-center space-y-1">
                                    <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight uppercase">Extrato de Pontos</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sua evolução no Skema</p>
                                </div>

                                <div className="max-h-[40vh] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {loadingTransactions ? (
                                        <div className="py-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Sincronizando saldo...</div>
                                    ) : transactions.length > 0 ? (
                                        transactions.map((tx) => (
                                            <div key={tx.id} className="bg-white p-4 rounded-3xl border border-surface-container-highest flex items-center justify-between shadow-sm">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black text-on-surface uppercase tracking-tight leading-tight">{tx.description || (tx.type === 'earn' ? 'Crédito de Pontos' : 'Resgate de Prêmio')}</p>
                                                    <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase">
                                                        {new Date(tx.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <span className={`text-sm font-black tabular-nums ${['earn', 'credit'].includes(tx.type) ? 'text-primary' : 'text-error'}`}>
                                                    {['earn', 'credit'].includes(tx.type) ? '+' : '-'}{Math.abs(tx.amount)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-on-surface-variant/40 font-medium italic text-xs">Nenhuma transação encontrada.</div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setShowTransactions(false)}
                                    className="w-full h-16 bg-on-surface text-surface rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                                >
                                    VOLTAR
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Confirmation Modal - McDonald's Style */}
                <AnimatePresence>
                    {showConfirmModal && pendingReward && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-on-background/80 backdrop-blur-md" 
                                onClick={() => setShowConfirmModal(false)}
                            />
                            <motion.div 
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                className="bg-surface w-full max-w-sm rounded-t-[50px] sm:rounded-[50px] p-8 shadow-2xl relative z-10 space-y-6"
                            >
                                <div className="text-center space-y-3">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="material-symbols-outlined text-4xl text-primary">redeem</span>
                                    </div>
                                    <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight uppercase">Confirmar Resgate?</h3>
                                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-4">
                                        Você está prestes a trocar <span className="text-primary">{pendingReward.points_cost} pontos</span> por:
                                    </p>
                                    <p className="text-sm font-black text-on-surface uppercase tracking-widest bg-surface-container-highest/50 py-3 rounded-2xl">
                                        {pendingReward.name}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button 
                                        onClick={() => handleGenerateCoupon(pendingReward)}
                                        className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                    >
                                        RESGATAR AGORA
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirmModal(false)}
                                        className="w-full h-16 bg-surface-container-highest text-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* QR Modal - McDonald's Style Light Theme */}
                <AnimatePresence>
                    {showQR && selectedReward && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-6">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-on-background/80 backdrop-blur-md" 
                                onClick={() => setShowQR(false)}
                            ></motion.div>
                            
                            <motion.div 
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="bg-surface w-full max-w-sm rounded-t-[50px] sm:rounded-[50px] p-8 shadow-2xl relative z-10 text-center space-y-6"
                            >
                                <div className="space-y-2">
                                    <h3 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight">Cupom Gerado! 🏆</h3>
                                    <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em]">{selectedReward.name}</p>
                                </div>

                                <div className="bg-white p-6 rounded-[40px] inline-block shadow-inner mx-auto border border-surface-container-highest">
                                    <QRCodeSVG value={redemptionId || ''} size={200} />
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Válido por:</p>
                                        <p className="text-4xl font-black text-primary tabular-nums tracking-tighter">{formatTime(timeLeft)}</p>
                                    </div>
                                    
                                    <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20">
                                        <p className="text-[10px] font-bold text-primary leading-relaxed uppercase tracking-widest">
                                            Apresente este QR Code no caixa em até 10 minutos para retirar seu prêmio.
                                        </p>
                                    </div>

                                    <button 
                                        onClick={() => setShowQR(false)}
                                        className="w-full h-16 bg-on-surface text-surface rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                                    >
                                        ENTENDI
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 105, 113, 0.1); border-radius: 10px; }
            `}</style>
        </WavyBackground>
    );
}
