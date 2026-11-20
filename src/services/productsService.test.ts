import { describe, it, expect, vi } from 'vitest';
import { mapDocToProducto, adjustProductStock } from './productsService';
import * as firestoreModule from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof firestoreModule>('firebase/firestore');
  return {
    ...actual,
    serverTimestamp: () => ({ seconds: 1234567890 }),
    doc: vi.fn((_db, col, id) => ({ _path: `${col}/${id}`, id })),
    collection: vi.fn((_db, col) => ({ _path: col })),
    runTransaction: vi.fn(),
  };
});

describe('ProductsService - Compatibilidad y Adaptación de Datos Heterogéneos', () => {
  it('mapea correctamente un documento completo', () => {
    const rawData = {
      codigo: 'PROD-0010',
      nombre: 'Pintura Epoxi Gris',
      cantidad: 25,
      stockMinimo: 8,
      categoria: 'Pinturas',
      ubicacion: 'Sector C',
      marca: 'Sinteplast',
      proveedor: 'Distribuidora Norte',
      notas: 'Secado rápido',
    };

    const producto = mapDocToProducto('doc_123', rawData);
    expect(producto.id).toBe('doc_123');
    expect(producto.codigo).toBe('PROD-0010');
    expect(producto.nombre).toBe('Pintura Epoxi Gris');
    expect(producto.cantidad).toBe(25);
    expect(producto.stockMinimo).toBe(8);
    expect(producto.categoria).toBe('Pinturas');
    expect(producto.ubicacion).toBe('Sector C');
    expect(producto.marca).toBe('Sinteplast');
  });

  it('soporta documentos antiguos con campos nulos o faltantes (resiliencia)', () => {
    const legacyDoc = {
      // Falta codigo, categoria, ubicacion, etc.
      nombre: null,
      cantidad: null,
      stockMinimo: undefined,
    };

    const producto = mapDocToProducto('legacy_1', legacyDoc);
    expect(producto.id).toBe('legacy_1');
    expect(producto.nombre).toBe('Sin nombre');
    expect(producto.cantidad).toBe(0);
    expect(producto.stockMinimo).toBe(5); // Default seguro
    expect(producto.codigo).toBe('');
    expect(producto.ubicacion).toBeUndefined();
  });

  it('soporta campos legacy como sku o codigo_barra si codigo no está presente', () => {
    const legacyDocWithSku = {
      sku: 'SKU-9988',
      nombre: 'Lija al agua grano 180',
      cantidad: '15', // string numérico
      stockMinimo: '3',
    };

    const producto = mapDocToProducto('legacy_sku', legacyDocWithSku);
    expect(producto.codigo).toBe('SKU-9988');
    expect(producto.cantidad).toBe(15);
    expect(producto.stockMinimo).toBe(3);
  });

  it('convierte cantidades NaN o inválidas a 0 de forma segura', () => {
    const corruptDoc = {
      nombre: 'Producto con cantidad corrupta',
      cantidad: 'no-es-un-numero',
      stockMinimo: -10,
    };

    const producto = mapDocToProducto('corrupt_1', corruptDoc);
    expect(producto.cantidad).toBe(0);
    expect(producto.stockMinimo).toBe(-10);
  });
});

describe('ProductsService - Ajuste Atómico de Stock (adjustProductStock)', () => {
  const mockDb = {} as any;

  it('valida que la cantidad no sea negativa ni NaN', async () => {
    await expect(
      adjustProductStock('prod_1', -5, 'Motivo', 'test@test.com', mockDb)
    ).rejects.toThrow('La cantidad de stock debe ser un número mayor o igual a 0.');

    await expect(
      adjustProductStock('prod_1', NaN, 'Motivo', 'test@test.com', mockDb)
    ).rejects.toThrow('La cantidad de stock debe ser un número mayor o igual a 0.');
  });

  it('falla si el producto no existe en la base de datos', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({ exists: () => false }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.mocked(firestoreModule.runTransaction).mockImplementationOnce(async (_db, callback: any) => {
      return callback(mockTransaction);
    });

    await expect(
      adjustProductStock('prod_inexistente', 10, 'Ajuste', 'test@test.com', mockDb)
    ).rejects.toThrow('El producto no existe.');
  });

  it('ajusta stock hacia arriba y genera movimiento de entrada transaccional', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ nombre: 'Pintura Epoxi', cantidad: 10 }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.mocked(firestoreModule.runTransaction).mockImplementationOnce(async (_db, callback: any) => {
      return callback(mockTransaction);
    });

    await adjustProductStock('prod_1', 15, 'Conteo físico', 'operador@test.com', mockDb);

    // 1. Debe actualizar el documento del producto
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cantidad: 15,
        usuarioEdicion: 'operador@test.com',
      })
    );

    // 2. Debe registrar historial y movimiento de entrada
    expect(mockTransaction.set).toHaveBeenCalledTimes(2);

    // Verificación de historial de auditoría
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productoId: 'prod_1',
        tipo: 'ajuste',
        cantidadAnterior: 10,
        cantidadNueva: 15,
        motivo: 'Conteo físico',
        usuario: 'operador@test.com',
      })
    );

    // Verificación de movimiento de entrada
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productoId: 'prod_1',
        tipo: 'entrada',
        cantidad: 5,
        usuario: 'operador@test.com',
      })
    );
  });

  it('ajusta stock hacia abajo y genera movimiento de salida transaccional', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ nombre: 'Pintura Epoxi', cantidad: 20 }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.mocked(firestoreModule.runTransaction).mockImplementationOnce(async (_db, callback: any) => {
      return callback(mockTransaction);
    });

    await adjustProductStock('prod_1', 12, 'Rotura de lata', 'operador@test.com', mockDb);

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cantidad: 12,
      })
    );

    // Movimiento de salida por 8 unidades
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productoId: 'prod_1',
        tipo: 'salida',
        cantidad: 8,
      })
    );
  });

  it('no genera documento de movimiento si la cantidad no cambia (diff === 0)', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ nombre: 'Pintura Epoxi', cantidad: 10 }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    vi.mocked(firestoreModule.runTransaction).mockImplementationOnce(async (_db, callback: any) => {
      return callback(mockTransaction);
    });

    await adjustProductStock('prod_1', 10, 'Confirmación de stock', 'operador@test.com', mockDb);

    // Debe actualizar fecha de edición y registrar en historial
    expect(mockTransaction.update).toHaveBeenCalledTimes(1);
    expect(mockTransaction.set).toHaveBeenCalledTimes(1); // Solo historial, no movimiento
  });
});

