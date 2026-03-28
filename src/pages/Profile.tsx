import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';
import StudentNavbar from '../components/StudentNavbar';
import WavyBackground from '../components/WavyBackground';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    phone: string;
    avatar_url: string | null;
  }>({
    full_name: '',
    phone: '',
    avatar_url: null,
  });

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, role, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: user.user_metadata?.phone || '',
          avatar_url: data.avatar_url,
        });
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      const updates = {
        id: user.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;
      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Nota: Assume-se que o bucket 'avatars' existe e é público.
      // Se não existir, o upload falhará.
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setProfile({ ...profile, avatar_url: data.publicUrl });
      
      // Update the profile in the database immediately after upload
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      }

    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading && !profile.full_name) {
    return <div className="min-h-screen flex items-center justify-center bg-surface">Carregando...</div>;
  }

  return (
    <WavyBackground topHeight="25%">
      <div className="text-on-surface pb-32 min-h-screen relative">
      <TopAppBar title="MEU PERFIL" avatarSrc={profile.avatar_url || undefined} showBackButton />

      <main className="mt-24 px-6 max-w-lg mx-auto space-y-8">
        <section className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-container shadow-xl bg-surface-container-highest flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-6xl text-on-surface-variant">person</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={uploadAvatar} 
                disabled={uploading}
              />
            </label>
          </div>
          {uploading && <p className="text-xs font-bold text-primary animate-pulse">Enviando foto...</p>}
        </section>

        <form onSubmit={updateProfile} className="space-y-6">
          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</label>
            <input
              className="w-full h-14 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Telefone</label>
            <input
              className="w-full h-14 px-5 rounded-xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium opacity-60"
              type="tel"
              value={profile.phone}
              disabled
            />
            <p className="text-[10px] text-on-surface-variant ml-1 italic">O telefone é vinculado à sua conta e não pode ser alterado aqui.</p>
          </div>

          <div className="pt-4 space-y-4">
            <button
              type="button"
              onClick={() => navigate('/plans')}
              className="w-full h-14 bg-secondary/10 text-secondary font-headline font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined">payments</span>
              MEUS PLANOS
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#006971] text-white font-headline font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              SALVAR ALTERAÇÕES
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-14 bg-white border-2 border-error text-error font-headline font-bold text-lg rounded-xl active:scale-95 transition-transform"
            >
              SAIR DA CONTA
            </button>
          </div>
        </form>
      </main>

      <StudentNavbar activePage="perfil" />
      </div>
    </WavyBackground>
  );
}
