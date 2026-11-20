import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { Borrador } from '@/types/draft';
import { MovementType } from '@/types/movement';

export function mapDocToBorrador(id: string, data: Record<string, any>): Borrador {
  return {
    id,
    texto: String(data.texto || ''),
    fecha: data.fecha,
    usuario: data.usuario ? String(data.usuario) : undefined,
    procesado: Boolean(data.procesado),
  };
}

export function subscribeDrafts(
  onData: (drafts: Borrador[]) => void,
  onError?: (error: Error) => void,
  firestoreInstance: Firestore = db
) {
  const q = query(collection(firestoreInstance, 'borradores'), orderBy('fecha', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapDocToBorrador(d.id, d.data()));
      onData(items);
    },
    (err) => {
      console.error('Error suscribiendo a borradores:', err);
      onError?.(err);
    }
  );
}

export async function addDraft(
  texto: string,
  userEmail: string,
  firestoreInstance: Firestore = db
): Promise<string> {
  const docRef = await addDoc(collection(firestoreInstance, 'borradores'), {
    texto: texto.trim(),
    fecha: serverTimestamp(),
    usuario: userEmail,
    procesado: false,
  });
  return docRef.id;
}

export async function deleteDraft(draftId: string, firestoreInstance: Firestore = db): Promise<void> {
  await deleteDoc(doc(firestoreInstance, 'borradores', draftId));
}

export interface ProcessDraftParams {
  draftId: string;
  productId: string;
  tipo: MovementType;
  cantidad: number;
  reason?: string;
  userEmail: string;
}

export async function processDraftToStock(
  params: ProcessDraftParams,
  firestoreInstance: Firestore = db
): Promise<void> {
  const { draftId, productId: productoId, tipo, cantidad, reason, userEmail } = params;

  if (isNaN(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser un número entero mayor a 0.');
  }

  const prodRef = doc(firestoreInstance, 'productos', productoId);
  const prodDoc = await getDoc(prodRef);
  if (!prodDoc.exists()) {
    throw new Error('El producto seleccionado ya no existe.');
  }

  const prodData = prodDoc.data();
  const stockActual = prodData.cantidad || 0;

  if (tipo === 'salida' && stockActual < cantidad) {
    throw new Error(`Stock insuficiente de ${prodData.nombre}. Stock actual: ${stockActual}`);
  }

  const nuevoStock = tipo === 'entrada' ? stockActual + cantidad : stockActual - cantidad;

  const batch = writeBatch(firestoreInstance);

  // 1. Actualizar stock del producto
  batch.update(prodRef, {
    cantidad: nuevoStock,
    fechaEdicion: serverTimestamp(),
    usuarioEdicion: userEmail,
  });

  // 2. Registrar movimiento
  const movRef = doc(collection(firestoreInstance, 'movimientos'));
  batch.set(movRef, {
    productoId,
    productoNombre: prodData.nombre,
    tipo,
    cantidad,
    nota: reason || 'Procesado desde nota rápida',
    fecha: serverTimestamp(),
    usuario: userEmail,
  });

  // 3. Eliminar nota rápida
  batch.delete(doc(firestoreInstance, 'borradores', draftId));

  await batch.commit();
}
