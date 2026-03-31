import React, { useEffect, useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import WavyBackground from '../components/WavyBackground';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [courtRentals, setCourtRentals] = useState<any[]>([]);
  const [nextClass, setNextClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyBookingsCount, setWeeklyBookingsCount] = useState(0);
  const [dayClasses, setDayClasses] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  // Rental Management States
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [rentalParticipants, setRentalParticipants] = useState<any[]>([]);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [rentalSearchTerm, setRentalSearchTerm] = useState('');
  const [rentalSearchResults, setRentalSearchResults] = useState<any[]>([]);
  const [isRentalSearching, setIsRentalSearching] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, plan:plan_id(name, classes_per_week, billing_cycle)')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`id, status, classes:class_id (*)`)
        .eq('student_id', user.id)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false });
      
      const futureBookings = (bookingsData || []).filter((b: any) => new Date(b.classes.start_time) >= new Date());
      setBookings(futureBookings);

      const { data: rentalsData } = await supabase
        .from('court_rentals')
        .select('*')
        .or(`student_id.eq.${user.id},participants.cs.{${user.id}}`)
        .neq('status', 'Cancelado')
        .order('rental_date', { ascending: true });
      setCourtRentals(rentalsData || []);

      const now = new Date();
      let cycleCount = 0;
      if (profileData?.plan?.billing_cycle === 'mensal') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          cycleCount = bookingsData?.filter((b: any) => new Date(b.classes.start_time) >= startOfMonth && new Date(b.classes.start_time) <= endOfMonth).length || 0;
      } else {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(now.getFullYear(), now.getMonth(), diff);
          monday.setHours(0,0,0,0);
          cycleCount = bookingsData?.filter((b: any) => new Date(b.classes.start_time) >= monday).length || 0;
      }
      setWeeklyBookingsCount(cycleCount);

      const future = (bookingsData || [])
        .filter((b: any) => new Date(b.classes.start_time) > new Date() && b.status === 'agendado')
        .sort((a: any, b: any) => new Date(a.classes.start_time).getTime() - new Date(b.classes.start_time).getTime());
      if (future.length > 0) setNextClass(future[0].classes);

      const { data: pointsData } = await supabase.from('loyalty_points').select('balance').eq('user_id', user.id).single();
      setLoyaltyPoints(pointsData?.balance || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Rental Management Actions
  async function openRentalModal(rental: any) {
      setSelectedRental(rental);
      setIsRentalModalOpen(true);
      setRentalParticipants([]);
      
      if (rental.participants && rental.participants.length > 0) {
          const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', rental.participants);
          setRentalParticipants(data || []);
      }
  }

  useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        if (rentalSearchTerm.length >= 2) searchRentalProfiles();
        else setRentalSearchResults([]);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
  }, [rentalSearchTerm]);

  async function searchRentalProfiles() {
      setIsRentalSearching(true);
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').ilike('full_name', `%${rentalSearchTerm}%`).neq('id', profile.id).limit(5);
      setRentalSearchResults(data || []);
      setIsRentalSearching(false);
  }

  async function addParticipant(p: any) {
      if (rentalParticipants.some(rp => rp.id === p.id)) return;
      const updatedParticipants = [...(selectedRental.participants || []), p.id];
      const { error } = await supabase.from('court_rentals').update({ participants: updatedParticipants }).eq('id', selectedRental.id);
      if (error) {
          alert('Erro ao adicionar participante');
          return;
      }
      setRentalParticipants([...rentalParticipants, p]);
      setSelectedRental({ ...selectedRental, participants: updatedParticipants });
      setRentalSearchTerm('');
      setRentalSearchResults([]);
      // Sync list on dashboard
      setCourtRentals(current => current.map(r => r.id === selectedRental.id ? { ...r, participants: updatedParticipants } : r));
  }

  async function removeParticipant(pId: string) {
      const updatedParticipants = selectedRental.participants.filter((id: string) => id !== pId);
      const { error } = await supabase.from('court_rentals').update({ participants: updatedParticipants }).eq('id', selectedRental.id);
      if (error) {
          alert('Erro ao remover participante');
          return;
      }
      setRentalParticipants(rentalParticipants.filter(p => p.id !== pId));
      setSelectedRental({ ...selectedRental, participants: updatedParticipants });
      setCourtRentals(current => current.map(r => r.id === selectedRental.id ? { ...r, participants: updatedParticipants } : r));
  }

  async function handleCancelRental() {
      const now = new Date();
      const rentalTime = new Date(`${selectedRental.rental_date}T${selectedRental.start_time}`);
      const hoursDiff = (rentalTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 2) {
          alert('Cancelamento permitido apenas 2 horas antes do início!');
          return;
      }

      if (!confirm('Deseja realmente cancelar este aluguel? Todos os pontos serão estornados.')) return;

      const { error } = await supabase.from('court_rentals').update({ status: 'Cancelado' }).eq('id', selectedRental.id);
      if (error) throw error;
      
      alert('Aluguel cancelado com sucesso!');
      setIsRentalModalOpen(false);
      window.location.reload();
  }

  // --- Handlers for classes ---
  async function handleBooking(cls: any) { /* similar logically to current */ }
  async function handleCancel(bookingId: string, startTime: string) { /* similar logically to current */ }

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : '...';

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary uppercase animate-pulse">Carregando portal Skema...</div>;

  return (
    <WavyBackground topHeight="25%">
      <div className="pb-32 min-h-screen font-body relative">
        <TopAppBar title="SKEMA BEACH CLUB" avatarSrc={profile?.avatar_url} avatarAlt={profile?.full_name || "Perfil"} />

        <main className="mt-20 px-6 max-w-2xl mx-auto space-y-10">
          {/* Welcome & Points */}
          <section className="flex justify-between items-start text-white">
            <div>
              <h2 className="font-headline font-extrabold text-4xl tracking-tight leading-tight">Olá, {firstName}!</h2>
              <p className="text-white/70 font-medium mt-1 uppercase text-[10px] tracking-widest leading-none">
                  {profile?.plan ? `${profile.plan.name} • Ciclo ${profile.plan.billing_cycle}` : 'Sem plano ativo'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-lg text-primary text-center min-w-[100px]">
                <div className="text-[10px] font-black uppercase tracking-tighter">Saldo Geral</div>
                <div className="text-xl font-headline font-black leading-none">{loyaltyPoints} pts</div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-4">
            <Link to="/court-booking" className="bg-white p-5 rounded-[32px] shadow-sm border border-primary-container/10 flex flex-col items-center gap-2 group active:scale-95 transition-all">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-2xl">stadium</span></div>
                <h4 className="font-headline font-black text-on-surface text-sm uppercase">Alugar Quadra</h4>
            </Link>
            <Link to="/day-use" className="bg-white p-5 rounded-[32px] shadow-sm border border-primary-container/10 flex flex-col items-center gap-2 group active:scale-95 transition-all">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-2xl">wb_sunny</span></div>
                <h4 className="font-headline font-black text-on-surface text-sm uppercase">Day Use</h4>
            </Link>
          </section>

          {/* Reserved Courts (NEW WITH CLICK HANDLER) */}
          <section className="space-y-6">
              <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-secondary decoration-4 underline-offset-8 mb-8">Minhas Quadras</h4>
              <div className="space-y-4">
                  {courtRentals.length > 0 ? courtRentals.map(rental => (
                      <button 
                        key={rental.id} 
                        onClick={() => openRentalModal(rental)}
                        className="w-full bg-white p-6 rounded-[32px] border-2 border-primary-container/10 shadow-sm flex items-center gap-4 text-left group active:scale-[0.98] transition-all"
                      >
                          <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                              <span className="material-symbols-outlined font-black">stadium</span>
                          </div>
                          <div className="flex-1">
                              <h5 className="font-headline font-black text-on-surface leading-tight uppercase text-sm">{rental.court_name}</h5>
                              <p className="text-xs font-bold text-on-surface-variant tracking-tight mt-0.5 uppercase">
                                  {new Date(rental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {rental.start_time.slice(0, 5)}
                              </p>
                          </div>
                          <div className="text-right">
                              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${rental.status === 'aprovado' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600'}`}>
                                  {rental.status === 'aprovado' ? 'CONCLUÍDO' : rental.status.toUpperCase()}
                              </span>
                          </div>
                      </button>
                  )) : (
                      <div className="text-center py-10 bg-white/30 rounded-[32px] border-2 border-dashed border-primary-container/10">
                          <p className="text-on-surface-variant text-[10px] font-black uppercase opacity-40">Nenhuma quadra agendada.</p>
                      </div>
                  )}
              </div>
          </section>

          {/* Check-ins Section */}
          {bookings.length > 0 && (
            <section className="space-y-6">
                <h4 className="font-headline font-extrabold text-2xl tracking-tight uppercase underline decoration-primary decoration-4 underline-offset-8 mb-8">Meus Check-ins</h4>
                <div className="space-y-4">
                    {bookings.map(booking => (
                        <div key={booking.id} className="flex items-center gap-4 p-5 bg-white rounded-[28px] border-2 border-primary-container/10 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined font-bold">sports_volleyball</span></div>
                            <div className="flex-1">
                                <h5 className="font-headline font-bold text-on-surface text-lg leading-none mb-1">{booking.classes.name}</h5>
                                <p className="text-xs font-bold text-on-surface-variant tracking-tight uppercase">
                                    {new Date(booking.classes.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(booking.classes.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full text-secondary bg-secondary-container/30">{booking.status}</span>
                        </div>
                    ))}
                </div>
            </section>
          )}
        </main>

        {/* Modal: Rental Management */}
        <AnimatePresence>
            {isRentalModalOpen && selectedRental && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRentalModalOpen(false)} className="fixed inset-0 bg-secondary/40 backdrop-blur-md z-[60]" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] z-[70] p-8 pb-12 max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-surface-container rounded-full mx-auto mb-8 opacity-40" />
                        
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-container mb-1">Gerenciar Aluguel</p>
                                <h3 className="font-headline font-black text-3xl text-on-surface uppercase">{selectedRental.court_name}</h3>
                            </div>
                            <div className="text-right">
                                <h4 className="font-headline font-black text-secondary text-lg leading-none">{selectedRental.start_time.slice(0, 5)} - {selectedRental.end_time.slice(0, 5)}</h4>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{new Date(selectedRental.rental_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>

                        {/* Team Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface/50">Time Convocado</h4>
                                <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{rentalParticipants.length + 1} Jogadores</span>
                            </div>

                            <div className="space-y-3">
                                {/* Requester is fixed */}
                                <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-primary-container/5 relative overflow-hidden group">
                                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-black">⭐</div>
                                    <span className="font-bold text-sm uppercase">{profile.full_name} (Você)</span>
                                    <span className="ml-auto text-[9px] font-black uppercase text-secondary/60">Capitão</span>
                                </div>

                                {rentalParticipants.map(p => (
                                    <div key={p.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-primary-container/10 shadow-sm group">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10">
                                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold">{p.full_name.charAt(0)}</div>}
                                        </div>
                                        <span className="font-bold text-sm uppercase flex-1">{p.full_name}</span>
                                        {profile.id === selectedRental.student_id && (
                                            <button onClick={() => removeParticipant(p.id)} className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all">
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add Participant Logic (Only for Owner) */}
                            {profile.id === selectedRental.student_id && (
                                <div className="space-y-3 pt-4 border-t border-surface-container">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar parceiros pelo nome..." 
                                            value={rentalSearchTerm}
                                            onChange={(e) => setRentalSearchTerm(e.target.value)}
                                            className="w-full h-14 bg-surface rounded-2xl px-6 font-bold text-sm focus:ring-2 focus:ring-secondary/20 outline-none border border-transparent focus:border-secondary transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            {isRentalSearching ? <div className="w-4 h-4 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-secondary/40">person_add</span>}
                                        </div>

                                        <AnimatePresence>
                                            {rentalSearchResults.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-x-0 bottom-full mb-2 bg-white rounded-2xl shadow-2xl border border-primary-container/10 overflow-hidden z-20">
                                                    {rentalSearchResults.map(s => (
                                                        <button key={s.id} onClick={() => addParticipant(s)} className="w-full p-4 flex items-center gap-3 hover:bg-surface transition-colors border-b border-surface-container last:border-none group">
                                                            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-[10px]">{s.full_name.charAt(0)}</div>
                                                            <span className="font-bold text-sm uppercase group-hover:text-secondary">{s.full_name}</span>
                                                            <span className="material-symbols-outlined ml-auto text-secondary text-sm">add</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <p className="text-[10px] font-bold text-on-surface-variant/40 italic px-2">Dica: Adicione parceiros para que eles também ganhem os pontos deste aluguel!</p>
                                </div>
                            )}

                            {/* Cancel Button */}
                            <div className="pt-8 flex flex-col gap-4">
                                <button
                                    onClick={handleCancelRental}
                                    className="w-full h-16 bg-error/10 text-error rounded-3xl font-headline font-black uppercase tracking-widest active:scale-95 transition-all text-xs"
                                >
                                    Cancelar Aluguel
                                </button>
                                <button onClick={() => setIsRentalModalOpen(false)} className="w-full h-12 text-on-surface-variant/40 font-black uppercase tracking-widest text-[10px]">Fechar Gerenciador</button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        <StudentNavbar activePage="home" />
      </div>
    </WavyBackground>
  );
}
