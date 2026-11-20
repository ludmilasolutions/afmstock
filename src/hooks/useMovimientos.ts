import { useState, useEffect, useCallback } from 'react';
import { Movimiento, MovimientoInput } from '@/types/movement';
import {
  subscribeMovements,
  recordMovement,
  revertMovement,
} from '@/services/movementsService';
import { useAuth } from '@/context/AuthContext';

export function useMovimientos() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setMovements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeMovements(
      (items) => {
        setMovements(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addMovement = useCallback(
    async (input: MovimientoInput) => {
      const email = user?.email || 'admin@stockafm.com';
      return await recordMovement(input, email);
    },
    [user]
  );

  const revert = useCallback(
    async (movement: Movimiento) => {
      return await revertMovement(movement);
    },
    []
  );

  return {
    movements,
    loading,
    error,
    addMovement,
    revertMovement: revert,
  };
}

