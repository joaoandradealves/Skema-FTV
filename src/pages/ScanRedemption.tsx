import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';
import WavyBackground from '../components/WavyBackground';

interface Redemption {
    id: string;
    status: string;
    expires_at: string;
    points_cost: number;
    profiles: {
        full_name: string;
        email: string;
    };
    loyalty_rewards: {
        name: string;
    };
}

export default function ScanRedemption() {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [redemption, setRedemption] = useState<Redemption | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        // Initialize Scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        
        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;

        fetchHistory();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
            }
        };
    }, []);

    async function fetchHistory() {
        const { data } = await supabase
            .from('loyalty_redemptions')
            .select(`
                id,
                status,
                redeemed_at,
                points_cost,
                profiles (full_name),
                loyalty_rewards (name)
            `)
            .eq('status', 'redeemed')
            .order('redeemed_at', { ascending: false })
            .limit(10);
        setHistory(data || []);
    }

    async function onScanSuccess(decodedText: string) {
        if (decodedText && !scanResult) {
            setScanResult(decodedText);
            fetchRedemptionDetails(decodedText);
            
            // Stop scanning to process
            if (scannerRef.current) {
                // We keep it rendered but we lock the result
            }
        }
    }

    function onScanFailure(error: any) {
        // Silently ignore
    }

    async function fetchRedemptionDetails(id: string) {
        try {
            setLoading(true);
            setError(null);
            
            const { data, error: fetchError } = await supabase
                .from('loyalty_redemptions')
                .select(`
                    *,
                    profiles:student_id (full_name, email),
                    loyalty_rewards:reward_id (name)
                `)
                .eq('id', id)
                .single();

            if (fetchError) throw new Error('Cumpom não encontrado ou inválido.');
            
            const now = new Date();
            const expiresAt = new Date(data.expires_at);

            if (data.status === 'redeemed') throw new Error('Este cupom já foi utilizado.');
            if (data.status === 'expired' || now > expiresAt) throw new Error('Este cupom expirou.');

            setRedemption(data);
        } catch (err: any) {
            setError(err.message);
            setScanResult(null);
        } finally {
            setLoading(false);
        }
    }

    async function confirmRedemption() {
        if (!redemption) return;
        
        try {
            setProcessing(true);
            
            // 1. Transactional Update: Mark as redeemed
            const { error: updateError } = await supabase
                .from('loyalty_redemptions')
                .update({ 
                    status: 'redeemed',
                    redeemed_at: new Date().toISOString()
                })
                .eq('id', redemption.id);

            if (updateError) throw updateError;

            // 2. Insert Debit Transaction
            const { error: transError } = await supabase
                .from('loyalty_transactions')
                .insert({
                    user_id: redemption.student_id,
                    amount: -redemption.points_cost,
                    type: 'resgate',
                    description: `Resgate (QR): ${redemption.loyalty_rewards.name}`
                });

            if (transError) throw transError;

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setRedemption(null);
                setScanResult(null);
                fetchHistory();
            }, 3000);

        } catch (err: any) {
            alert('Erro ao processar resgate: ' + err.message);
        } finally {
            setProcessing(false);
        }
    }

    const resetScanner = () => {
        setScanResult(null);
        setRedemption(null);
        setError(null);
    };

    return (
        <WavyBackground topHeight="25%">
            <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
                <TopAppBar title="CAIXA - SCANNER DE RESGATE" showBackButton />

                <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
                    <section className="space-y-1">
                        <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Validar <span className="text-secondary">Resgate</span></h2>
                        <p className="text-on-surface-variant text-sm font-medium">Escanear QR Code do aluno para autorizar.</p>
                    </section>

                    {/* Scanner Display */}
                    {!redemption && !error && (
                        <div className="bg-white p-6 rounded-[40px] shadow-2xl border-2 border-primary-container/10">
                            <div id="reader" className="overflow-hidden rounded-3xl"></div>
                            <p className="mt-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                                Centralize o QR Code na câmera
                            </p>
                        </div>
                    )}

                    {/* Validation State */}
                    {loading && (
                        <div className="py-20 text-center animate-pulse">
                            <div className="w-16 h-16 bg-secondary/20 rounded-full mx-auto flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-secondary animate-spin">sync</span>
                            </div>
                            <p className="mt-4 font-black uppercase text-xs tracking-widest text-secondary">Validando cupom...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-error/10 border-2 border-error/20 p-8 rounded-[40px] text-center space-y-4 animate-in zoom-in-95 duration-200">
                             <span className="material-symbols-outlined text-6xl text-error">error</span>
                             <p className="font-headline font-black text-xl text-error uppercase leading-tight">{error}</p>
                             <button 
                                onClick={resetScanner}
                                className="w-full bg-error text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg"
                             >
                                TENTAR NOVAMENTE
                             </button>
                        </div>
                    )}

                    {/* Success State */}
                    {success && (
                        <div className="bg-primary/10 border-2 border-primary/20 p-8 rounded-[40px] text-center space-y-4 animate-in zoom-in-95 duration-200">
                             <span className="material-symbols-outlined text-6xl text-primary">check_circle</span>
                             <h4 className="font-headline font-black text-2xl text-primary uppercase leading-tight">RESGATE ACEITO!</h4>
                             <p className="text-xs font-bold text-primary/60 uppercase">O saldo de pontos já foi atualizado.</p>
                        </div>
                    )}

                    {/* Redemption Info (When Scan Success) */}
                    {redemption && !processing && !success && (
                        <div className="bg-secondary text-white p-8 rounded-[40px] shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300">
                             <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">Cupom Válido</span>
                                    <p className="text-2xl font-black leading-none">{redemption.points_cost} <span className="text-xs opacity-60">PONTOS</span></p>
                                </div>
                                <div>
                                    <h3 className="font-headline font-black text-3xl leading-tight mb-1">{redemption.loyalty_rewards.name}</h3>
                                    <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Para: {redemption.profiles.full_name}</p>
                                </div>
                             </div>

                             <div className="pt-4 flex gap-4">
                                <button 
                                    onClick={confirmRedemption}
                                    className="flex-1 bg-white text-secondary py-5 rounded-2xl font-headline font-black text-lg shadow-xl active:scale-95 transition-all"
                                >
                                    AUTORIZAR ENTREGA
                                </button>
                                <button 
                                    onClick={resetScanner}
                                    className="px-6 bg-secondary-container text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                                >
                                    VOLTAR
                                </button>
                             </div>
                        </div>
                    )}

                    {/* History Section */}
                    {history.length > 0 && (
                        <section className="space-y-4">
                            <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight ml-2">Últimos Resgates</h3>
                            <div className="space-y-3">
                                {history.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-3xl border border-primary-container/10 flex items-center justify-between opacity-80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-on-surface">{item.loyalty_rewards.name}</p>
                                                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase">{item.profiles.full_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-on-surface">-{item.points_cost}</p>
                                            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase">Resgatado</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </WavyBackground>
    );
}
