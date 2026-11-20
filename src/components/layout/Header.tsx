import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Package, LogOut, User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
          <Package className="w-4 h-4" />
        </div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white py-1.5 px-3.5 rounded-full border border-slate-200 shadow-2xs">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{user.email}</span>
            <span className="sm:hidden">{user.email?.split('@')[0]}</span>
          </div>
        )}

        <button
          onClick={logout}
          title="Cerrar Sesión"
          aria-label="Cerrar sesión"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
