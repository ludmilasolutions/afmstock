import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovementsView } from './MovementsView';
import { Movimiento } from '@/types/movement';

const mockMovements: Movimiento[] = [
  { id: 'm1', productoId: 'p1', productoNombre: 'Tornillo Phillips', tipo: 'entrada', cantidad: 50, nota: 'Ingreso proveedor' },
  { id: 'm2', productoId: 'p2', productoNombre: 'Destornillador Stanley', tipo: 'salida', cantidad: 2, nota: 'Venta mostrador' },
  { id: 'm3', productoId: 'p3', productoNombre: 'Cinta Aisladora', tipo: 'creacion', cantidad: 10, nota: 'Alta inicial' },
];

describe('MovementsView Component', () => {
  it('renderiza la lista de movimientos con badges correspondientes', () => {
    render(
      <MovementsView
        movements={mockMovements}
        onOpenNewMovement={vi.fn()}
        onRevertMovement={vi.fn()}
      />
    );

    expect(screen.getAllByText('Tornillo Phillips').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Destornillador Stanley').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cinta Aisladora').length).toBeGreaterThan(0);
  });

  it('filtra movimientos por tipo (entradas, salidas, creación)', () => {
    render(
      <MovementsView
        movements={mockMovements}
        onOpenNewMovement={vi.fn()}
        onRevertMovement={vi.fn()}
      />
    );

    const salidasBtn = screen.getByRole('button', { name: /^Salidas$/i });
    fireEvent.click(salidasBtn);

    expect(screen.getAllByText('Destornillador Stanley').length).toBeGreaterThan(0);
    expect(screen.queryByText('Tornillo Phillips')).not.toBeInTheDocument();
  });

  it('llama a onRevertMovement al hacer clic en Revertir', () => {
    const handleRevert = vi.fn();
    render(
      <MovementsView
        movements={mockMovements}
        onOpenNewMovement={vi.fn()}
        onRevertMovement={handleRevert}
      />
    );

    const revertBtns = screen.getAllByTitle(/Revertir/i);
    expect(revertBtns.length).toBeGreaterThan(0);
    fireEvent.click(revertBtns[0]);

    expect(handleRevert).toHaveBeenCalledWith(mockMovements[0]);
  });
});
