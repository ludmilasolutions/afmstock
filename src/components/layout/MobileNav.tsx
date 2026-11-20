import React from 'react';
import { NavSection } from './Sidebar';
import { LayoutDashboard, Boxes, ArrowLeftRight, StickyNote } from 'lucide-react';

interface MobileNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  lowStockCount?: number;
  draftsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeSection,
  onNavigate,
  lowStockCount = 0,
  draftsCount = 0,
}) => {
  const items = [
    { id: 'inicio' as NavSection, label: 'Inicio', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'productos' as NavSection,
      label: 'Stock',
      icon: <Boxes className="w-5 h-5" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'movimientos' as NavSection, label: 'Movs', icon: <ArrowLeftRight className="w-5 h-5" /> },
    {
      id: 'notas' as NavSection,
      label: 'Notas',
      icon: <StickyNote className="w-5 h-5" />,
      badge: draftsCount > 0 ? draftsCount : undefined,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-around py-1.5 px-2 shadow-lg">
      {items.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-label={`Ir a ${item.label}`}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2.5 bg-amber-500 text-white font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
