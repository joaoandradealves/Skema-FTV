import React from 'react';
import { Link } from 'react-router-dom';

interface StudentNavbarProps {
  activePage: 'home' | 'agenda' | 'perfil' | 'ranking';
}

export default function StudentNavbar({ activePage }: StudentNavbarProps) {
  const activeClass = "flex flex-col items-center justify-center bg-gradient-to-br from-[#006971] to-[#00C2D1] text-white rounded-2xl px-5 py-2 scale-110 -translate-y-1 shadow-lg transition-all shrink-0";
  const inactiveClass = "flex flex-col items-center justify-center text-on-surface-variant opacity-70 px-4 py-2 hover:text-primary transition-colors shrink-0";

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 pb-6 pt-3 bg-[#FFF8F3]/80 backdrop-blur-md z-50 rounded-t-3xl shadow-[0px_-10px_30px_rgba(164,60,18,0.05)] border-t border-white/20">
      <Link to="/student" className={activePage === 'home' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined text-sm" style={activePage === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}>home</span>
        <span className="font-body text-[9px] font-bold uppercase tracking-wider mt-0.5">Início</span>
      </Link>
      <Link to="/ranking" className={activePage === 'ranking' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined text-sm" style={activePage === 'ranking' ? { fontVariationSettings: "'FILL' 1" } : undefined}>workspace_premium</span>
        <span className="font-body text-[9px] font-bold uppercase tracking-wider mt-0.5">Ranking</span>
      </Link>
      <Link to="/student/history" className={activePage === 'agenda' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined text-sm" style={activePage === 'agenda' ? { fontVariationSettings: "'FILL' 1" } : undefined}>history_edu</span>
        <span className="font-body text-[9px] font-bold uppercase tracking-wider mt-0.5">Agenda</span>
      </Link>
      <Link to="/profile" className={activePage === 'perfil' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined text-sm" style={activePage === 'perfil' ? { fontVariationSettings: "'FILL' 1" } : undefined}>person</span>
        <span className="font-body text-[9px] font-bold uppercase tracking-wider mt-0.5">Perfil</span>
      </Link>
    </nav>
  );
}
