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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando aula...</div>;

  return (
    <div className="bg-surface min-h-screen pb-12">
      <TopAppBar title="GESTÃO DA TURMA" showBackButton />

      <main className="mt-20 px-6 max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h2 className="font-headline text-2xl font-black text-primary">{classInfo.name}</h2>
          <div className="flex gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {new Date(classInfo.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> {classInfo.court}</span>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-xl">Alunos Inscritos ({students.length}/{classInfo.capacity})</h3>
            <button 
              onClick={() => setShowAddStudent(true)}
              className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          <div className="grid gap-3">
            {students.map(booking => (
              <div key={booking.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-outline-variant/10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
                      {booking.profiles.avatar_url ? (
                        <img src={booking.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined opacity-30">person</span>
                      )}
                   </div>
                   <p className="font-bold">{booking.profiles.full_name}</p>
                </div>
                <button 
                  onClick={() => removeStudent(booking.id)}
                  className="text-error opacity-40 hover:opacity-100 p-2"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
            {students.length === 0 && <p className="text-center py-12 text-on-surface-variant italic border-2 border-dashed border-outline-variant/20 rounded-3xl">Nenhum aluno inscrito ainda.</p>}
          </div>
        </section>

        {showAddStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl transition-all">
              <div className="flex justify-between items-center">
                <h4 className="font-headline font-black text-2xl">Adicionar Aluno</h4>
                <button onClick={() => setShowAddStudent(false)} className="material-symbols-outlined opacity-40">close</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {allStudents.map(student => (
                  <button 
                    key={student.id} 
                    onClick={() => addStudent(student.id)}
                    className="w-full p-4 rounded-xl hover:bg-surface-container transition-colors flex items-center justify-between font-bold"
                  >
                    {student.full_name}
                    <span className="material-symbols-outlined text-primary">add_circle</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
