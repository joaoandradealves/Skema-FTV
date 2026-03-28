import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import TeacherNavbar from '../components/TeacherNavbar';
import { supabase } from '../lib/supabase';

export default function CreateClass() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [name, setName] = useState('Futevôlei');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [court, setCourt] = useState('Quadra 1');

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    }
    getProfile();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(startDateTime.getTime() + 90 * 60000); // +90 min default

      const { error } = await supabase.from('classes').insert({
        teacher_id: user.id,
        name,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        capacity,
        court
      });

      if (error) throw error;
      alert('Aula criada com sucesso!');
      navigate('/teacher');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32">
      <TopAppBar 
        title="SKEMA BEACH CLUB" 
        avatarSrc={profile?.avatar_url || undefined}
        showBackButton
      />

      <main className="relative min-h-screen pt-24 pb-8 px-6 max-w-2xl mx-auto">
        <div className="mb-12">
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight leading-none mb-2">Criar Nova Aula</h2>
          <p className="text-on-surface-variant font-medium text-sm">PORTAL DO PROFESSOR</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-8 relative z-10">
          <section className="space-y-4">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Nome/Nível da Aula</label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-primary transition-all font-bold"
                  placeholder="Ex: Futevôlei Iniciante" required
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Data</label>
                   <input 
                    type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full h-14 px-4 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-primary transition-all font-bold"
                    required
                   />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Hora</label>
                  <input 
                    type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full h-14 px-4 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-primary transition-all font-bold"
                    required
                  />
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Quadra</label>
                <select 
                  value={court} onChange={e => setCourt(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-primary transition-all font-bold"
                >
                  <option value="Quadra 1">Quadra 1</option>
                  <option value="Quadra 2">Quadra 2</option>
                  <option value="Quadra 3">Quadra 3 (Central)</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">Vagas (Capacidade)</label>
                <input 
                  type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))}
                  className="w-full h-14 px-6 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-primary transition-all font-bold"
                  min="1" max="20" required
                />
             </div>
          </section>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-secondary py-5 rounded-2xl text-white font-headline font-extrabold uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'CRIANDO...' : 'CRIAR E PUBLICAR AULA'}
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </main>
      <TeacherNavbar activePage="agenda" />
    </div>
  );
}
