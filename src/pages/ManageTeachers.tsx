import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'teacher'
          }
        }
      });

      if (error) throw error;
      
      alert('Professor cadastrado! Ele deve confirmar o e-mail para ativar a conta.');
      setEmail('');
      setPassword('');
      setFullName('');
      fetchTeachers();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen pb-12">
      <TopAppBar title="GESTÃO DE PROFESSORES" showBackButton />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
          <h3 className="font-headline font-bold text-xl">Cadastrar Novo Professor</h3>
          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant ml-1">Nome Completo</label>
              <input 
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary shadow-inner"
                type="text" value={fullName} onChange={e => setFullName(e.target.value)} required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant ml-1">E-mail</label>
              <input 
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary shadow-inner"
                type="email" value={email} onChange={e => setEmail(e.target.value)} required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant ml-1">Senha Inicial</label>
              <input 
                className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary shadow-inner"
                type="password" value={password} onChange={e => setPassword(e.target.value)} required 
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-14 bg-primary text-white font-headline font-bold rounded-xl active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'CADASTRANDO...' : 'CADASTRAR PROFESSOR'}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <h3 className="font-headline font-bold text-xl">Professores Cadastrados</h3>
          {loading ? (
            <p className="text-center italic opacity-50">Buscando...</p>
          ) : (
            <div className="grid gap-3">
              {teachers.map(teacher => (
                <div key={teacher.id} className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                    {teacher.avatar_url ? (
                      <img src={teacher.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-primary">person</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface leading-tight">{teacher.full_name || 'Sem Nome'}</p>
                    <p className="text-xs text-on-surface-variant">{teacher.username || 'Sem Usuário'}</p>
                  </div>
                </div>
              ))}
              {teachers.length === 0 && <p className="text-center py-8 text-on-surface-variant italic">Nenhum professor encontrado.</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
