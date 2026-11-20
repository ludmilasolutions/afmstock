import React from 'react';
import { Producto } from '@/types/product';
import { SearchEngine } from '@/search/searchEngine';
import { Badge } from '@/components/common/Badge';
import { MapPin, Tag, SlidersHorizontal, Edit3, Trash2, History } from 'lucide-react';

interface ProductCardProps {
  product: Producto;
  searchQuery: string;
  onAdjust: (p: Producto) => void;
  onEdit: (p: Producto) => void;
  onDelete: (p: Producto) => void;
  onViewHistory: (p: Producto) => void;
  onViewDetail: (p: Producto) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  searchQuery,
  onAdjust,
  onEdit,
  onDelete,
  onViewHistory,
  onViewDetail,
}) => {
  const stockStatus = SearchEngine.getStockStatus(product.cantidad, product.stockMinimo);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col gap-3">
      {/* Top Header: Nombre y Stock */}
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => onViewDetail(product)}
          className="flex-1 cursor-pointer group"
        >
          <h4 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
            {SearchEngine.highlightReact(product.nombre, searchQuery)}
          </h4>
          <span className="text-[11px] font-mono text-slate-400 font-medium">
            {SearchEngine.highlightReact(product.codigo || 'S/C', searchQuery)}
          </span>
        </div>

        <div className="flex flex-col items-end flex-shrink-0">
          <span className={`text-2xl font-extrabold tracking-tight font-mono ${stockStatus.colorClass}`}>
            {product.cantidad ?? 0}
          </span>
          <Badge variant={stockStatus.level} size="sm">
            {stockStatus.label}
          </Badge>
        </div>
      </div>

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        {product.categoria && (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-medium">
            <Tag className="w-3 h-3 text-slate-400" />
            {product.categoria}
          </span>
        )}
        {product.ubicacion && (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md text-[11px]">
            <MapPin className="w-3 h-3 text-slate-400" />
            {product.ubicacion}
          </span>
        )}
        {product.marca && (
          <span className="text-[11px] text-slate-400">· {product.marca}</span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 mt-0.5">
        <button
          onClick={() => onAdjust(product)}
          title="Ajustar Stock"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Ajustar</span>
        </button>

        <button
          onClick={() => onEdit(product)}
          title="Editar Producto"
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onViewHistory(product)}
          title="Ver Historial"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(product)}
          title="Eliminar Producto"
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
