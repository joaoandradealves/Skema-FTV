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
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTeacher(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        // Lógica de Edição
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            email: email
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('Professor atualizado com sucesso!');
      } else {
        // Lógica de Criação
        const { error } = await supabase.auth.signUp({
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
      }

      // Reset form
      cancelEdit();
      fetchTeachers();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(teacher: any) {
    setEditingId(teacher.id);
    setFullName(teacher.full_name || '');
    setEmail(teacher.email || '');
    setPassword(''); // Não editamos senha por aqui por segurança
  }

  function cancelEdit() {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setPassword('');
  }

  async function handleDeleteTeacher(id: string) {
    if (!confirm('Tem certeza que deseja excluir este professor? Isso removerá o acesso dele imediatamente.')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Professor removido com sucesso!');
      fetchTeachers();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  }

  return (
    <div className="bg-surface min-h-screen pb-12">
      <TopAppBar title="GESTÃO DE PROFESSORES" showBackButton />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
          <h3 className="font-headline font-bold text-xl">
            {editingId ? 'Editar Professor' : 'Cadastrar Novo Professor'}
          </h3>
          <form onSubmit={handleSaveTeacher} className="space-y-4">
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
            {!editingId && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant ml-1">Senha Inicial</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary shadow-inner"
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                />
              </div>
            )}
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`h-14 font-headline font-bold rounded-xl active:scale-95 transition-transform shadow-lg disabled:opacity-50 ${editingId ? 'flex-1 bg-secondary text-white' : 'w-full bg-primary text-white'}`}
              >
                {isSubmitting ? 'SALVANDO...' : (editingId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PROFESSOR')}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="px-6 h-14 bg-surface-container text-on-surface-variant font-bold rounded-xl active:scale-95 transition-transform"
                >
                  CANCELAR
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h3 className="font-headline font-bold text-xl">Professores Cadastrados</h3>
          {loading ? (
            <p className="text-center italic opacity-50">Buscando...</p>
          ) : (
            <div className="grid gap-3">
              {teachers.map(teacher => (
                <div key={teacher.id} className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      {teacher.avatar_url ? (
                        <img src={teacher.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary">person</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface leading-tight">{teacher.full_name || 'Sem Nome'}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">{teacher.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => startEdit(teacher)}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-secondary hover:bg-secondary/10 transition-colors"
                      title="Editar Professor"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-error hover:bg-error/10 transition-colors"
                      title="Excluir Professor"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
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
