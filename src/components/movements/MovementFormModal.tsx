import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Producto } from '@/types/product';
import { MovementType } from '@/types/movement';
import { SearchEngine } from '@/search/searchEngine';
import { useToast } from '@/context/ToastContext';
import { ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';

interface MovementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  defaultType?: MovementType;
  preselectedProduct?: Producto | null;
  onSubmit: (data: { productoId: string; tipo: MovementType; cantidad: number; nota?: string }) => Promise<void>;
}

export const MovementFormModal: React.FC<MovementFormModalProps> = ({
  isOpen,
  onClose,
  products,
  defaultType = 'entrada',
  preselectedProduct = null,
  onSubmit,
}) => {
  const { showToast } = useToast();
  const [tipo, setTipo] = useState<MovementType>(defaultType);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(preselectedProduct);
  const [searchProd, setSearchProd] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [nota, setNota] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTipo(defaultType);
    if (preselectedProduct) {
      setSelectedProduct(preselectedProduct);
      setSearchProd(`${preselectedProduct.codigo ? preselectedProduct.codigo + ' - ' : ''}${preselectedProduct.nombre}`);
    } else {
      setSelectedProduct(null);
      setSearchProd('');
    }
    setCantidad(1);
    setNota('');
    setIsDropdownOpen(false);
  }, [defaultType, preselectedProduct, isOpen]);

  const searchResults = useMemo(() => {
    if (!searchProd.trim()) return products.slice(0, 20);
    return SearchEngine.performLocalSearch(products, searchProd, { limit: 20 });
  }, [products, searchProd]);

  const handleSelectProduct = (p: Producto) => {
    setSelectedProduct(p);
    setSearchProd(`${p.codigo ? p.codigo + ' - ' : ''}${p.nombre}`);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      showToast('Seleccioná un producto de la lista', 'warning');
      return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      showToast('Ingresá una cantidad válida mayor a 0', 'warning');
      return;
    }

    if (tipo === 'salida' && (selectedProduct.cantidad || 0) < cantidad) {
      showToast(
        `Stock insuficiente de ${selectedProduct.nombre}. Disponible: ${selectedProduct.cantidad || 0}`,
        'error'
      );
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        productoId: selectedProduct.id,
        tipo,
        cantidad: Number(cantidad),
        nota: nota.trim() || undefined,
      });
      showToast(
        `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cantidad} u. registrada para ${selectedProduct.nombre}`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el movimiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tipo === 'entrada' ? 'Registrar Entrada de Stock' : 'Registrar Salida de Stock'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Selector de Tipo (Entrada / Salida) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              tipo === 'entrada'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Entrada (Sumar)
          </button>
          <button
            type="button"
            onClick={() => setTipo('salida')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              tipo === 'salida'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Salida (Restar)
          </button>
        </div>

        {/* Buscador de producto con autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Producto *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Buscar por nombre o código..."
              value={searchProd}
              onChange={(e) => {
                setSearchProd(e.target.value);
                setSelectedProduct(null);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Menú desplegable */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto z-20 divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No se encontraron productos coincidentes
                </div>
              ) : (
                searchResults.map((p) => {
                  const status = SearchEngine.getStockStatus(p.cantidad, p.stockMinimo);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-slate-800">{p.nombre}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{p.codigo || 'S/C'}</span>
                      </div>
                      <span className={`font-mono font-bold ${status.colorClass}`}>
                        Stock: {p.cantidad ?? 0}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Indicador de producto seleccionado */}
        {selectedProduct && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Stock Disponible en Depósito:</span>
              <strong className="text-sm font-mono text-slate-800">
                {selectedProduct.cantidad ?? 0} unidades
              </strong>
            </div>
            {tipo === 'salida' && (selectedProduct.cantidad ?? 0) <= 0 && (
              <span className="text-red-600 font-semibold">Sin existencias para despachar</span>
            )}
          </div>
        )}

        {/* Cantidad y Nota */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Input
              label="Cantidad *"
              type="number"
              min="1"
              required
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Motivo / Nota (Opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Factura A-0012, Remito, Mostrador..."
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={tipo === 'entrada' ? 'primary' : 'danger'}
            loading={loading}
          >
            {tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

