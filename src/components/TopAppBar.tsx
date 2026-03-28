import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TopAppBarProps {
  title?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  showBackButton?: boolean;
}

const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmhvMLYsiOKVXKNDrsFAHFtQXzfVGjuEL_L_TFvjkqb4xgsa4YJY1QR4d4h4OrHdCHoimQsQbIBa3GEMNoxLA_7d4g869yio-XLYVQX5dQN918iHcV09zk3sLY9UMiuBA0r4IyQz9BQrj5H-wYlr9-2o47XdYieZeUNUyk_5YsTqEn-sph-dg7GURVuZv_qXosC38RVKd1DRmnGQO93KRLAQlZ_mgOOrihEYdy2u4cibsWaCIMWt7TNWjph8ae6yImGOh6aVpxP7PU';

export default function TopAppBar({ 
  title = 'SKEMA BEACH CLUB', 
  avatarSrc = DEFAULT_AVATAR, 
  avatarAlt = 'Perfil',
  showBackButton = false
}: TopAppBarProps) {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full z-50 bg-transparent flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-2">
        {showBackButton ? (
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 -ml-2 flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined font-black">arrow_back</span>
          </button>
        ) : (
          <span className="material-symbols-outlined text-[#006971]">waves</span>
        )}
        <h1 className="font-headline font-black tracking-widest text-[#006971] text-xs uppercase truncate max-w-[200px]">{title}</h1>
      </div>
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container shrink-0">
        <img
          alt={avatarAlt}
          className="w-full h-full object-cover"
          src={avatarSrc}
          referrerPolicy="no-referrer"
        />
      </div>
    </header>
  );
}
