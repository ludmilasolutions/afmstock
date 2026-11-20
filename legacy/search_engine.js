/**
 * AFM POS - Unified Search Engine v1.1
 * Centralizes search logic for Desktop and Mobile
 */

window.SearchEngine = {
    /**
     * Normaliza un texto removiendo acentos y pasando a minúsculas
     */
    normalizeText: function(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    },

    /**
     * Escapa caracteres especiales de HTML para prevenir XSS y roturas de diseño
     */
    escapeHTML: function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Resalta palabras clave en un texto de forma segura con soporte para acentos
     */
    highlightText: function(text, keywords, className = 'search-highlight', tagName = 'mark') {
        if (!text || !keywords || keywords.length === 0) {
            return this.escapeHTML(text || '');
        }

        // Limpiar y normalizar palabras clave
        const validKeywords = keywords
            .map(kw => kw.trim())
            .filter(kw => kw.length > 0)
            .sort((a, b) => b.length - a.length);

        if (validKeywords.length === 0) return this.escapeHTML(text);

        // Convertir cada carácter a un grupo regex que soporte variantes con/sin acento
        const accentMap = {
            'a': '[aáàäâ]', 'e': '[eéèëê]', 'i': '[iíìïî]', 'o': '[oóòöô]', 'u': '[uúùüû]',
            'n': '[nñ]',
            'á': '[aáàäâ]', 'é': '[eéèëê]', 'í': '[iíìïî]', 'ó': '[oóòöô]', 'ú': '[uúùüû]',
            'ñ': '[nñ]'
        };

        const patternParts = validKeywords.map(kw => {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return escaped.split('').map(char => {
                const lower = char.toLowerCase();
                return accentMap[lower] || char;
            }).join('');
        });

        const regex = new RegExp(`(${patternParts.join('|')})`, 'gi');

        // Escapar el texto original primero
        const safeText = this.escapeHTML(text);

        const attrName = (className.includes(';') || (className.includes(':') && !className.includes('text-') && !className.includes('bg-') && !className.includes('dark:')))
            ? 'style'
            : 'class';

        return safeText.replace(regex, `<${tagName} ${attrName}="${className}">$1</${tagName}>`);
    },

    highlightTerms: function(text, query, className) {
        if (!query || !query.trim()) return this.escapeHTML(text || '');
        const keywords = query.trim().split(/\s+/).filter(kw => kw.length > 0);
        return this.highlightText(text, keywords, className);
    },

    /**
     * Realiza búsqueda sobre un array local de productos
     */
    performLocalSearch(items, query, options = {}) {
        const {
            limit = 50,
            solo_activos = true
        } = options;

        if (!query || query.trim() === '') return items;

        const term = query.trim().toLowerCase();
        const termNorm = this.normalizeText(term);
        const keywords = term.split(/\s+/).filter(k => k.length > 0);
        const keywordsNorm = keywords.map(k => this.normalizeText(k));

        if (keywords.length === 0) return items;

        const scoredResults = items.map(prod => {
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

            const containsAll = keywords.every((kw, idx) => {
                const kwLower = kw.toLowerCase();
                const kwNorm = keywordsNorm[idx];

                if (searchString.includes(kwLower) || searchStringNorm.includes(kwNorm)) return true;
                if (searchStringCollapsed.includes(kwLower) || searchStringCollapsedNorm.includes(kwNorm)) return true;

                if (kwLower.length > 4 || kwNorm.length > 4) {
                    const words = nombre.split(/\s+/);
                    return words.some(w => this.levenshtein(kwNorm, this.normalizeText(w)) <= 1);
                }
                return false;
            });

            if (!containsAll) return null;

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

                if ((searchStringCollapsed.includes(kwLower) || searchStringCollapsedNorm.includes(kwNorm)) &&
                    !searchString.includes(kwLower) && !searchStringNorm.includes(kwNorm)) {
                    score += 80;
                }

                if (kwNorm.length > 3) {
                    const wordsInName = nombre.split(/\s+/);
                    wordsInName.forEach(w => {
                        const distance = this.levenshtein(kwNorm, this.normalizeText(w));
                        if (distance === 1) score += 80;
                        else if (distance === 2 && kwNorm.length > 5) score += 30;
                    });
                }
            });

            if (prod.cantidad > 0) score += 10;

            return { ...prod, _score: score };
        }).filter(r => r !== null);

        // Ordenar por relevancia (puntuación decreciente)
        scoredResults.sort((a, b) => b._score - a._score);

        // Limitar a los mejores resultados
        const topResults = scoredResults.slice(0, limit);

        // Ordenar alfabéticamente los mejores resultados por nombre
        topResults.sort((a, b) => (a.nombre || '').trim().localeCompare((b.nombre || '').trim(), 'es', { sensitivity: 'base' }));

        return topResults;
    },

    /**
     * Levenshtein Distance Algorithm (Standard for typos)
     */
    levenshtein(a, b) {
        if (!a || !b) return (a || b || '').length;
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    },

    /**
     * Helper to get color classes for stock
     */
    getStockStatus(cantidad, unidad = 'UNIDAD') {
        const cant = parseFloat(cantidad) || 0;
        if (cant <= 0) return { label: 'Sin Stock', color: 'red', icon: 'times-circle' };
        if (cant < 5) return { label: 'Bajo Stock', color: 'orange', icon: 'exclamation-triangle' };
        return { label: 'Disponible', color: 'green', icon: 'check-circle' };
    }
};
