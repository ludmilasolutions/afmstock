import React from 'react';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface MetricsSummaryProps {
  totalProducts: number;
  lowStockCount: number;
  totalEntradas: number;
  totalSalidas: number;
  onFilterLowStock?: () => void;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  totalProducts,
  lowStockCount,
  totalEntradas,
  totalSalidas,
  onFilterLowStock,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {/* Total Productos */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100/60">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 block leading-tight">
            {totalProducts}
          </span>
          <span className="text-xs font-semibold text-slate-500">Total Artículos</span>
        </div>
      </div>

      {/* Stock Crítico / Bajo */}
      <div
        onClick={onFilterLowStock}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onFilterLowStock?.();
          }
        }}
        aria-label={`Artículos con bajo stock: ${lowStockCount}`}
        className={`bg-white p-4.5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
          lowStockCount > 0
            ? 'border-amber-300 hover:border-amber-400 hover:shadow-sm cursor-pointer'
            : 'border-slate-200/80 cursor-default'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
          lowStockCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200/80' : 'bg-slate-50 text-slate-400 border-slate-100'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <span className={`text-2xl font-black font-mono tracking-tight block leading-tight ${
            lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {lowStockCount}
          </span>
          <span className="text-xs font-semibold text-slate-500">Bajo Stock</span>
        </div>
      </div>

      {/* Total Entradas */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100/60">
          <ArrowDownCircle className="w-6 h-6" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 block leading-tight">
            {totalEntradas}
          </span>
          <span className="text-xs font-semibold text-slate-500">Entradas Reg.</span>
        </div>
      </div>

      {/* Total Salidas */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100/60">
          <ArrowUpCircle className="w-6 h-6" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 block leading-tight">
            {totalSalidas}
          </span>
          <span className="text-xs font-semibold text-slate-500">Salidas Reg.</span>
        </div>
      </div>
    </div>
  );
};
