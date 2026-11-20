import { describe, it, expect } from 'vitest';
import { mapDocToMovimiento } from './movementsService';
import { Movimiento } from '@/types/movement';

describe('MovementsService - Lógica y Mapeo Adaptativo', () => {
  it('mapea correctamente un documento de movimiento estándar', () => {
    const rawMov = {
      productoId: 'prod_456',
      productoNombre: 'Arandela Plana 3/8',
      tipo: 'entrada',
      cantidad: 50,
      nota: 'Compra mayorista',
      usuario: 'operario@stockafm.com',
      fecha: { seconds: 1700000000 },
    };

    const mov = mapDocToMovimiento('mov_1', rawMov);
    expect(mov.id).toBe('mov_1');
    expect(mov.productoId).toBe('prod_456');
    expect(mov.productoNombre).toBe('Arandela Plana 3/8');
    expect(mov.tipo).toBe('entrada');
    expect(mov.cantidad).toBe(50);
    expect(mov.nota).toBe('Compra mayorista');
    expect(mov.usuario).toBe('operario@stockafm.com');
  });

  it('tolera movimientos incompletos o con datos faltantes', () => {
    const brokenMov = {
      productoId: undefined,
      tipo: undefined,
      cantidad: '10',
    };

    const mov = mapDocToMovimiento('mov_broken', brokenMov);
    expect(mov.id).toBe('mov_broken');
    expect(mov.productoId).toBe('');
    expect(mov.productoNombre).toBe('Desconocido');
    expect(mov.tipo).toBe('entrada'); // default
    expect(mov.cantidad).toBe(10);
    expect(mov.nota).toBeUndefined();
  });

  it('valida reglas de negocio para cálculo de reversión de stock', () => {
    // Simulación de regla de reversión de Entrada:
    // Si se revierte una entrada de 10 unidades, debe restarse 10 al stock actual.
    // Si el stock actual es 5, debe lanzar error por prevención de stock negativo.
    const movEntrada: Movimiento = {
      id: 'm1',
      productoId: 'p1',
      productoNombre: 'Pintura',
      tipo: 'entrada',
      cantidad: 10,
    };

    const revertirEntrada = (stockActual: number, cantidadARevertir: number) => {
      if (stockActual < cantidadARevertir) {
        throw new Error('Stock insuficiente: revertirlo dejaría el inventario en negativo.');
      }
      return stockActual - cantidadARevertir;
    };

    // Caso exitoso
    expect(revertirEntrada(15, movEntrada.cantidad)).toBe(5);

    // Caso de bloqueo por prevención de stock negativo
    expect(() => revertirEntrada(5, movEntrada.cantidad)).toThrow('Stock insuficiente');

    // Simulación de regla de reversión de Salida:
    // Si se revierte una salida de 8 unidades, debe devolverse 8 unidades al stock.
    const revertirSalida = (stockActual: number, cantidadARevertir: number) => {
      return stockActual + cantidadARevertir;
    };
    expect(revertirSalida(2, 8)).toBe(10);
  });
});
