import React from 'react';
import { Package, LayoutDashboard, Boxes, ArrowLeftRight, StickyNote } from 'lucide-react';

export type NavSection = 'inicio' | 'productos' | 'movimientos' | 'notas';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  lowStockCount?: number;
  draftsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  lowStockCount = 0,
  draftsCount = 0,
}) => {
  const navItems = [
    { id: 'inicio' as NavSection, label: 'Inicio', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'productos' as NavSection,
      label: 'Inventario / Stock',
      icon: <Boxes className="w-4 h-4" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    { id: 'movimientos' as NavSection, label: 'Movimientos', icon: <ArrowLeftRight className="w-4 h-4" /> },
    {
      id: 'notas' as NavSection,
      label: 'Notas Rápidas',
      icon: <StickyNote className="w-4 h-4" />,
      badge: draftsCount > 0 ? draftsCount : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white min-h-screen p-5 flex-shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-base tracking-tight leading-none text-white">StockAFM</h2>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1 block">
            Ferretería & Depósito
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-1.5 flex-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
          Módulos
        </span>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
        AFM STOCK v2.1 React
      </div>
    </aside>
  );
};

