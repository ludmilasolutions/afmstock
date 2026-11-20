import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Producto } from '@/types/product';
import { Movimiento } from '@/types/movement';
import { HistorialItem } from '@/types/history';
import { getProductMovements, getProductEdits } from '@/services/historyService';
import { formatDate } from '@/utils/formatters';
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, Clock, FileEdit } from 'lucide-react';

interface ProductHistoryModalProps {
  product: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  cachedMovements?: Movimiento[];
}

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
  cachedMovements,
}) => {
  const [activeTab, setActiveTab] = useState<'movimientos' | 'ediciones'>('movimientos');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [ediciones, setEdiciones] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setLoading(true);
      Promise.all([
        getProductMovements(product.id, cachedMovements),
        getProductEdits(product.id),
      ])
        .then(([movs, edits]) => {
          setMovimientos(movs);
          setEdiciones(edits);
        })
        .finally(() => setLoading(false));
    }
  }, [product, isOpen, cachedMovements]);

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial: ${product.nombre}`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Pestañas */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'movimientos'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Movimientos de Stock ({movimientos.length})
          </button>
          <button
            onClick={() => setActiveTab('ediciones')}
            className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'ediciones'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            Auditoría de Cambios ({ediciones.length})
          </button>
        </div>

        {loading ? (
          <Spinner text="Cargando historial..." />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'movimientos' ? (
              movimientos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No hay movimientos registrados para este producto.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {movimientos.map((m) => {
                    const isEntrada = m.tipo === 'entrada';
                    const isCreacion = m.tipo === 'creacion';

                    return (
                      <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {isEntrada ? (
                              <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                            ) : isCreacion ? (
                              <PlusCircle className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <ArrowUpCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 capitalize">
                              {m.tipo}
                            </span>
                            {m.nota && (
                              <p className="text-xs text-slate-500">{m.nota}</p>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {formatDate(m.fecha)} · {m.usuario ? m.usuario.split('@')[0] : 'Sistema'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-sm">
                          <span className={isEntrada ? 'text-emerald-600' : isCreacion ? 'text-indigo-600' : 'text-red-600'}>
                            {isEntrada ? '+' : isCreacion ? '' : '−'}
                            {m.cantidad}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : ediciones.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay registros de edición para este producto.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ediciones.map((ed) => (
                  <div key={ed.id} className="py-3 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 capitalize bg-slate-100 px-2 py-0.5 rounded">
                        {ed.tipo}
                      </span>
                      <span className="text-slate-400">
                        {formatDate(ed.fecha)} · {ed.usuario ? ed.usuario.split('@')[0] : 'Sistema'}
                      </span>
                    </div>

                    {ed.tipo === 'ajuste' && (
                      <p className="text-slate-600 font-medium">
                        Ajuste de stock: <strong>{ed.cantidadAnterior}</strong> → <strong>{ed.cantidadNueva}</strong>
                        {ed.motivo ? ` (Motivo: ${ed.motivo})` : ''}
                      </p>
                    )}

                    {ed.tipo === 'edicion' && ed.datosAnteriores && ed.datosNuevos && (
                      <div className="text-slate-600 space-y-0.5 pl-2 border-l-2 border-slate-200 mt-1">
                        {Object.keys(ed.datosNuevos).map((k) => {
                          const ant = ed.datosAnteriores?.[k];
                          const nue = ed.datosNuevos?.[k];
                          if (ant !== undefined && nue !== undefined && String(ant) !== String(nue) && k !== 'fechaEdicion') {
                            return (
                              <div key={k}>
                                <span className="font-semibold capitalize">{k}:</span> {String(ant)} → <strong className="text-indigo-600">{String(nue)}</strong>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

