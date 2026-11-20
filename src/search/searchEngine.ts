import React from 'react';
import { Producto, StockStatus } from '@/types/product';

export const SearchEngine = {
  /**
   * Normaliza un texto removiendo acentos y pasando a minúsculas
   */
  normalizeText(str: string | null | undefined): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  /**
   * Distancia de Levenshtein para tolerancia a errores tipográficos
   */
  levenshtein(a: string, b: string): number {
    if (!a || !b) return (a || b || '').length;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  /**
   * Búsqueda sobre colección en memoria con ponderación de relevancia.
   * Si no se especifica `options.limit`, devuelve TODOS los productos coincidentes sin truncamiento.
   */
  performLocalSearch(items: Producto[], query: string, options: { limit?: number } = {}): Producto[] {
    const { limit } = options;

    if (!query || query.trim() === '') {
      const sorted = [...items].sort((a, b) =>
        (a.nombre || '').trim().localeCompare((b.nombre || '').trim(), 'es', { sensitivity: 'base' })
      );
      return (typeof limit === 'number' && limit > 0) ? sorted.slice(0, limit) : sorted;
    }

    const term = query.trim().toLowerCase();
    const termNorm = this.normalizeText(term);
    const keywords = term.split(/\s+/).filter((k) => k.length > 0);
    const keywordsNorm = keywords.map((k) => this.normalizeText(k));

    if (keywords.length === 0) return items;

    const scoredResults: { item: Producto; score: number }[] = [];

    for (const prod of items) {
      let score = 0;
      const nombre = (prod.nombre || '').toLowerCase();
      const sku = (prod.codigo || prod.sku || '').toLowerCase();
      const cb = (prod.codigo_barra || prod.codigo || '').toLowerCase();
      const brand = (prod.marca || '').toLowerCase();
      const cat = (prod.categoria || '').toLowerCase();

      const searchString = `${nombre} ${sku} ${cb} ${brand} ${cat}`;
      const searchStringNorm = this.normalizeText(searchString);
      const searchStringCollapsed = searchString.replace(/\s+/g, '');
      const searchStringCollapsedNorm = searchStringNorm.replace(/\s+/g, '');

      // Todos los términos de búsqueda deben coincidir en algún campo
      const containsAll = keywords.every((kw, idx) => {
        const kwLower = kw.toLowerCase();
        const kwNorm = keywordsNorm[idx];

        if (searchString.includes(kwLower) || searchStringNorm.includes(kwNorm)) return true;
        if (searchStringCollapsed.includes(kwLower) || searchStringCollapsedNorm.includes(kwNorm)) return true;

        if (kwLower.length > 4 || kwNorm.length > 4) {
          const words = nombre.split(/\s+/);
          return words.some((w) => this.levenshtein(kwNorm, this.normalizeText(w)) <= 1);
        }
        return false;
      });

      if (!containsAll) continue;

      // Exact match boosts
      if (sku === term || cb === term || this.normalizeText(sku) === termNorm) score += 5000;
      if (nombre === term || this.normalizeText(nombre) === termNorm) score += 2000;

      keywords.forEach((kw, idx) => {
        const kwLower = kw.toLowerCase();
        const kwNorm = keywordsNorm[idx];

        if (sku.includes(kwLower) || this.normalizeText(sku).includes(kwNorm)) score += 500;
        if (cb.includes(kwLower) || this.normalizeText(cb).includes(kwNorm)) score += 400;

        const nombreNorm = this.normalizeText(nombre);
        if (nombre.startsWith(kwLower) || nombreNorm.startsWith(kwNorm)) score += 300;
        else if (nombre.includes(kwLower) || nombreNorm.includes(kwNorm)) score += 100;

        if (brand.includes(kwLower) || this.normalizeText(brand).includes(kwNorm)) score += 50;

        if (
          (searchStringCollapsed.includes(kwLower) || searchStringCollapsedNorm.includes(kwNorm)) &&
          !searchString.includes(kwLower) &&
          !searchStringNorm.includes(kwNorm)
        ) {
          score += 80;
        }

        if (kwNorm.length > 3) {
          const wordsInName = nombre.split(/\s+/);
          wordsInName.forEach((w) => {
            const distance = this.levenshtein(kwNorm, this.normalizeText(w));
            if (distance === 1) score += 80;
            else if (distance === 2 && kwNorm.length > 5) score += 30;
          });
        }
      });

      if ((prod.cantidad || 0) > 0) score += 10;

      scoredResults.push({ item: prod, score });
    }

    // Ordenar por relevancia decreciente
    scoredResults.sort((a, b) => b.score - a.score);

    // Si limit está definido y es positivo, recortar; si no, retornar todos los resultados coincidentes
    const topResults = (typeof limit === 'number' && limit > 0)
      ? scoredResults.slice(0, limit).map((s) => s.item)
      : scoredResults.map((s) => s.item);

    return topResults;
  },

  /**
   * Resalta palabras clave devolviendo React Nodes seguros (inmune a XSS)
   */
  highlightReact(text: string | null | undefined, query: string, highlightClass = 'bg-amber-100 text-amber-900 font-semibold px-0.5 rounded'): React.ReactNode {
    if (!text) return '';
    if (!query || !query.trim()) return text;

    const keywords = query
      .trim()
      .split(/\s+/)
      .filter((k) => k.length > 0)
      .sort((a, b) => b.length - a.length);

    if (keywords.length === 0) return text;

    const accentMap: Record<string, string> = {
      a: '[aáàäâ]',
      e: '[eéèëê]',
      i: '[iíìïî]',
      o: '[oóòöô]',
      u: '[uúùüû]',
      n: '[nñ]',
      á: '[aáàäâ]',
      é: '[eéèëê]',
      í: '[iíìïî]',
      ó: '[oóòöô]',
      ú: '[uúùüû]',
      ñ: '[nñ]',
    };

    const patternParts = keywords.map((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped
        .split('')
        .map((char) => {
          const lower = char.toLowerCase();
          return accentMap[lower] || char;
        })
        .join('');
    });

    const regex = new RegExp(`(${patternParts.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (regex.test(part)) {
        return React.createElement('mark', { key: i, className: highlightClass }, part);
      }
      return part;
    });
  },

  /**
   * Determina el estado del stock según la cantidad y el mínimo configurado
   */
  getStockStatus(cantidad: number | undefined | null, stockMinimo: number = 5): StockStatus {
    const cant = typeof cantidad === 'number' ? cantidad : Number(cantidad) || 0;
    const min = typeof stockMinimo === 'number' ? stockMinimo : Number(stockMinimo) || 5;

    if (cant <= 0) {
      return {
        level: 'critical',
        label: 'Sin Stock',
        colorClass: 'text-red-600',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    if (cant < min) {
      return {
        level: 'low',
        label: 'Stock Bajo',
        colorClass: 'text-amber-600',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      level: 'ok',
      label: 'Disponible',
      colorClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  },
};
