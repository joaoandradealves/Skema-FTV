import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  avatar_url: string;
  plan_status: string;
}

export default function ManageStudents() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Profile | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  async function handleUpdateStudent() {
    if (!editingStudent) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingStudent.full_name,
          email: editingStudent.email,
          phone: editingStudent.phone,
          plan_status: editingStudent.plan_status
        })
        .eq('id', editingStudent.id);

      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      setEditingStudent(null);
      showSuccess('Perfil atualizado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleDeleteStudent(id: string) {
    if (!confirm('Deseja realmente excluir este aluno? Isso removerá o perfil dele da base de dados.')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStudents(prev => prev.filter(s => s.id !== id));
      showSuccess('Aluno removido com sucesso!');
      setEditingStudent(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Status do Plano', 'Data de Cadastro'];
    const rows = students.map(s => [
      s.full_name,
      s.email,
      s.phone,
      s.plan_status,
      new Date(s.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alunos_skema_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-32">
      <TopAppBar title="GESTÃO DE ALUNOS" showBackButton />

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline font-extrabold text-3xl tracking-tight leading-none">Alunos Cadastrados</h1>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Visualize, edite e exporte os dados da base.</p>
          </div>
          <button 
            onClick={exportCSV}
            className="bg-secondary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-secondary/90 active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
        </div>

        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-bounce">
            {successMsg}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/40 group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 pl-12 pr-6 rounded-3xl bg-white border-2 border-primary-container/10 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all font-medium text-sm"
          />
        </div>

        {/* Students Table/Cards */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="py-20 text-center font-bold text-primary animate-pulse uppercase tracking-widest text-xs">Carregando base de alunos...</div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <div key={student.id} className="bg-white p-6 rounded-[32px] border border-primary-container/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container overflow-hidden shrink-0 border-4 border-white shadow-sm">
                    <img src={student.avatar_url || 'https://via.placeholder.com/150'} alt={student.full_name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-xl text-on-surface leading-tight">{student.full_name}</h3>
                    <p className="text-on-surface-variant text-xs font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">mail</span> {student.email}
                    </p>
                    <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">phone</span> {student.phone || 'Sem telefone'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Plano</p>
                    <p className={`text-xs font-bold ${student.plan_status === 'ativo' ? 'text-primary' : 'text-error'}`}>{student.plan_status?.toUpperCase() || 'NENHUM'}</p>
                  </div>
                  <button 
                    onClick={() => setEditingStudent(student)}
                    className="flex-1 md:flex-none w-12 h-12 bg-primary/5 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteStudent(student.id)}
                    className="flex-1 md:flex-none w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-on-surface-variant/50 font-medium italic opacity-50">Nenhum aluno encontrado para "{searchTerm}".</div>
          )}
        </div>

        {/* Edit Modal */}
        {editingStudent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-on-surface/20 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300 border-4 border-primary/10">
              <div className="flex justify-between items-center">
                <h2 className="font-headline font-black text-2xl tracking-tighter">Editar Perfil</h2>
                <button onClick={() => setEditingStudent(null)} className="material-symbols-outlined text-on-surface-variant">close</button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Nome Completo</label>
                  <input 
                    value={editingStudent.full_name} 
                    onChange={e => setEditingStudent({...editingStudent, full_name: e.target.value})}
                    className="w-full h-14 px-5 rounded-2xl bg-surface-container font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Email</label>
                  <input 
                    value={editingStudent.email} 
                    onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                    className="w-full h-14 px-5 rounded-2xl bg-surface-container font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Telefone</label>
                  <input 
                    value={editingStudent.phone} 
                    onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})}
                    className="w-full h-14 px-5 rounded-2xl bg-surface-container font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Status do Plano</label>
                  <select 
                    value={editingStudent.plan_status} 
                    onChange={e => setEditingStudent({...editingStudent, plan_status: e.target.value})}
                    className="w-full h-14 px-5 rounded-2xl bg-surface-container font-bold appearance-none"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="pendente">Pendente</option>
                    <option value="ativo">Ativo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleUpdateStudent}
                  className="flex-1 h-16 bg-primary text-white rounded-2xl font-headline font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                >
                  SALVAR
                </button>
                <button 
                  onClick={() => handleDeleteStudent(editingStudent.id)}
                  className="px-6 h-16 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
