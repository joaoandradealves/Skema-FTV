import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';

export default function ClassManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    fetchClassData();
    fetchAllStudents();
  }, [id]);

  async function fetchClassData() {
    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (classError) throw classError;
      setClassInfo(classData);
      
      // Converte UTC do banco para ISO Local para o input datetime-local
      const dbDate = new Date(classData.start_time);
      const localISO = new Date(dbDate.getTime() - dbDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      setEditFormData({
          name: classData.name,
          start_time: localISO,
          court: classData.court,
          capacity: classData.capacity
      });

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          profiles:student_id (full_name, avatar_url)
        `)
        .eq('class_id', id);

      if (bookingError) throw bookingError;
      setStudents(bookingData || []);
    } catch (error: any) {
      alert(error.message);
      navigate('/teacher');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllStudents() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'student');
    setAllStudents(data || []);
  }

  async function handleUpdateClass(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
          .from('classes')
          .update({
              name: editFormData.name,
              start_time: new Date(editFormData.start_time).toISOString(),
              court: editFormData.court,
              capacity: parseInt(editFormData.capacity)
          })
          .eq('id', id);

      if (error) throw error;
      await fetchClassData();
      setShowEditClass(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addStudent(studentId: string) {
    try {
      const { error } = await supabase.from('bookings').insert({
        class_id: id,
        student_id: studentId,
        status: 'agendado'
      });
      if (error) throw error;
      fetchClassData();
      setShowAddStudent(false);
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function removeStudent(bookingId: string) {
    if (!confirm('Tem certeza que deseja remover este aluno?')) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      fetchClassData();
    } catch (error: any) {
      alert(error.message);
    }
  }

  if (loading && !classInfo) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary animate-pulse uppercase tracking-widest">Carregando aula...</div>;

  return (
    <div className="bg-surface min-h-screen pb-32">
      <TopAppBar title="GESTÃO DA TURMA" showBackButton />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <header className="bg-white p-8 rounded-[40px] shadow-sm border border-primary-container/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-black text-on-surface leading-tight">{classInfo.name}</h2>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                <span className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span> 
                    {new Date(classInfo.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                <span className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span> 
                    {classInfo.court}
                </span>
              </div>
            </div>
            <button 
                onClick={() => setShowEditClass(true)}
                className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center hover:bg-secondary hover:text-white transition-all active:scale-95"
            >
                <span className="material-symbols-outlined">edit</span>
            </button>
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
                <h3 className="font-headline font-black text-xl">Inscritos</h3>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{students.length} de {classInfo.capacity} vagas</p>
            </div>
            <button 
              onClick={() => setShowAddStudent(true)}
              className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all hover:brightness-110"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>

          <div className="grid gap-3">
            {students.map(booking => (
              <div key={booking.id} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-outline-variant/10 group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center overflow-hidden shadow-inner">
                      {booking.profiles.avatar_url ? (
                        <img src={booking.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined opacity-30 text-2xl">person</span>
                      )}
                   </div>
                   <div>
                       <p className="font-bold text-on-surface">{booking.profiles.full_name}</p>
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Atleta</p>
                   </div>
                </div>
                <button 
                  onClick={() => removeStudent(booking.id)}
                  className="w-10 h-10 flex items-center justify-center text-error opacity-20 group-hover:opacity-100 hover:bg-error/10 rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
            {students.length === 0 && (
                <div className="text-center py-16 px-8 border-2 border-dashed border-outline-variant/20 rounded-[40px] space-y-3">
                    <span className="material-symbols-outlined text-4xl opacity-10">group_off</span>
                    <p className="text-on-surface-variant font-medium text-sm">Nenhum aluno inscrito ainda.</p>
                </div>
            )}
          </div>
        </section>

        {/* MODAL: ADICIONAR ALUNO */}
        {showAddStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center">
                <h4 className="font-headline font-black text-2xl">Adicionar Aluno</h4>
                <button onClick={() => setShowAddStudent(false)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center material-symbols-outlined opacity-40">close</button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {allStudents.map(student => (
                  <button 
                    key={student.id} 
                    onClick={() => addStudent(student.id)}
                    className="w-full p-5 rounded-2xl bg-surface-container hover:bg-primary hover:text-white transition-all flex items-center justify-between font-bold group shadow-sm active:scale-[0.98]"
                  >
                    {student.full_name}
                    <span className="material-symbols-outlined text-primary group-hover:text-white">add_circle</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDITAR AULA */}
        {showEditClass && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
            <form onSubmit={handleUpdateClass} className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center">
                <div>
                   <h4 className="font-headline font-black text-2xl">Editar Aula</h4>
                   <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Ajuste os detalhes da turma</p>
                </div>
                <button type="button" onClick={() => setShowEditClass(false)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center material-symbols-outlined opacity-40">close</button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Nome da Turma</label>
                    <input 
                        type="text" 
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        className="w-full p-5 rounded-3xl bg-surface-container border-none focus:ring-2 focus:ring-primary font-bold text-on-surface"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Horário</label>
                        <input 
                            type="datetime-local" 
                            value={editFormData.start_time}
                            onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
                            className="w-full p-5 rounded-3xl bg-surface-container border-none focus:ring-2 focus:ring-primary font-bold text-sm"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Vagas</label>
                        <input 
                            type="number" 
                            value={editFormData.capacity}
                            onChange={(e) => setEditFormData({...editFormData, capacity: e.target.value})}
                            className="w-full p-5 rounded-3xl bg-surface-container border-none focus:ring-2 focus:ring-primary font-bold"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Quadra</label>
                    <input 
                        type="text" 
                        value={editFormData.court}
                        onChange={(e) => setEditFormData({...editFormData, court: e.target.value})}
                        className="w-full p-5 rounded-3xl bg-surface-container border-none focus:ring-2 focus:ring-primary font-bold"
                        required
                    />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-secondary text-white py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 active:scale-95 transition-all hover:brightness-110"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
