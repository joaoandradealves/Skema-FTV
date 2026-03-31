import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import TopAppBar from '../components/TopAppBar';
import WavyBackground from '../components/WavyBackground';
import { useNavigate } from 'react-router-dom';

interface Reward {
    id: string;
    name: string;
    points_cost: number;
    description: string;
    image_url: string;
}

export default function MyLoyalty() {
    const navigate = useNavigate();
    const [points, setPoints] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [redemptionId, setRedemptionId] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

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
                    alert('Resgate realizado com sucesso! Aproveite seu prêmio! 🎁');
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

            // Points
            const { data: pointsData } = await supabase
                .from('loyalty_points')
                .select('balance')
                .eq('user_id', user.id)
                .single();
            setPoints(pointsData?.balance || 0);

            // Rewards
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

    return (
        <WavyBackground topHeight="25%" bgColor="bg-[#1A1A1A]" dividerColor="fill-[#1A1A1A]">
            <div className="bg-[#1A1A1A] text-white min-h-screen pb-32 font-body selection:bg-[#D4AF37]/30">
                <TopAppBar title="MEU SKEMA POINTS" showBackButton />

                <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
                    {/* Points Card */}
                    <section className="bg-gradient-to-br from-[#D4AF37] to-[#AA8B2E] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-12">
                            <span className="material-symbols-outlined text-[150px] text-black">workspace_premium</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/60 mb-2">Seu Saldo Atual</p>
                        <div className="flex items-baseline gap-2">
                           <h2 className="text-6xl font-black text-black leading-none">{points}</h2>
                           <span className="text-black font-bold uppercase text-xs tracking-widest">Pontos</span>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="font-headline text-2xl font-black tracking-tight text-[#D4AF37] uppercase ml-2">Prêmios Disponíveis</h3>
                        
                        {loading ? (
                             <div className="py-10 text-center opacity-30 animate-pulse font-black text-xs uppercase tracking-widest">Carregando catálogo...</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {rewards.map(reward => {
                                    const canAfford = points >= reward.points_cost;
                                    return (
                                        <div 
                                            key={reward.id} 
                                            className={`p-6 rounded-[32px] border-2 flex items-center justify-between transition-all active:scale-95
                                                ${canAfford 
                                                    ? 'bg-white/5 border-[#D4AF37]/20 hover:border-[#D4AF37]/50' 
                                                    : 'bg-white/5 border-transparent opacity-40 grayscale-0'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 ${canAfford ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/10 text-white/30'} rounded-2xl flex items-center justify-center`}>
                                                    <span className="material-symbols-outlined text-3xl font-bold">redeem</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-headline font-black text-xl leading-tight">{reward.name}</h4>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${canAfford ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                                                        {reward.points_cost} PONTOS
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={!canAfford}
                                                onClick={() => handleGenerateCoupon(reward)}
                                                className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all
                                                    ${canAfford 
                                                        ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 active:bg-[#B8962D]' 
                                                        : 'bg-white/10 text-white/30'
                                                    }
                                                `}
                                            >
                                                RESGATAR
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>

                {/* QR Modal */}
                {showQR && selectedReward && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowQR(false)}></div>
                        <div className="bg-[#1A1A1A] border-2 border-[#D4AF37]/50 w-full max-w-sm rounded-[40px] p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-in zoom-in-95 duration-200 relative z-10 text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="font-headline font-black text-2xl text-[#D4AF37] uppercase">Resgate Liberado!</h3>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Prêmio: {selectedReward.name}</p>
                            </div>

                            <div className="bg-white p-4 rounded-3xl inline-block shadow-inner mx-auto">
                                <QRCodeSVG value={redemptionId || ''} size={200} />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Válido por:</p>
                                    <p className="text-3xl font-black text-[#D4AF37] tabular-nums">{formatTime(timeLeft)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                                        ⏱️ Apresente este QR Code no caixa em até 10 minutos para retirar seu prêmio.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowQR(false)}
                                    className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    FECHAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </WavyBackground>
    );
}
