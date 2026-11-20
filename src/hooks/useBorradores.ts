import { useState, useEffect, useCallback } from 'react';
import { Borrador } from '@/types/draft';
import { MovementType } from '@/types/movement';
import {
  subscribeDrafts,
  addDraft,
  deleteDraft,
  processDraftToStock,
} from '@/services/draftsService';
import { useAuth } from '@/context/AuthContext';

export function useBorradores() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Borrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeDrafts(
      (items) => {
        setDrafts(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createDraft = useCallback(
    async (text: string) => {
      const email = user?.email || 'admin@stockafm.com';
      return await addDraft(text, email);
    },
    [user]
  );

  const removeDraft = useCallback(
    async (id: string) => {
      return await deleteDraft(id);
    },
    []
  );

  const processDraft = useCallback(
    async (params: {
      draftId: string;
      productId: string;
      tipo: MovementType;
      cantidad: number;
      reason?: string;
    }) => {
      const email = user?.email || 'admin@stockafm.com';
      return await processDraftToStock({ ...params, userEmail: email });
    },
    [user]
  );

  return {
    drafts,
    loading,
    error,
    createDraft,
    removeDraft,
    processDraft,
  };
}
