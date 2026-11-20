import React from 'react';
import { Movimiento } from '@/types/movement';
import { formatDate } from '@/utils/formatters';
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, RotateCcw } from 'lucide-react';

interface MovementCardProps {
  movement: Movimiento;
  onRevert: (m: Movimiento) => void;
}

export const MovementCard: React.FC<MovementCardProps> = ({ movement, onRevert }) => {
  const isEntrada = movement.tipo === 'entrada';
  const isCreacion = movement.tipo === 'creacion';

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
      {/* Icono y detalle */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 flex-shrink-0">
          {isEntrada ? (
            <ArrowDownCircle className="w-7 h-7 text-emerald-600" />
          ) : isCreacion ? (
            <PlusCircle className="w-7 h-7 text-indigo-600" />
          ) : (
            <ArrowUpCircle className="w-7 h-7 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-sm truncate">
            {movement.productoNombre || 'Producto sin nombre'}
          </h4>
          <span className="text-xs text-slate-400 block mt-0.5">
            {formatDate(movement.fecha)} · {movement.usuario ? movement.usuario.split('@')[0] : 'admin'}
          </span>
          {movement.nota && (
            <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">
              "{movement.nota}"
            </p>
          )}
        </div>
      </div>

      {/* Cantidad y acción */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className={`font-mono font-bold text-lg ${
            isEntrada ? 'text-emerald-600' : isCreacion ? 'text-indigo-600' : 'text-red-600'
          }`}
        >
          {isEntrada ? '+' : isCreacion ? '' : '−'}
          {movement.cantidad}
        </span>

        {movement.tipo !== 'creacion' && (
          <button
            onClick={() => onRevert(movement)}
            title="Revertir movimiento"
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
