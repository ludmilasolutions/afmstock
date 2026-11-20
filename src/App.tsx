import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProductos } from '@/hooks/useProductos';
import { useMovimientos } from '@/hooks/useMovimientos';
import { useBorradores } from '@/hooks/useBorradores';
import { useToast } from '@/context/ToastContext';
import { Producto, ProductoInput } from '@/types/product';
import { Movimiento } from '@/types/movement';
import { MovementType } from '@/types/movement';
import { LoginPage } from '@/components/auth/LoginPage';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavSection } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DashboardView } from '@/pages/DashboardView';
import { ProductsView } from '@/pages/ProductsView';
import { MovementsView } from '@/pages/MovementsView';
import { QuickNotesPanel } from '@/components/notes/QuickNotesPanel';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { ProductQuickAdjustModal } from '@/components/products/ProductQuickAdjustModal';
import { ProductHistoryModal } from '@/components/products/ProductHistoryModal';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { MovementFormModal } from '@/components/movements/MovementFormModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Spinner } from '@/components/common/Spinner';
import { Plus } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const {
    products,
    loading: prodLoading,
    addProduct,
    editProduct,
    adjustStock,
    removeProduct,
  } = useProductos();

  const {
    movements,
    loading: movLoading,
    addMovement,
    revertMovement,
  } = useMovimientos();

  const {
    drafts,
    loading: draftLoading,
    createDraft,
    removeDraft,
    processDraft,
  } = useBorradores();

  const [activeSection, setActiveSection] = useState<NavSection>('inicio');

  // Estado de modales
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Producto | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [productForDetail, setProductForDetail] = useState<Producto | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [productForHistory, setProductForHistory] = useState<Producto | null>(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementDefaultType, setMovementDefaultType] = useState<MovementType>('entrada');
  const [movementPreselectedProduct, setMovementPreselectedProduct] = useState<Producto | null>(null);

  // Modales de confirmación
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [confirmRevertOpen, setConfirmRevertOpen] = useState(false);
  const [movementToRevert, setMovementToRevert] = useState<Movimiento | null>(null);
  const [revertLoading, setRevertLoading] = useState(false);

  // Filtro de bajo stock activado desde Dashboard
  const [filterStockLevel, setFilterStockLevel] = useState<'all' | 'low' | 'critical'>('all');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Spinner size="lg" text="Iniciando AFM STOCK 2.0..." />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const lowStockCount = products.filter((p) => (p.cantidad || 0) < (p.stockMinimo || 5)).length;

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Producto) => {
    setProductToEdit(p);
    setProductModalOpen(true);
  };

  const handleOpenAdjust = (p: Producto) => {
    setProductToAdjust(p);
    setAdjustModalOpen(true);
  };

  const handleOpenDetail = (p: Producto) => {
    setProductForDetail(p);
    setDetailModalOpen(true);
  };

  const handleOpenHistory = (p: Producto) => {
    setProductForHistory(p);
    setHistoryModalOpen(true);
  };

  const handleOpenNewMovement = (type: MovementType = 'entrada', prod: Producto | null = null) => {
    setMovementDefaultType(type);
    setMovementPreselectedProduct(prod);
    setMovementModalOpen(true);
  };

  const handlePromptDeleteProduct = (p: Producto) => {
    setProductToDelete(p);
    setConfirmDeleteOpen(true);
  };

  const handleExecuteDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setDeleteLoading(true);
      await removeProduct(productToDelete.id);
      showToast(`Producto "${productToDelete.nombre}" eliminado`, 'success');
      setConfirmDeleteOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el producto', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePromptRevertMovement = (m: Movimiento) => {
    setMovementToRevert(m);
    setConfirmRevertOpen(true);
  };

  const handleExecuteRevertMovement = async () => {
    if (!movementToRevert) return;
    try {
      setRevertLoading(true);
      await revertMovement(movementToRevert);
      showToast('Movimiento revertido y stock restablecido correctamente', 'success');
      setConfirmRevertOpen(false);
      setMovementToRevert(null);
    } catch (err: any) {
      showToast(err.message || 'Error al revertir movimiento', 'error');
    } finally {
      setRevertLoading(false);
    }
  };

  const handleSaveProduct = async (data: ProductoInput) => {
    if (productToEdit) {
      await editProduct(productToEdit.id, data);
      showToast('Producto actualizado correctamente', 'success');
    } else {
      await addProduct(data);
      showToast('Producto creado con éxito', 'success');
    }
  };

  const sectionTitles: Record<NavSection, string> = {
    inicio: 'Control de Depósito',
    productos: 'Existencias e Inventario',
    movimientos: 'Historial de Movimientos',
    notas: 'Recordatorios y Notas Rápidas',
  };

  const isLoadingData = prodLoading || movLoading || draftLoading;

  return (
    <div className="min-h-screen bg-[#F5F6FC] flex flex-col md:flex-row antialiased selection:bg-indigo-600 selection:text-white">
      {/* Sidebar Desktop */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={(s) => {
          setActiveSection(s);
          if (s === 'productos') setFilterStockLevel('all');
        }}
        lowStockCount={lowStockCount}
        draftsCount={drafts.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header title={sectionTitles[activeSection]} />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {isLoadingData ? (
            <div className="py-24 flex items-center justify-center">
              <Spinner text="Sincronizando inventario con Firebase..." />
            </div>
          ) : (
            <>
              {activeSection === 'inicio' && (
                <DashboardView
                  products={products}
                  movements={movements}
                  drafts={drafts}
                  onNavigate={setActiveSection}
                  onOpenMovementModal={(t) => handleOpenNewMovement(t)}
                  onOpenProductModal={handleOpenNewProduct}
                  onRevertMovement={handlePromptRevertMovement}
                  onFilterLowStock={() => {
                    setFilterStockLevel('low');
                    setActiveSection('productos');
                  }}
                />
              )}

              {activeSection === 'productos' && (
                <ProductsView
                  products={products}
                  initialStockFilter={filterStockLevel}
                  onAddProduct={handleOpenNewProduct}
                  onEditProduct={handleOpenEditProduct}
                  onAdjustProduct={handleOpenAdjust}
                  onDeleteProduct={handlePromptDeleteProduct}
                  onViewHistory={handleOpenHistory}
                  onViewDetail={handleOpenDetail}
                />
              )}

              {activeSection === 'movimientos' && (
                <MovementsView
                  movements={movements}
                  onOpenNewMovement={() => handleOpenNewMovement('entrada')}
                  onRevertMovement={handlePromptRevertMovement}
                />
              )}

              {activeSection === 'notas' && (
                <QuickNotesPanel
                  drafts={drafts}
                  products={products}
                  onAddDraft={async (t) => {
                    await createDraft(t);
                  }}
                  onDeleteDraft={removeDraft}
                  onProcessDraft={processDraft}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Botón Flotante Móvil (FAB) con aria-label para accesibilidad (H-A11Y-04) */}
      <button
        onClick={() => {
          if (activeSection === 'productos') {
            handleOpenNewProduct();
          } else {
            handleOpenNewMovement('entrada');
          }
        }}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 active:scale-95 transition-all"
        title={activeSection === 'productos' ? 'Nuevo Producto' : 'Registrar Entrada'}
        aria-label={activeSection === 'productos' ? 'Crear nuevo producto' : 'Registrar nueva entrada de stock'}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Navegación inferior móvil */}
      <MobileNav
        activeSection={activeSection}
        onNavigate={(s) => {
          setActiveSection(s);
          if (s === 'productos') setFilterStockLevel('all');
        }}
        lowStockCount={lowStockCount}
        draftsCount={drafts.length}
      />

      {/* Modales de Producto */}
      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
      />

      <ProductQuickAdjustModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        product={productToAdjust}
        onAdjust={adjustStock}
      />

      <ProductDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        product={productForDetail}
        onAdjust={handleOpenAdjust}
        onEdit={handleOpenEditProduct}
      />

      <ProductHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        product={productForHistory}
        cachedMovements={movements}
      />

      <MovementFormModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        products={products}
        defaultType={movementDefaultType}
        preselectedProduct={movementPreselectedProduct}
        onSubmit={async (data) => {
          await addMovement(data);
        }}
      />

      {/* Confirmación Eliminar Producto */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        title="¿Eliminar producto?"
        message={`Se eliminará "${productToDelete?.nombre}" y todo su historial de movimientos asociados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar Definitivamente"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleExecuteDeleteProduct}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Confirmación Revertir Movimiento */}
      <ConfirmModal
        isOpen={confirmRevertOpen}
        title="¿Revertir este movimiento?"
        message={`Revertir este movimiento ${
          movementToRevert?.tipo === 'entrada'
            ? `restará ${movementToRevert?.cantidad} unidades del stock de "${movementToRevert?.productoNombre}".`
            : `devolverá ${movementToRevert?.cantidad} unidades al stock de "${movementToRevert?.productoNombre}".`
        }`}
        confirmLabel="Confirmar y Revertir"
        variant="warning"
        loading={revertLoading}
        onConfirm={handleExecuteRevertMovement}
        onCancel={() => setConfirmRevertOpen(false)}
      />
    </div>
  );
};
