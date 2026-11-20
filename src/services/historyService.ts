import {
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { HistorialItem } from '@/types/history';
import { Movimiento } from '@/types/movement';
import { mapDocToMovimiento } from './movementsService';

export function mapDocToHistorialItem(id: string, data: Record<string, any>): HistorialItem {
  return {
    id,
    productoId: String(data.productoId || ''),
    productoNombre: data.productoNombre,
    tipo: data.tipo || 'edicion',
    datosAnteriores: data.datosAnteriores,
    datosNuevos: data.datosNuevos,
    cantidadAnterior: data.cantidadAnterior,
    cantidadNueva: data.cantidadNueva,
    motivo: data.motivo,
    usuario: data.usuario,
    fecha: data.fecha,
  };
}

export async function getProductMovements(
  productId: string,
  cachedMovements?: Movimiento[],
  firestoreInstance: Firestore = db
): Promise<Movimiento[]> {
  if (cachedMovements && cachedMovements.length > 0) {
    const filtered = cachedMovements.filter((m) => m.productoId === productId);
    return filtered.sort((a, b) => {
      const ta = a.fecha?.seconds || 0;
      const tb = b.fecha?.seconds || 0;
      return tb - ta;
    });
  }

  const q = query(collection(firestoreInstance, 'movimientos'), where('productoId', '==', productId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => mapDocToMovimiento(d.id, d.data()));
  return items.sort((a, b) => {
    const ta = a.fecha?.seconds || 0;
    const tb = b.fecha?.seconds || 0;
    return tb - ta;
  });
}

export async function getProductEdits(
  productId: string,
  firestoreInstance: Firestore = db
): Promise<HistorialItem[]> {
  try {
    const q = query(collection(firestoreInstance, 'historialEdiciones'), where('productoId', '==', productId));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => mapDocToHistorialItem(d.id, d.data()));
    return items.sort((a, b) => {
      const ta = a.fecha?.seconds || 0;
      const tb = b.fecha?.seconds || 0;
      return tb - ta;
    });
  } catch (err) {
    console.warn('No se pudo recuperar historialEdiciones para producto:', productId, err);
    return [];
  }
}
