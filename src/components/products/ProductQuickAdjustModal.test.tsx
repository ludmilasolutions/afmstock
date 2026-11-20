import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductQuickAdjustModal } from './ProductQuickAdjustModal';
import { ToastProvider } from '@/context/ToastContext';
import { Producto } from '@/types/product';

const mockProduct: Producto = {
  id: 'prod_99',
  codigo: 'PROD-0099',
  nombre: 'Tubo Fluorescente 36W',
  cantidad: 15,
  stockMinimo: 5,
};

describe('ProductQuickAdjustModal Component', () => {
  it('inicializa con el stock actual y calcula la diferencia dinámica', () => {
    render(
      <ToastProvider>
        <ProductQuickAdjustModal
          product={mockProduct}
          isOpen={true}
          onClose={vi.fn()}
          onAdjust={vi.fn()}
        />
      </ToastProvider>
    );

    const input = screen.getByLabelText(/Nuevo Stock Real en Depósito/i);
    expect(input).toHaveValue(15);

    // Cambiar a 20 (+5)
    fireEvent.change(input, { target: { value: '20' } });
    expect(screen.getByText('+5 unidades')).toBeInTheDocument();

    // Cambiar a 10 (-5)
    fireEvent.change(input, { target: { value: '10' } });
    expect(screen.getByText('-5 unidades')).toBeInTheDocument();
  });

  it('ejecuta onAdjust con la nueva cantidad y motivo', async () => {
    const handleAdjust = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();
    render(
      <ToastProvider>
        <ProductQuickAdjustModal
          product={mockProduct}
          isOpen={true}
          onClose={handleClose}
          onAdjust={handleAdjust}
        />
      </ToastProvider>
    );

    const input = screen.getByLabelText(/Nuevo Stock Real en Depósito/i);
    fireEvent.change(input, { target: { value: '25' } });

    const motivoInput = screen.getByPlaceholderText(/Conteo físico/i);
    fireEvent.change(motivoInput, { target: { value: 'Inventario de fin de mes' } });

    const submitBtn = screen.getByRole('button', { name: /Confirmar Ajuste/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleAdjust).toHaveBeenCalledWith('prod_99', 25, 'Inventario de fin de mes');
    });

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
