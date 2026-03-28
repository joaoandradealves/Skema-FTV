import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';

export default function CourtBooking() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<number[]>([]);

  // Horários de funcionamento: 08:00 às 22:00
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  useEffect(() => {
    fetchOccupiedSlots();
  }, [selectedDate]);

  async function fetchOccupiedSlots() {
    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];

      // 1. Buscar aulas (classes) do dia
      const { data: classes } = await supabase
        .from('classes')
        .select('start_time')
        .filter('start_time', 'gte', `${dateString}T00:00:00`)
        .filter('start_time', 'lte', `${dateString}T23:59:59`);

      // 2. Buscar aluguéis de quadra aprovados
      const { data: rentals } = await supabase
        .from('court_rentals')
        .select('start_time, end_time')
        .eq('rental_date', dateString)
        .eq('status', 'aprovado');

      const occupied: number[] = [];
      
      classes?.forEach(c => {
        const hour = new Date(c.start_time).getHours();
        occupied.push(hour);
      });

      rentals?.forEach(r => {
        const start = parseInt(r.start_time.split(':')[0]);
        const end = parseInt(r.end_time.split(':')[0]);
        for (let i = start; i < end; i++) {
          occupied.push(i);
        }
      });

      setOccupiedSlots(Array.from(new Set(occupied)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSlot = (hour: number) => {
    if (occupiedSlots.includes(hour)) return;
    if (selectedSlots.includes(hour)) {
      setSelectedSlots(prev => prev.filter(s => s !== hour));
    } else {
      setSelectedSlots(prev => [...prev, hour].sort((a,b) => a - b));
    }
  };

  async function handleConfirm() {
    if (selectedSlots.length === 0) return;
    
    // Validar se os horários são sequenciais (opcional, mas recomendado)
    const isSequential = selectedSlots.every((val, i, arr) => 
        i === 0 || val === arr[i-1] + 1
    );

    if (!isSequential) {
        if (!confirm('Os horários selecionados não são sequenciais. Deseja continuar?')) return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login primeiro');

      const dateString = selectedDate.toISOString().split('T')[0];
      
      // Agrupar slots em blocos contínuos ou criar um por um
      // Para simplificar, vamos criar uma reserva para o bloco total
      const startHour = Math.min(...selectedSlots);
      const endHour = Math.max(...selectedSlots) + 1;

      const { error } = await supabase.from('court_rentals').insert({
        student_id: user.id,
        court_name: 'QUADRA 1',
        rental_date: dateString,
        start_time: `${String(startHour).padStart(2, '0')}:00:00`,
        end_time: `${String(endHour).padStart(2, '0')}:00:00`,
        total_price: selectedSlots.length * 60,
        status: 'pendente'
      });

      if (error) throw error;
      alert('Solicitação de aluguel enviada! Aguarde a aprovação do Admin.');
      navigate('/student');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="bg-surface text-on-surface min-h-screen pb-32 font-body selection:bg-primary/30 relative overflow-hidden">
        <TopAppBar title="ALUGUEL DE QUADRA" showBackButton />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8 relative z-10">
          {/* Header Section */}
          <section className="space-y-1">
            <div className="flex items-center gap-2 text-secondary font-bold text-[10px] uppercase tracking-[0.2em]">
              <span className="material-symbols-outlined text-sm">stadium</span>
              RESIDENCIAL SKEMA
            </div>
            <h2 className="font-headline text-4xl font-black tracking-tighter text-on-surface">Agende sua <span className="text-secondary">Quadra</span></h2>
            <p className="text-on-surface-variant text-sm font-medium">Valor: R$ 60,00 por hora</p>
          </section>

          {/* Date Picker */}
          <section className="bg-white p-4 rounded-3xl shadow-sm border border-primary-container/10">
            <input 
                type="date" 
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => {
                    setSelectedDate(new Date(e.target.value));
                    setSelectedSlots([]);
                }}
                className="w-full bg-transparent border-none font-bold text-center text-secondary focus:ring-0"
            />
          </section>

          {/* Time Slots Grid */}
          <section className="grid grid-cols-3 gap-3">
            {hours.map(hour => {
              const isOccupied = occupiedSlots.includes(hour);
              const isSelected = selectedSlots.includes(hour);
              
              return (
                <button
                  key={hour}
                  disabled={isOccupied}
                  onClick={() => toggleSlot(hour)}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all 
                    ${isOccupied 
                      ? 'bg-surface-container opacity-30 border-transparent cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-secondary border-secondary text-white shadow-lg' 
                        : 'bg-white border-primary-container/20 text-on-surface-variant hover:border-secondary/30'
                    }
                  `}
                >
                  <span className="text-sm font-headline font-black">{hour}:00</span>
                  <span className="text-[10px] font-bold uppercase opacity-60">{isOccupied ? 'Ocupado' : isSelected ? 'Selecionado' : 'Livre'}</span>
                </button>
              );
            })}
          </section>

          {/* Footer Summary */}
          {selectedSlots.length > 0 && (
            <div className="fixed bottom-24 left-6 right-6 z-50 animate-[slideUp_0.3s_ease]">
              <div className="bg-white p-6 rounded-[32px] shadow-2xl border-2 border-secondary/20 flex flex-col gap-4">
                <div className="flex justify-between items-center px-2">
                   <div>
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Total de Horas: {selectedSlots.length}</p>
                      <p className="text-2xl font-black text-secondary">R$ {selectedSlots.length * 60},00</p>
                   </div>
                   <button 
                     disabled={submitting}
                     onClick={handleConfirm}
                     className="bg-secondary text-white h-14 px-8 rounded-2xl font-headline font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
                   >
                     {submitting ? 'PROCESSANDO...' : 'SOLICITAR RESERVA'}
                     <span className="material-symbols-outlined">arrow_forward</span>
                   </button>
                </div>
              </div>
            </div>
          )}

        </main>

        <StudentNavbar activePage="home" />

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </WavyBackground>
  );
}
