import React from 'react';
import { Link } from 'react-router-dom';

interface TeacherNavbarProps {
  activePage: 'home' | 'agenda' | 'planos' | 'perfil';
}

export default function TeacherNavbar({ activePage }: TeacherNavbarProps) {
  const activeClass = "flex flex-col items-center justify-center bg-gradient-to-br from-[#006971] to-[#00C2D1] text-white rounded-2xl px-5 py-2 scale-110 -translate-y-1 shadow-lg transition-all";
  const inactiveClass = "flex flex-col items-center justify-center text-on-surface-variant opacity-70 px-4 py-2 hover:text-primary transition-colors";

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-[#FFF8F3]/70 backdrop-blur-md z-50 rounded-t-3xl shadow-[0px_-10px_30px_rgba(164,60,18,0.05)]">
      <Link to="/teacher" className={activePage === 'home' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined" style={activePage === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}>home</span>
        <span className="font-label text-[10px] font-semibold uppercase tracking-wider mt-0.5">Início</span>
      </Link>
      <Link to="/create-class" className={activePage === 'agenda' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined" style={activePage === 'agenda' ? { fontVariationSettings: "'FILL' 1" } : undefined}>calendar_month</span>
        <span className="font-label text-[10px] font-semibold uppercase tracking-wider mt-0.5">Agenda</span>
      </Link>
      <Link to="/manage-plans" className={activePage === 'planos' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined" style={activePage === 'planos' ? { fontVariationSettings: "'FILL' 1" } : undefined}>payments</span>
        <span className="font-label text-[10px] font-semibold uppercase tracking-wider mt-0.5">Planos</span>
      </Link>
      <Link to="/profile" className={activePage === 'perfil' ? activeClass : inactiveClass}>
        <span className="material-symbols-outlined" style={activePage === 'perfil' ? { fontVariationSettings: "'FILL' 1" } : undefined}>person</span>
        <span className="font-label text-[10px] font-semibold uppercase tracking-wider mt-0.5">Perfil</span>
      </Link>
    </nav>
  );
}
