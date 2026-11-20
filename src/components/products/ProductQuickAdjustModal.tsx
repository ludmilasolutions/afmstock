import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Producto } from '@/types/product';
import { useToast } from '@/context/ToastContext';

interface ProductQuickAdjustModalProps {
  product: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (productId: string, newStock: number, motivo: string) => Promise<void>;
}

export const ProductQuickAdjustModal: React.FC<ProductQuickAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
  onAdjust,
}) => {
  const { showToast } = useToast();
  const [newStock, setNewStock] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setNewStock(product.cantidad ?? 0);
      setMotivo('');
    }
  }, [product, isOpen]);

  if (!product) return null;

  const currentStock = product.cantidad ?? 0;
  const diff = newStock - currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(newStock) || newStock < 0) {
      showToast('Ingresá una cantidad de stock válida mayor o igual a 0', 'warning');
      return;
    }

    try {
      setLoading(true);
      await onAdjust(product.id, newStock, motivo);
      showToast(`Stock de "${product.nombre}" actualizado a ${newStock} unidades`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al ajustar el stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste Rápido de Stock" maxWidth="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 block">{product.codigo}</span>
            <span className="text-sm font-semibold text-slate-800">{product.nombre}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Stock Actual</span>
            <span className="text-lg font-bold font-mono text-slate-700">{currentStock}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            label="Nuevo Stock Real en Depósito *"
            type="number"
            min="0"
            required
            value={newStock}
            onChange={(e) => setNewStock(Number(e.target.value))}
            autoFocus
          />

          {diff !== 0 && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              diff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span>Diferencia calculada:</span>
              <span className="font-mono text-sm">{diff > 0 ? `+${diff}` : diff} unidades</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Motivo del Ajuste
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Conteo físico, rotura, mercadería encontrada..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="warning" loading={loading}>
            Confirmar Ajuste
          </Button>
        </div>
      </form>
    </Modal>
  );
};

