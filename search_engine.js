/**
 * AFM POS - Unified Search Engine v1.0
 * Centralizes search logic for Desktop and Mobile
 */

window.SearchEngine = {
    /**
     * Resalta palabras clave en un texto de forma segura, evitando modificar etiquetas HTML existentes.
     * @param {string} text - El texto original (puede contener HTML).
     * @param {string[]} keywords - Arreglo de palabras a resaltar.
     * @param {string} className - Clase CSS opcional para el resaltado.
     * @returns {string} - Texto con las palabras clave resaltadas.
     */
    highlightText: function(text, keywords, className = 'text-primary-600 dark:text-primary-400 bg-primary-100/50 dark:bg-primary-900/40 px-0.5 rounded', tagName = 'b') {
        if (!text || !keywords || keywords.length === 0) return text || '';
        
        // Limpiar y normalizar palabras clave
        const validKeywords = keywords
            .map(kw => kw.trim().toLowerCase())
            .filter(kw => kw.length > 0)
            .sort((a, b) => b.length - a.length); // Resaltar primero las más largas

        if (validKeywords.length === 0) return text;

        // Crear un solo regex para todas las keywords (escapando caracteres especiales)
        const pattern = validKeywords
            .map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        const regex = new RegExp(`(${pattern})`, 'gi');

        // Determinar si es clase o estilo (heurística simple)
        const attrName = className.includes(':') ? 'style' : 'class';

        // Dividir el texto por etiquetas HTML para no procesarlas
        const parts = text.split(/(<[^>]+>)/g);
        
        return parts.map(part => {
            if (part && part.startsWith('<')) return part; // No tocar etiquetas HTML o vacíos
            if (!part) return '';

            // Reemplazo en un solo paso para evitar re-resaltar etiquetas inyectadas
            return part.replace(regex, `<${tagName} ${attrName}="${className}">$1</${tagName}>`);
        }).join('');
    },

    highlightTerms: function(text, query, className) {
        if (!query || !query.trim()) return text || '';
        const keywords = query.trim().toLowerCase().split(/\s+/).filter(kw => kw.length > 0);
        return this.highlightText(text, keywords, className);
    },

    /**
     * Performs search on a LOCAL array of items
     */
    performLocalSearch(items, query, options = {}) {
        const {
            limit = 50,
            solo_activos = true
        } = options;

        if (!query || query.trim() === '') return items;

        const term = query.trim().toLowerCase();
        const keywords = term.split(/\s+/).filter(k => k.length > 0);

        if (keywords.length === 0) return items;

        const scoredResults = items.map(prod => {
            let score = 0;
            const nombre = (prod.nombre || '').toLowerCase();
            const sku = (prod.codigo || prod.sku || '').toLowerCase();
            const cb = (prod.codigo_barra || prod.codigo || '').toLowerCase();
            const brand = (prod.marca || '').toLowerCase();
            const cat = (prod.categoria || '').toLowerCase();
            
            const searchString = `${nombre} ${sku} ${cb} ${brand} ${cat}`;
            const searchStringCollapsed = searchString.replace(/\s+/g, '');

            const containsAll = keywords.every(kw => {
                const kwLower = kw.toLowerCase();
                if (searchString.includes(kwLower)) return true;
                if (searchStringCollapsed.includes(kwLower)) return true;
                
                if (kwLower.length > 4) {
                    return nombre.split(/\s+/).some(w => this.levenshtein(kwLower, w) <= 1);
                }
                return false;
            });

            if (!containsAll) return null;

            if (sku === term || cb === term) score += 5000;
            if (nombre === term) score += 2000;

            keywords.forEach(kw => {
                const kwLower = kw.toLowerCase();
                
                if (sku.includes(kwLower)) score += 500;
                if (cb.includes(kwLower)) score += 400;
                
                if (nombre.startsWith(kwLower)) score += 300;
                else if (nombre.includes(kwLower)) score += 100;
                
                if (brand.includes(kwLower)) score += 50;

                if (searchStringCollapsed.includes(kwLower) && !searchString.includes(kwLower)) {
                    score += 80;
                }

                if (kwLower.length > 3) {
                    const wordsInName = nombre.split(/\s+/);
                    wordsInName.forEach(w => {
                        const distance = this.levenshtein(kwLower, w);
                        if (distance === 1) score += 80;
                        else if (distance === 2 && kwLower.length > 5) score += 30;
                    });
                }
            });

            if (prod.cantidad > 0) score += 10;
            
            return { ...prod, _score: score };
        }).filter(r => r !== null);

        scoredResults.sort((a, b) => b._score - a._score);

        return scoredResults.slice(0, limit);
    },

    /**
     * Levenshtein Distance Algorithm (Standard for typos)
     */
    levenshtein(a, b) {
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
