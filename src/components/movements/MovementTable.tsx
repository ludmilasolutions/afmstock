import React from 'react';
import { Movimiento } from '@/types/movement';
import { formatDate } from '@/utils/formatters';
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, RotateCcw } from 'lucide-react';

interface MovementTableProps {
  movements: Movimiento[];
  onRevert: (m: Movimiento) => void;
}

export const MovementTable: React.FC<MovementTableProps> = ({ movements, onRevert }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Producto</th>
              <th className="py-3 px-4 text-right">Cantidad</th>
              <th className="py-3 px-4">Nota / Motivo</th>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => {
              const isEntrada = m.tipo === 'entrada';
              const isCreacion = m.tipo === 'creacion';

              return (
                <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Tipo */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isEntrada
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isCreacion
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                      ) : isCreacion ? (
                        <PlusCircle className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{m.tipo}</span>
                    </span>
                  </td>

                  {/* Producto */}
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {m.productoNombre || 'Producto sin nombre'}
                  </td>

                  {/* Cantidad */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      className={`font-mono font-bold text-base ${
                        isEntrada
                          ? 'text-emerald-600'
                          : isCreacion
                          ? 'text-indigo-600'
                          : 'text-red-600'
                      }`}
                    >
                      {isEntrada ? '+' : isCreacion ? '' : '−'}
                      {m.cantidad}
                    </span>
                  </td>

                  {/* Nota */}
                  <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                    {m.nota || '—'}
                  </td>

                  {/* Fecha */}
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(m.fecha)}
                  </td>

                  {/* Usuario */}
                  <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {m.usuario ? m.usuario.split('@')[0] : 'admin'}
                  </td>

                  {/* Revertir */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {m.tipo !== 'creacion' ? (
                      <button
                        onClick={() => onRevert(m)}
                        title="Revertir este movimiento y reajustar stock"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revertir</span>
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
