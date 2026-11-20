import { describe, it, expect } from 'vitest';
import { SearchEngine } from './searchEngine';
import { Producto } from '@/types/product';

const mockProductos: Producto[] = [
  { id: '1', codigo: 'PROD-0001', nombre: 'Tornillo Phillips 1/2"', cantidad: 100, stockMinimo: 20, categoria: 'Fijaciones', marca: 'Bulonera' },
  { id: '2', codigo: 'PROD-0002', nombre: 'Tornillo Autoperforante T1', cantidad: 10, stockMinimo: 15, categoria: 'Fijaciones', marca: 'Bulonera' },
  { id: '3', codigo: 'PROD-0003', nombre: 'Destornillador Aislado 1000V', cantidad: 0, stockMinimo: 5, categoria: 'Herramientas', marca: 'Stanley' },
  { id: '4', codigo: 'PROD-0004', nombre: 'Caño Termofusión 20mm', cantidad: 45, stockMinimo: 10, categoria: 'Plomería', marca: 'Tigre' },
  { id: '5', codigo: 'PROD-0005', nombre: 'Cinta Aisladora 20m Negra', cantidad: 4, stockMinimo: 10, categoria: 'Electricidad', marca: '3M' },
  { id: '6', codigo: 'PROD-0006', nombre: 'Cinta Métrica 5m', cantidad: 12, stockMinimo: 3, categoria: 'Herramientas', marca: 'Stanley' },
  { id: '7', codigo: 'PROD-0007', nombre: 'Pintura Látex Interior 20L', cantidad: 2, stockMinimo: 5, categoria: 'Pinturas', marca: 'Alba' },
  { id: '8', codigo: 'PROD-0008', nombre: 'Martillo Galponero Acero', cantidad: 8, stockMinimo: 2, categoria: 'Herramientas', marca: 'Stanley' },
];

describe('SearchEngine Tests', () => {
  it('normaliza texto quitando acentos y mayúsculas correctamente', () => {
    expect(SearchEngine.normalizeText('TORNILLO CAÑO ÍNDICE ÁRBOL ÚTIL')).toBe('tornillo cano indice arbol util');
    expect(SearchEngine.normalizeText('Cinta métrica')).toBe('cinta metrica');
  });

  it('busca por coincidencia exacta de código', () => {
    const results = SearchEngine.performLocalSearch(mockProductos, 'PROD-0003');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('3');
    expect(results[0].nombre).toContain('Destornillador');
  });

  it('busca insensible a mayúsculas y minúsculas', () => {
    const r1 = SearchEngine.performLocalSearch(mockProductos, 'destornillador');
    const r2 = SearchEngine.performLocalSearch(mockProductos, 'DESTORNILLADOR');
    expect(r1[0].id).toBe(r2[0].id);
  });

  it('busca insensible a acentos y tildes (caño, termofusión)', () => {
    const r1 = SearchEngine.performLocalSearch(mockProductos, 'termofusion');
    expect(r1.length).toBe(1);
    expect(r1[0].nombre).toBe('Caño Termofusión 20mm');

    const r2 = SearchEngine.performLocalSearch(mockProductos, 'cano');
    expect(r2.length).toBe(1);
    expect(r2[0].nombre).toContain('Caño');
  });

  it('soporta búsquedas con múltiples palabras en cualquier orden', () => {
    const results = SearchEngine.performLocalSearch(mockProductos, 'aisladora 20m cinta');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('5');
  });

  it('calcula correctamente el estado de stock', () => {
    expect(SearchEngine.getStockStatus(0, 5).level).toBe('critical');
    expect(SearchEngine.getStockStatus(4, 10).level).toBe('low');
    expect(SearchEngine.getStockStatus(15, 10).level).toBe('ok');
    expect(SearchEngine.getStockStatus(null, 5).level).toBe('critical');
  });

  it('devuelve todos los productos ordenados alfabéticamente si la query está vacía', () => {
    const results = SearchEngine.performLocalSearch(mockProductos, '');
    expect(results.length).toBe(mockProductos.length);
    expect(results[0].nombre.localeCompare(results[1].nombre)).toBeLessThanOrEqual(0);
  });

  it('retorna arreglo vacío si ningún producto coincide', () => {
    const results = SearchEngine.performLocalSearch(mockProductos, 'producto_totalmente_inexistente_xyz');
    expect(results.length).toBe(0);
  });

  // PRUEBAS DE FASE 2: Comportamiento con más de 500 productos y sin truncamiento involuntario
  it('devuelve más de 500 productos coincidentes si no se pasa limit', () => {
    const bigCatalog: Producto[] = [];
    for (let i = 1; i <= 600; i++) {
      bigCatalog.push({
        id: `p_${i}`,
        codigo: `PROD-${i}`,
        nombre: `Arandela Galvanizada Nº ${i}`,
        cantidad: 10,
        stockMinimo: 5,
      });
    }

    const results = SearchEngine.performLocalSearch(bigCatalog, 'Arandela');
    expect(results.length).toBe(600);
  });

  it('encuentra producto ubicado en la posición 580 con tolerancia tipográfica (Levenshtein)', () => {
    const bigCatalog: Producto[] = [];
    for (let i = 1; i <= 600; i++) {
      bigCatalog.push({
        id: `p_${i}`,
        codigo: `PROD-${i}`,
        nombre: i === 580 ? 'Serrucho Costillero Profesional' : `Bulón Hexagonal ${i}`,
        cantidad: 10,
        stockMinimo: 5,
      });
    }

    // "serucho" tiene distancia 1 respecto a "serrucho"
    const results = SearchEngine.performLocalSearch(bigCatalog, 'serucho');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('p_580');
    expect(results[0].nombre).toBe('Serrucho Costillero Profesional');
  });

  it('respeta options.limit cuando se proporciona explícitamente', () => {
    const bigCatalog: Producto[] = [];
    for (let i = 1; i <= 100; i++) {
      bigCatalog.push({
        id: `p_${i}`,
        codigo: `PROD-${i}`,
        nombre: `Perno Roscado ${i}`,
        cantidad: 5,
        stockMinimo: 2,
      });
    }

    const results = SearchEngine.performLocalSearch(bigCatalog, 'Perno', { limit: 15 });
    expect(results.length).toBe(15);
  });
});
