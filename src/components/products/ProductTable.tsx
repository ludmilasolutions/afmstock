import React from 'react';
import { Producto } from '@/types/product';
import { SearchEngine } from '@/search/searchEngine';
import { Badge } from '@/components/common/Badge';
import { SlidersHorizontal, Edit3, Trash2, History, ExternalLink, ArrowUpDown } from 'lucide-react';

interface ProductTableProps {
  products: Producto[];
  searchQuery: string;
  sortField: 'nombre' | 'cantidad' | 'codigo';
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'nombre' | 'cantidad' | 'codigo') => void;
  onAdjust: (p: Producto) => void;
  onEdit: (p: Producto) => void;
  onDelete: (p: Producto) => void;
  onViewHistory: (p: Producto) => void;
  onViewDetail: (p: Producto) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  searchQuery,
  sortField,
  sortOrder: _sortOrder,
  onSort,
  onAdjust,
  onEdit,
  onDelete,
  onViewHistory,
  onViewDetail,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-800">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
            <tr>
              <th
                onClick={() => onSort('codigo')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Código</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'codigo' ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
              </th>
              <th
                onClick={() => onSort('nombre')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Producto / Detalle</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'nombre' ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-3.5 px-4 hidden md:table-cell">Categoría</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Ubicación</th>
              <th
                onClick={() => onSort('cantidad')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Stock</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'cantidad' ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Estado</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const stockStatus = SearchEngine.getStockStatus(p.cantidad, p.stockMinimo);

              return (
                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                  {/* Código - H-UI-01: text-slate-600 */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                    {SearchEngine.highlightReact(p.codigo || '—', searchQuery)}
                  </td>

                  {/* Nombre y Marca */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onViewDetail(p)}
                      className="cursor-pointer group flex flex-col"
                    >
                      <span className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                        {SearchEngine.highlightReact(p.nombre, searchQuery)}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                      </span>
                      {p.marca && (
                        <span className="text-xs text-slate-500 font-medium">Marca: {p.marca}</span>
                      )}
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                    {p.categoria ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {p.categoria}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Ubicación */}
                  <td className="py-3 px-4 hidden lg:table-cell text-xs text-slate-600 font-medium whitespace-nowrap">
                    {p.ubicacion || '—'}
                  </td>

                  {/* Cantidad - H-UI-01: text-slate-500 */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className={`font-mono text-base font-bold ${stockStatus.colorClass}`}>
                      {p.cantidad ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">/ mín {p.stockMinimo ?? 5}</span>
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <Badge variant={stockStatus.level} size="sm">
                      {stockStatus.label}
                    </Badge>
                  </td>

                  {/* Acciones - H-A11Y-04: aria-label en todos los botones */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onAdjust(p)}
                        title="Ajustar Stock Rápido"
                        aria-label={`Ajustar stock rápido de ${p.nombre}`}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Editar Producto"
                        aria-label={`Editar ficha de ${p.nombre}`}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewHistory(p)}
                        title="Ver Historial"
                        aria-label={`Ver historial de ${p.nombre}`}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        title="Eliminar Producto"
                        aria-label={`Eliminar producto ${p.nombre}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
