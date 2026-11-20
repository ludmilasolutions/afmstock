import React, { useState, useMemo } from 'react';
import { Producto } from '@/types/product';
import { SearchEngine } from '@/search/searchEngine';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/common/Button';
import { Search, Plus, Download, X } from 'lucide-react';

interface ProductsViewProps {
  products: Producto[];
  initialCategory?: string;
  initialStockFilter?: 'all' | 'low' | 'critical';
  onAddProduct: () => void;
  onEditProduct: (p: Producto) => void;
  onAdjustProduct: (p: Producto) => void;
  onDeleteProduct: (p: Producto) => void;
  onViewHistory: (p: Producto) => void;
  onViewDetail: (p: Producto) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  initialCategory = '',
  initialStockFilter = 'all',
  onAddProduct,
  onEditProduct,
  onAdjustProduct,
  onDeleteProduct,
  onViewHistory,
  onViewDetail,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'critical'>(initialStockFilter);
  const [sortField, setSortField] = useState<'nombre' | 'cantidad' | 'codigo'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Categorías únicas ordenadas alfabéticamente
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria && p.categoria.trim()) set.add(p.categoria.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  // Filtrado y búsqueda íntegra sin límites artificiales
  const filteredProducts = useMemo(() => {
    let result = products;

    // 1. Filtro por categoría (se aplica primero para acotar el universo)
    if (selectedCategory) {
      result = result.filter((p) => p.categoria === selectedCategory);
    }

    // 2. Filtro por nivel de stock
    if (stockFilter === 'low') {
      result = result.filter((p) => (p.cantidad || 0) < (p.stockMinimo || 5));
    } else if (stockFilter === 'critical') {
      result = result.filter((p) => (p.cantidad || 0) <= 0);
    }

    // 3. Filtro por búsqueda de texto ponderada (sin límite artificial: garantiza accesibilidad total de cualquier producto del catálogo)
    if (search.trim()) {
      result = SearchEngine.performLocalSearch(result, search);
    } else {
      // Ordenamiento manual si no hay búsqueda activa (si hay búsqueda, SearchEngine ya calculó relevancia por score)
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'nombre') {
          cmp = (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
        } else if (sortField === 'cantidad') {
          cmp = (a.cantidad || 0) - (b.cantidad || 0);
        } else if (sortField === 'codigo') {
          cmp = (a.codigo || '').localeCompare(b.codigo || '', 'es');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [products, search, selectedCategory, stockFilter, sortField, sortOrder]);

  const handleSort = (field: 'nombre' | 'cantidad' | 'codigo') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // H-UX-06: Formato de fecha con zona horaria de Buenos Aires para el archivo CSV
  const exportToCSV = () => {
    if (products.length === 0) return;
    let csv = 'Código,Nombre,Cantidad,Stock Mínimo,Ubicación,Marca,Categoría,Estado\n';
    products.forEach((p) => {
      const estado = (p.cantidad || 0) < (p.stockMinimo || 5) ? 'Bajo Stock' : 'OK';
      csv += `"${p.codigo || ''}","${(p.nombre || '').replace(/"/g, '""')}",${p.cantidad || 0},${p.stockMinimo || 5},"${p.ubicacion || ''}","${p.marca || ''}","${p.categoria || ''}","${estado}"\n`;
    });

    const nowBsAs = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date());

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_${nowBsAs}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Búsqueda y Botón Nuevo */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código, marca..."
            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-3 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            icon={<Download className="w-4 h-4" />}
            title="Exportar inventario completo a CSV"
            aria-label="Exportar inventario completo a CSV"
          >
            Exportar
          </Button>

          <Button
            onClick={onAddProduct}
            icon={<Plus className="w-4 h-4" />}
            aria-label="Crear nuevo producto"
          >
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filtros rápidos: Estado de stock y Categorías con H-UX-02 scroll hint & H-UX-03 toggle */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pr-8">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              Stock Bajo
            </button>
            <button
              onClick={() => setStockFilter('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                stockFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Sin Stock
            </button>

            {categories.length > 0 && <span className="text-slate-300 font-light select-none">|</span>}

            {/* H-UX-03: Botón para resetear categoría cuando hay una seleccionada */}
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory('')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Quitar filtro de categoría"
              >
                <span>Todas las categorías</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* H-UX-02: Gradiente sutil indicador de scroll horizontal */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#F5F6FC] to-transparent" />
        </div>

        {/* H-A11Y-05: Contador de productos con aria-live="polite" */}
        <div
          className="text-xs text-slate-500 font-semibold px-1"
          aria-live="polite"
          aria-atomic="true"
        >
          Mostrando {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Resultados: Tabla en Desktop y Cards en Móvil */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-200 text-center flex flex-col items-center gap-2">
          <Search className="w-8 h-8 text-slate-300" />
          <h4 className="text-sm font-semibold text-slate-800">No se encontraron artículos</h4>
          <p className="text-xs text-slate-500 font-medium">
            Probá ajustando los términos de búsqueda o limpiando los filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <ProductTable
              products={filteredProducts}
              searchQuery={search}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onAdjust={onAdjustProduct}
              onEdit={onEditProduct}
              onDelete={onDeleteProduct}
              onViewHistory={onViewHistory}
              onViewDetail={onViewDetail}
            />
          </div>

          <div className="sm:hidden flex flex-col gap-2.5">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                searchQuery={search}
                onAdjust={onAdjustProduct}
                onEdit={onEditProduct}
                onDelete={onDeleteProduct}
                onViewHistory={onViewHistory}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
