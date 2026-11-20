import { describe, it, expect } from 'vitest';
import { mapDocToProducto } from './productsService';

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
