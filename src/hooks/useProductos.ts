import { useState, useEffect, useCallback } from 'react';
import { Producto, ProductoInput } from '@/types/product';
import {
  subscribeProducts,
  createProduct,
  updateProduct,
  adjustProductStock,
  deleteProduct,
} from '@/services/productsService';
import { useAuth } from '@/context/AuthContext';

export function useProductos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeProducts(
      (items) => {
        setProducts(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addProduct = useCallback(
    async (input: ProductoInput) => {
      const email = user?.email || 'admin@stockafm.com';
      return await createProduct(input, email);
    },
    [user]
  );

  const editProduct = useCallback(
    async (id: string, input: Partial<ProductoInput>) => {
      const email = user?.email || 'admin@stockafm.com';
      return await updateProduct(id, input, email);
    },
    [user]
  );

  const adjustStock = useCallback(
    async (productId: string, newStock: number, motivo: string) => {
      const email = user?.email || 'admin@stockafm.com';
      return await adjustProductStock(productId, newStock, motivo, email);
    },
    [user]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      return await deleteProduct(productId);
    },
    []
  );

  return {
    products,
    loading,
    error,
    addProduct,
    editProduct,
    adjustStock,
    removeProduct,
  };
}

