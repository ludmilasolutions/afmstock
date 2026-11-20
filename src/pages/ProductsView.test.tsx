import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsView } from './ProductsView';
import { Producto } from '@/types/product';

const mockProducts: Producto[] = [
  { id: '1', codigo: 'PROD-0001', nombre: 'Tornillo Phillips 1/2"', cantidad: 100, stockMinimo: 20, categoria: 'Fijaciones' },
  { id: '2', codigo: 'PROD-0002', nombre: 'Destornillador Aislado', cantidad: 2, stockMinimo: 5, categoria: 'Herramientas' }, // Bajo stock
  { id: '3', codigo: 'PROD-0003', nombre: 'Cinta Aisladora Negra', cantidad: 0, stockMinimo: 10, categoria: 'Electricidad' }, // Sin stock
];

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
});
