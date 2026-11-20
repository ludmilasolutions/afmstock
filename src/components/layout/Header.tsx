import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Package, LogOut, User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
          <Package className="w-4 h-4" />
        </div>
        <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-200/60">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{user.email}</span>
            <span className="sm:hidden">{user.email?.split('@')[0]}</span>
          </div>
        )}

        <button
          onClick={logout}
          title="Cerrar Sesión"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
