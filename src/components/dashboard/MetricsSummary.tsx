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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Productos */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-800 block leading-tight">
            {totalProducts}
          </span>
          <span className="text-xs font-medium text-slate-500">Total Artículos</span>
        </div>
      </div>

      {/* Stock Crítico / Bajo */}
      <div
        onClick={onFilterLowStock}
        className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center gap-3 transition-all ${
          lowStockCount > 0 ? 'border-amber-200 hover:border-amber-300 cursor-pointer' : 'border-slate-200/80'
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <span className={`text-2xl font-black font-mono tracking-tight block leading-tight ${
            lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'
          }`}>
            {lowStockCount}
          </span>
          <span className="text-xs font-medium text-slate-500">Bajo Stock</span>
        </div>
      </div>

      {/* Total Entradas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <ArrowDownCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-800 block leading-tight">
            {totalEntradas}
          </span>
          <span className="text-xs font-medium text-slate-500">Entradas Reg.</span>
        </div>
      </div>

      {/* Total Salidas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
          <ArrowUpCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-800 block leading-tight">
            {totalSalidas}
          </span>
          <span className="text-xs font-medium text-slate-500">Salidas Reg.</span>
        </div>
      </div>
    </div>
  );
};
