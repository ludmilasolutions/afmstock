import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Producto } from '@/types/product';
import { SearchEngine } from '@/search/searchEngine';
import { formatDate } from '@/utils/formatters';
import { Tag, MapPin, Building, Truck, FileText, Calendar, SlidersHorizontal, Edit3 } from 'lucide-react';

interface ProductDetailModalProps {
  product: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (p: Producto) => void;
  onEdit: (p: Producto) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAdjust,
  onEdit,
}) => {
  if (!product) return null;

  const stockStatus = SearchEngine.getStockStatus(product.cantidad, product.stockMinimo);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha del Producto" maxWidth="md">
      <div className="flex flex-col gap-5">
        {/* Encabezado con estado y stock */}
        <div className="flex items-start justify-between bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-xs font-mono text-slate-500 font-bold block">
              {product.codigo || 'SIN CÓDIGO'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {product.nombre}
            </h3>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-3xl font-black font-mono tracking-tight ${stockStatus.colorClass}`}>
              {product.cantidad ?? 0}
            </span>
            <Badge variant={stockStatus.level} size="sm">
              {stockStatus.label}
            </Badge>
          </div>
        </div>

        {/* Grilla de información detallada - H-UI-01: text-slate-500 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              Stock Mínimo
            </span>
            <span className="font-semibold text-slate-800 font-mono">
              {product.stockMinimo ?? 5} unidades
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Categoría
            </span>
            <span className="font-semibold text-slate-800">
              {product.categoria || '—'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Ubicación en Depósito
            </span>
            <span className="font-semibold text-slate-800">
              {product.ubicacion || '—'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Marca
            </span>
            <span className="font-semibold text-slate-800">
              {product.marca || '—'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col col-span-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              Proveedor
            </span>
            <span className="font-semibold text-slate-800">
              {product.proveedor || '—'}
            </span>
          </div>

          {product.notas && (
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex flex-col col-span-2 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Notas Adicionales
              </span>
              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                {product.notas}
              </p>
            </div>
          )}
        </div>

        {/* Metadatos históricos / auditoría */}
        <div className="text-[11px] text-slate-500 font-medium flex flex-col gap-1 pt-2 border-t border-slate-100">
          {product.fechaCreacion && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Creado: {formatDate(product.fechaCreacion)} {product.usuarioCreacion ? `por ${product.usuarioCreacion.split('@')[0]}` : ''}
            </span>
          )}
          {product.fechaEdicion && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Última edición: {formatDate(product.fechaEdicion)} {product.usuarioEdicion ? `por ${product.usuarioEdicion.split('@')[0]}` : ''}
            </span>
          )}
        </div>

        {/* Botones de acción rápida */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="warning"
            size="sm"
            onClick={() => {
              onClose();
              onAdjust(product);
            }}
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Ajustar Stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(product);
            }}
            icon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Editar Ficha
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
