import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsView } from './ProductsView';
import { Producto } from '@/types/product';

const mockProducts: Producto[] = [
  { id: '1', codigo: 'PROD-0001', nombre: 'Tornillo Phillips 1/2"', cantidad: 100, stockMinimo: 20, categoria: 'Fijaciones' },
  { id: '2', codigo: 'PROD-0002', nombre: 'Destornillador Aislado', cantidad: 2, stockMinimo: 5, categoria: 'Herramientas' }, // Bajo stock
  { id: '3', codigo: 'PROD-0003', nombre: 'Cinta Aisladora Negra', cantidad: 0, stockMinimo: 10, categoria: 'Electricidad' }, // Sin stock
];

// Generador de catálogo sintético con N productos para pruebas de escalabilidad
function generateCatalog(count: number): Producto[] {
  const list: Producto[] = [];
  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(4, '0');
    list.push({
      id: `id_${i}`,
      codigo: `PROD-${pad}`,
      nombre: i === 550 ? 'Válvula Esférica Especial 1/2" con Caño' : `Artículo Genérico ${pad}`,
      cantidad: i % 10 === 0 ? 0 : i % 5 === 0 ? 3 : 25,
      stockMinimo: 5,
      categoria: i === 550 ? 'Plomería' : i % 2 === 0 ? 'Fijaciones' : 'Herramientas',
      marca: i === 550 ? 'Latyn' : 'Genérico',
    });
  }
  return list;
}

describe('ProductsView Component', () => {
  it('renderiza la lista de productos y el contador correctamente', () => {
    render(
      <ProductsView
        products={mockProducts}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    expect(screen.getByText('Mostrando 3 productos')).toBeInTheDocument();
    expect(screen.getAllByText(/Tornillo Phillips/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Destornillador Aislado/i).length).toBeGreaterThan(0);
  });

  it('filtra productos por texto de búsqueda dinámico', () => {
    render(
      <ProductsView
        products={mockProducts}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, código/i);
    fireEvent.change(searchInput, { target: { value: 'cinta' } });

    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText('PROD-0003').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tornillo Phillips/i)).not.toBeInTheDocument();
  });

  it('filtra por nivel de stock: Stock Bajo y Sin Stock', () => {
    render(
      <ProductsView
        products={mockProducts}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    // Click en botón "Stock Bajo"
    const lowStockBtn = screen.getByRole('button', { name: /Stock Bajo/i });
    fireEvent.click(lowStockBtn);

    // Destornillador (2 u. < 5 mín) y Cinta (0 u. < 10 mín)
    expect(screen.getByText('Mostrando 2 productos')).toBeInTheDocument();

    // Click en botón "Sin Stock"
    const criticalBtn = screen.getByRole('button', { name: /Sin Stock/i });
    fireEvent.click(criticalBtn);

    // Solo Cinta (0 u.)
    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText(/Cinta Aisladora/i).length).toBeGreaterThan(0);
  });

  it('muestra estado vacío cuando no hay coincidencias', () => {
    render(
      <ProductsView
        products={mockProducts}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, código/i);
    fireEvent.change(searchInput, { target: { value: 'articulo_inexistente_999' } });

    expect(screen.getByText('No se encontraron artículos')).toBeInTheDocument();
  });

  // PRUEBAS OBLIGATORIAS FASE 2: Catálogo con más de 500 productos y acceso sin límites
  it('soporta catálogo de más de 500 productos y encuentra un producto ubicado en posición 550 por nombre', () => {
    const catalog650 = generateCatalog(650);

    render(
      <ProductsView
        products={catalog650}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    expect(screen.getByText('Mostrando 650 productos')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, código/i);
    fireEvent.change(searchInput, { target: { value: 'Válvula Esférica' } });

    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText('PROD-0550').length).toBeGreaterThan(0);
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el?.textContent?.includes('Válvula Esférica Especial') ?? false))).toBeInTheDocument();
  });

  it('encuentra el producto en posición 550 buscando por su código exacto PROD-0550', () => {
    const catalog650 = generateCatalog(650);

    render(
      <ProductsView
        products={catalog650}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, código/i);
    fireEvent.change(searchInput, { target: { value: 'PROD-0550' } });

    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText('PROD-0550').length).toBeGreaterThan(0);
  });

  it('encuentra el producto en posición 550 buscando con tildes, ñ y minúsculas', () => {
    const catalog650 = generateCatalog(650);

    render(
      <ProductsView
        products={catalog650}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    // Buscar "valvula cano" sin tildes ni ñ debe encontrar "Válvula Esférica Especial 1/2" con Caño"
    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, código/i);
    fireEvent.change(searchInput, { target: { value: 'valvula cano' } });

    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText('PROD-0550').length).toBeGreaterThan(0);
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && (el?.textContent?.includes('Válvula Esférica Especial') ?? false))).toBeInTheDocument();
  });

  it('encuentra el producto en posición 550 filtrando por su categoría Plomería', () => {
    const catalog650 = generateCatalog(650);

    render(
      <ProductsView
        products={catalog650}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onAdjustProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onViewHistory={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    const categoryBtn = screen.getByRole('button', { name: /^Plomería$/i });
    fireEvent.click(categoryBtn);

    expect(screen.getByText('Mostrando 1 producto')).toBeInTheDocument();
    expect(screen.getAllByText('PROD-0550').length).toBeGreaterThan(0);
  });
});
