import React, { useState } from 'react';
import { Borrador } from '@/types/draft';
import { Producto } from '@/types/product';
import { MovementType } from '@/types/movement';
import { SearchEngine } from '@/search/searchEngine';
import { formatTimeAgo } from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { useToast } from '@/context/ToastContext';
import { StickyNote, Trash2, Zap, ArrowRight, Clock, Plus } from 'lucide-react';

interface QuickNotesPanelProps {
  drafts: Borrador[];
  products: Producto[];
  onAddDraft: (text: string) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  onProcessDraft: (params: {
    draftId: string;
    productId: string;
    tipo: MovementType;
    cantidad: number;
    reason?: string;
  }) => Promise<void>;
}

export const QuickNotesPanel: React.FC<QuickNotesPanelProps> = ({
  drafts,
  products,
  onAddDraft,
  onDeleteDraft,
  onProcessDraft,
}) => {
  const { showToast } = useToast();
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado del modal de procesar nota manualmente
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<Borrador | null>(null);
  const [procType, setProcType] = useState<MovementType>('salida');
  const [procQty, setProcQty] = useState(1);
  const [procProdId, setProcProdId] = useState('');
  const [procSearch, setProcSearch] = useState('');
  const [procReason, setProcReason] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      setSubmitting(true);
      await onAddDraft(newText.trim());
      setNewText('');
      showToast('Recordatorio guardado', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar recordatorio', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper para detectar sugerencias automáticas de producto y cantidad
  const analyzeDraft = (text: string) => {
    const textNorm = SearchEngine.normalizeText(text);
    let tipo: MovementType = 'salida';
    if (
      textNorm.includes('traje') ||
      textNorm.includes('compre') ||
      textNorm.includes('ingreso') ||
      textNorm.includes('recibi') ||
      textNorm.includes('+') ||
      textNorm.includes('lleg') ||
      textNorm.includes('entr')
    ) {
      tipo = 'entrada';
    }

    const numberMatch = text.match(/\b\d+\b/);
    const cantidad = numberMatch ? parseInt(numberMatch[0], 10) : 1;

    const cleanQuery = text
      .toLowerCase()
      .replace(/\b\d+\b/g, '')
      .replace(/(lleve|retire|saque|traje|compre|ingreso|recibi|venta|vendo|para|del|de|un|una|u|u\.|caja|cajas)/g, '')
      .trim();

    let matchedProduct: Producto | null = null;
    if (cleanQuery.length > 2) {
      const results = SearchEngine.performLocalSearch(products, cleanQuery, { limit: 1 });
      if (results.length > 0) matchedProduct = results[0];
    }

    return { tipo, cantidad, matchedProduct };
  };

  const handleOpenProcess = (d: Borrador) => {
    const analysis = analyzeDraft(d.texto);
    setActiveDraft(d);
    setProcType(analysis.tipo);
    setProcQty(analysis.cantidad);
    setProcProdId(analysis.matchedProduct?.id || '');
    setProcSearch(analysis.matchedProduct ? `${analysis.matchedProduct.codigo} - ${analysis.matchedProduct.nombre}` : '');
    setProcReason(`Procesado desde nota: "${d.texto}"`);
    setModalOpen(true);
  };

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDraft || !procProdId) {
      showToast('Seleccioná un producto de destino', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await onProcessDraft({
        draftId: activeDraft.id,
        productId: procProdId,
        tipo: procType,
        cantidad: procQty,
        reason: procReason,
      });
      showToast('Movimiento registrado y recordatorio archivado', 'success');
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al procesar recordatorio', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredModalProducts = procSearch.trim()
    ? SearchEngine.performLocalSearch(products, procSearch, { limit: 10 })
    : products.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      {/* Input de nueva nota rápida */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder='Ej: "Llevé 2 cintas aisladoras para obra", "Traje 10 destornilladores"...'
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
          />
        </div>
        <Button type="submit" loading={submitting} icon={<Plus className="w-4 h-4" />}>
          Anotar
        </Button>
      </form>

      {/* Lista de notas */}
      {drafts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400 flex flex-col items-center gap-2">
          <StickyNote className="w-8 h-8 text-slate-300" />
          <p className="text-sm font-medium">No hay recordatorios pendientes en el depósito.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {drafts.map((d) => {
            const analysis = analyzeDraft(d.texto);

            return (
              <div
                key={d.id}
                className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3 border-l-4 border-l-amber-500"
              >
                <div>
                  <p className="font-medium text-slate-800 text-sm leading-snug">
                    "{d.texto}"
                  </p>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(d.fecha)} · {d.usuario ? d.usuario.split('@')[0] : 'admin'}
                  </span>
                </div>

                {/* Sugerencia inteligente si coincide con algún producto */}
                {analysis.matchedProduct && (
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="text-amber-800 font-semibold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        Sugerido: {analysis.tipo === 'entrada' ? '+' : '−'}{analysis.cantidad} u.
                      </span>
                      <span className="text-slate-600 truncate max-w-[200px]">
                        {analysis.matchedProduct.nombre}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onProcessDraft({
                          draftId: d.id,
                          productId: analysis.matchedProduct!.id,
                          tipo: analysis.tipo,
                          cantidad: analysis.cantidad,
                          reason: `Procesado rápido de recordatorio: "${d.texto}"`,
                        })
                      }
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <span>Aplicar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenProcess(d)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Procesar Stock...
                  </button>
                  <button
                    onClick={() => onDeleteDraft(d.id)}
                    title="Eliminar recordatorio"
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para procesar nota a stock */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Procesar Recordatorio a Stock" maxWidth="md">
        <form onSubmit={handleSaveProcess} className="flex flex-col gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-400 block mb-0.5">Texto original:</span>
            <strong className="text-slate-700">"{activeDraft?.texto}"</strong>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setProcType('entrada')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                procType === 'entrada' ? 'bg-emerald-600 text-white' : 'text-slate-600'
              }`}
            >
              Entrada (+)
            </button>
            <button
              type="button"
              onClick={() => setProcType('salida')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                procType === 'salida' ? 'bg-red-600 text-white' : 'text-slate-600'
              }`}
            >
              Salida (−)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Producto Asociado *
            </label>
            <input
              type="text"
              required
              placeholder="Buscar producto..."
              value={procSearch}
              onChange={(e) => {
                setProcSearch(e.target.value);
                setProcProdId('');
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {procSearch && !procProdId && (
              <div className="mt-1 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto shadow-lg divide-y divide-slate-100">
                {filteredModalProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setProcProdId(p.id);
                      setProcSearch(`${p.codigo} - ${p.nombre}`);
                    }}
                    className="p-2 text-xs hover:bg-slate-50 cursor-pointer flex justify-between"
                  >
                    <span className="font-medium text-slate-800">{p.nombre}</span>
                    <span className="font-mono text-slate-400">Stock: {p.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cantidad *"
              type="number"
              min="1"
              value={procQty}
              onChange={(e) => setProcQty(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <Input
              label="Nota de Movimiento"
              value={procReason}
              onChange={(e) => setProcReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Aplicar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
