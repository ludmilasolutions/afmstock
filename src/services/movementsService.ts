import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { Movimiento, MovimientoInput } from '@/types/movement';

export function mapDocToMovimiento(id: string, data: Record<string, any>): Movimiento {
  return {
    id,
    productoId: String(data.productoId || ''),
    productoNombre: String(data.productoNombre || 'Desconocido'),
    tipo: data.tipo || 'entrada',
    cantidad: typeof data.cantidad === 'number' ? data.cantidad : Number(data.cantidad) || 0,
    nota: data.nota ? String(data.nota) : undefined,
    fecha: data.fecha,
    usuario: data.usuario ? String(data.usuario) : undefined,
  };
}

export function subscribeMovements(
  onData: (movements: Movimiento[]) => void,
  onError?: (error: Error) => void,
  firestoreInstance: Firestore = db
) {
  const q = query(collection(firestoreInstance, 'movimientos'), orderBy('fecha', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapDocToMovimiento(d.id, d.data()));
      onData(items);
    },
    (err) => {
      console.error('Error suscribiendo a movimientos:', err);
      onError?.(err);
    }
  );
}

/**
 * Registra un movimiento (entrada o salida) actualizando de forma atómica el stock del producto
 */
export async function recordMovement(
  input: MovimientoInput,
  userEmail: string,
  firestoreInstance: Firestore = db
): Promise<string> {
  const { productoId, tipo, cantidad, nota } = input;

  if (isNaN(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser un número entero mayor a 0.');
  }

  const prodRef = doc(firestoreInstance, 'productos', productoId);

  return await runTransaction(firestoreInstance, async (transaction) => {
    const prodDoc = await transaction.get(prodRef);
    if (!prodDoc.exists()) {
      throw new Error('El producto seleccionado no existe.');
    }

    const prodData = prodDoc.data();
    const stockActual = prodData.cantidad || 0;

    if (tipo === 'salida' && stockActual < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${stockActual} unidades.`);
    }

    const nuevoStock = tipo === 'entrada' ? stockActual + cantidad : stockActual - cantidad;

    // Actualizar producto
    transaction.update(prodRef, {
      cantidad: nuevoStock,
      fechaEdicion: serverTimestamp(),
      usuarioEdicion: userEmail,
    });

    // Crear registro de movimiento
    const newMovRef = doc(collection(firestoreInstance, 'movimientos'));
    transaction.set(newMovRef, {
      productoId,
      productoNombre: prodData.nombre,
      tipo,
      cantidad,
      nota: nota?.trim() || '',
      fecha: serverTimestamp(),
      usuario: userEmail,
    });

    return newMovRef.id;
  });
}

/**
 * Revierte un movimiento existente y restaura de forma atómica el stock del producto
 */
export async function revertMovement(
  movement: Movimiento,
  firestoreInstance: Firestore = db
): Promise<void> {
  if (movement.tipo === 'creacion') {
    throw new Error('No es posible revertir un movimiento de creación inicial.');
  }

  const prodRef = doc(firestoreInstance, 'productos', movement.productoId);
  const movRef = doc(firestoreInstance, 'movimientos', movement.id);

  await runTransaction(firestoreInstance, async (transaction) => {
    const prodDoc = await transaction.get(prodRef);
    if (!prodDoc.exists()) {
      throw new Error('El producto asociado a este movimiento ya no existe.');
    }

    const actualStock = prodDoc.data().cantidad || 0;
    let nuevoStock = actualStock;

    if (movement.tipo === 'entrada') {
      if (actualStock < movement.cantidad) {
        throw new Error(
          `Stock insuficiente: el stock actual (${actualStock}) es menor a las ${movement.cantidad} unidades a revertir. Revertirlo dejaría el inventario en negativo.`
        );
      }
      nuevoStock = actualStock - movement.cantidad;
    } else if (movement.tipo === 'salida') {
      nuevoStock = actualStock + movement.cantidad;
    }

    transaction.update(prodRef, { cantidad: nuevoStock });
    transaction.delete(movRef);
  });
}

