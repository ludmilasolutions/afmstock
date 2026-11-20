import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Producto, ProductoInput } from '@/types/product';
import { useToast } from '@/context/ToastContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Producto | null;
  onSave: (data: ProductoInput) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<ProductoInput>({
    codigo: '',
    nombre: '',
    cantidad: 0,
    stockMinimo: 5,
    categoria: '',
    ubicacion: '',
    marca: '',
    proveedor: '',
    notas: '',
  });

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        codigo: productToEdit.codigo || '',
        nombre: productToEdit.nombre || '',
        cantidad: productToEdit.cantidad ?? 0,
        stockMinimo: productToEdit.stockMinimo ?? 5,
        categoria: productToEdit.categoria || '',
        ubicacion: productToEdit.ubicacion || '',
        marca: productToEdit.marca || '',
        proveedor: productToEdit.proveedor || '',
        notas: productToEdit.notas || '',
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        cantidad: 0,
        stockMinimo: 5,
        categoria: '',
        ubicacion: '',
        marca: '',
        proveedor: '',
        notas: '',
      });
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showToast('El nombre del producto es obligatorio', 'warning');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        nombre: formData.nombre.trim(),
        codigo: formData.codigo?.trim() || '',
        cantidad: Number(formData.cantidad) || 0,
        stockMinimo: Number(formData.stockMinimo) || 5,
      });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar el producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              label="Nombre del Producto *"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Tornillo Phillips 1/2"
            />
          </div>

          <div>
            <Input
              label="Código / SKU"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="Auto-generado si queda vacío"
              helperText="Vacío para PROD-XXXX"
            />
          </div>

          <div>
            <Input
              label="Categoría"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Ej: Herramientas, Fijaciones..."
            />
          </div>

          <div>
            <Input
              label="Cantidad Actual"
              type="number"
              min="0"
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
              disabled={!!productToEdit}
              helperText={productToEdit ? 'Modificar vía Ajuste o Movimiento' : undefined}
            />
          </div>

          <div>
            <Input
              label="Stock Mínimo Alerta"
              type="number"
              min="0"
              value={formData.stockMinimo}
              onChange={(e) => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
              placeholder="5"
            />
          </div>

          <div>
            <Input
              label="Ubicación Depósito"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Ej: Estante A2, Pasillo 3"
            />
          </div>

          <div>
            <Input
              label="Marca"
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              placeholder="Ej: Stanley, 3M, Tigre"
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              placeholder="Nombre de proveedor habitual"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones, medidas, compatibilidades..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

