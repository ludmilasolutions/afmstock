import React, { useState, useMemo } from 'react';
import { Movimiento } from '@/types/movement';
import { MovementTable } from '@/components/movements/MovementTable';
import { MovementCard } from '@/components/movements/MovementCard';
import { Button } from '@/components/common/Button';
import { Search, Plus, ArrowLeftRight, X } from 'lucide-react';

interface MovementsViewProps {
  movements: Movimiento[];
  onOpenNewMovement: () => void;
  onRevertMovement: (m: Movimiento) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  onOpenNewMovement,
  onRevertMovement,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        !search.trim() ||
        (m.productoNombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.nota || '').toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'all' || m.tipo === typeFilter;

      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior de búsqueda y nuevo movimiento */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimiento por producto o nota..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-3 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button onClick={onOpenNewMovement} icon={<Plus className="w-4 h-4" />}>
          Nuevo Movimiento
        </Button>
      </div>

      {/* Filtro por tipo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({movements.length})
        </button>
        <button
          onClick={() => setTypeFilter('entrada')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            typeFilter === 'entrada'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Entradas
        </button>
        <button
          onClick={() => setTypeFilter('salida')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            typeFilter === 'salida'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
          }`}
        >
          Salidas
        </button>
        <button
          onClick={() => setTypeFilter('creacion')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            typeFilter === 'creacion'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          Altas Iniciales
        </button>
      </div>

      {/* Lista */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-200 text-center flex flex-col items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-slate-300" />
          <h4 className="text-sm font-semibold text-slate-700">Sin movimientos registrados</h4>
          <p className="text-xs text-slate-400">
            No se encontraron movimientos con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <MovementTable movements={filteredMovements} onRevert={onRevertMovement} />
          </div>

          <div className="sm:hidden flex flex-col gap-2.5">
            {filteredMovements.map((m) => (
              <MovementCard key={m.id} movement={m} onRevert={onRevertMovement} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

