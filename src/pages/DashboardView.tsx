import React, { useMemo } from 'react';
import { Producto } from '@/types/product';
import { Movimiento } from '@/types/movement';
import { Borrador } from '@/types/draft';
import { MetricsSummary } from '@/components/dashboard/MetricsSummary';
import { MovementTable } from '@/components/movements/MovementTable';
import { MovementCard } from '@/components/movements/MovementCard';
import { Button } from '@/components/common/Button';
import { ArrowDownCircle, ArrowUpCircle, Plus, Boxes } from 'lucide-react';
import { NavSection } from '@/components/layout/Sidebar';

interface DashboardViewProps {
  products: Producto[];
  movements: Movimiento[];
  drafts: Borrador[];
  onNavigate: (s: NavSection) => void;
  onOpenMovementModal: (type: 'entrada' | 'salida') => void;
  onOpenProductModal: () => void;
  onRevertMovement: (m: Movimiento) => void;
  onFilterLowStock: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  movements,
  onNavigate,
  onOpenMovementModal,
  onOpenProductModal,
  onRevertMovement,
  onFilterLowStock,
}) => {
  const lowStockCount = useMemo(
    () => products.filter((p) => (p.cantidad || 0) < (p.stockMinimo || 5)).length,
    [products]
  );

  const entradasCount = useMemo(
    () => movements.filter((m) => m.tipo === 'entrada').length,
    [movements]
  );

  const salidasCount = useMemo(
    () => movements.filter((m) => m.tipo === 'salida').length,
    [movements]
  );

  const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen métrico principal */}
      <MetricsSummary
        totalProducts={products.length}
        lowStockCount={lowStockCount}
        totalEntradas={entradasCount}
        totalSalidas={salidasCount}
        onFilterLowStock={onFilterLowStock}
      />

      {/* Accesos rápidos de depósito */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Acciones Frecuentes de Depósito
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onOpenMovementModal('entrada')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/70 transition-all font-semibold text-sm gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-2xs"
          >
            <ArrowDownCircle className="w-6 h-6 text-emerald-600" />
            <span>Registrar Entrada</span>
          </button>

          <button
            onClick={() => onOpenMovementModal('salida')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-50 hover:bg-rose-100/90 text-rose-900 border border-rose-200/70 transition-all font-semibold text-sm gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-2xs"
          >
            <ArrowUpCircle className="w-6 h-6 text-rose-600" />
            <span>Registrar Salida</span>
          </button>

          <button
            onClick={() => onNavigate('productos')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-900 border border-indigo-200/70 transition-all font-semibold text-sm gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-2xs"
          >
            <Boxes className="w-6 h-6 text-indigo-600" />
            <span>Consultar Stock</span>
          </button>

          <button
            onClick={onOpenProductModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200/80 transition-all font-semibold text-sm gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-2xs"
          >
            <Plus className="w-6 h-6 text-slate-600" />
            <span>Nuevo Artículo</span>
          </button>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Últimos Movimientos del Depósito
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('movimientos')}>
            Ver todos ({movements.length})
          </Button>
        </div>

        {recentMovements.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center text-slate-500 text-sm">
            No se han registrado movimientos todavía.
          </div>
        ) : (
          <>
            <div className="hidden sm:block">
              <MovementTable movements={recentMovements} onRevert={onRevertMovement} />
            </div>
            <div className="sm:hidden flex flex-col gap-2.5">
              {recentMovements.map((m) => (
                <MovementCard key={m.id} movement={m} onRevert={onRevertMovement} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
