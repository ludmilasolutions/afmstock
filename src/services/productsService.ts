import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { Producto, ProductoInput } from '@/types/product';

/**
 * Adaptador seguro para documentos de Firestore a la interfaz Producto
 */
export function mapDocToProducto(id: string, data: Record<string, any>): Producto {
  return {
    id,
    codigo: String(data.codigo || data.sku || '').trim(),
    nombre: String(data.nombre || 'Sin nombre').trim(),
    cantidad: typeof data.cantidad === 'number' ? data.cantidad : Number(data.cantidad) || 0,
    stockMinimo: typeof data.stockMinimo === 'number' ? data.stockMinimo : Number(data.stockMinimo) || 5,
    ubicacion: data.ubicacion ? String(data.ubicacion).trim() : undefined,
    marca: data.marca ? String(data.marca).trim() : undefined,
    proveedor: data.proveedor ? String(data.proveedor).trim() : undefined,
    notas: data.notas ? String(data.notas).trim() : undefined,
    categoria: data.categoria ? String(data.categoria).trim() : undefined,
    sku: data.sku,
    codigo_barra: data.codigo_barra,
    unidad: data.unidad,
    fechaCreacion: data.fechaCreacion,
    usuarioCreacion: data.usuarioCreacion,
    fechaEdicion: data.fechaEdicion,
    usuarioEdicion: data.usuarioEdicion,
  };
}

export function subscribeProducts(
  onData: (products: Producto[]) => void,
  onError?: (error: Error) => void,
  firestoreInstance: Firestore = db
) {
  const colRef = collection(firestoreInstance, 'productos');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapDocToProducto(d.id, d.data()));
      items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
      onData(items);
    },
    (err) => {
      console.error('Error suscribiendo a productos:', err);
      onError?.(err);
    }
  );
}

export async function generateNextProductCode(firestoreInstance: Firestore = db): Promise<string> {
  const snap = await getDocs(collection(firestoreInstance, 'productos'));
  const existingCodes = new Set(snap.docs.map((d) => d.data().codigo));
  const numericCodes = snap.docs
    .map((d) => d.data().codigo)
    .filter((c) => c && (c.startsWith('PROD-') || c.startsWith('PRD-')))
    .map((c) => parseInt(c.replace(/^(PROD|PRD)-/, ''), 10))
    .filter((n) => !isNaN(n));

  let maxNum = numericCodes.length ? Math.max(...numericCodes) + 1 : 1;
  let candidate = `PROD-${String(maxNum).padStart(4, '0')}`;
  while (existingCodes.has(candidate)) {
    maxNum++;
    candidate = `PROD-${String(maxNum).padStart(4, '0')}`;
  }
  return candidate;
}

export async function createProduct(
  input: ProductoInput,
  userEmail: string,
  firestoreInstance: Firestore = db
): Promise<string> {
  let codigo = (input.codigo || '').trim();
  if (!codigo) {
    codigo = await generateNextProductCode(firestoreInstance);
  } else {
    // Validar código duplicado
    const q = query(collection(firestoreInstance, 'productos'), where('codigo', '==', codigo));
    const dupCheck = await getDocs(q);
    if (!dupCheck.empty) {
      throw new Error(`Ya existe un producto con el código "${codigo}"`);
    }
  }

  const payload: Record<string, any> = {
    ...input,
    codigo,
    nombre: input.nombre,
    cantidad: Number(input.cantidad) || 0,
    stockMinimo: Number(input.stockMinimo) || 5,
    fechaCreacion: serverTimestamp(),
    usuarioCreacion: userEmail,
    fechaEdicion: serverTimestamp(),
    usuarioEdicion: userEmail,
  };

  const docRef = await addDoc(collection(firestoreInstance, 'productos'), payload);

  // Registro de auditoría en historialEdiciones
  await addDoc(collection(firestoreInstance, 'historialEdiciones'), {
    productoId: docRef.id,
    productoNombre: payload.nombre,
    datosNuevos: payload,
    tipo: 'creacion',
    usuario: userEmail,
    fecha: serverTimestamp(),
  });

  // Registro en movimientos generales
  if (payload.cantidad > 0) {
    await addDoc(collection(firestoreInstance, 'movimientos'), {
      productoId: docRef.id,
      productoNombre: payload.nombre,
      tipo: 'creacion',
      cantidad: payload.cantidad,
      nota: 'Registro inicial por alta de producto',
      usuario: userEmail,
      fecha: serverTimestamp(),
    });
  }

  return docRef.id;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductoInput>,
  userEmail: string,
  firestoreInstance: Firestore = db
): Promise<void> {
  const docRef = doc(firestoreInstance, 'productos', id);
  const oldDoc = await getDoc(docRef);
  if (!oldDoc.exists()) {
    throw new Error('El producto no existe.');
  }

  const oldData = oldDoc.data();

  // Si se modifica el código, comprobar que no esté duplicado en otro documento
  if (input.codigo && input.codigo.trim() !== oldData.codigo) {
    const q = query(collection(firestoreInstance, 'productos'), where('codigo', '==', input.codigo.trim()));
    const dup = await getDocs(q);
    if (!dup.empty && dup.docs.some((d) => d.id !== id)) {
      throw new Error(`El código "${input.codigo}" ya está asignado a otro producto.`);
    }
  }

  const updateData: Record<string, any> = {
    ...input,
    fechaEdicion: serverTimestamp(),
    usuarioEdicion: userEmail,
  };

  // Guardar en historial de ediciones
  await addDoc(collection(firestoreInstance, 'historialEdiciones'), {
    productoId: id,
    productoNombre: oldData.nombre,
    datosAnteriores: oldData,
    datosNuevos: updateData,
    tipo: 'edicion',
    usuario: userEmail,
    fecha: serverTimestamp(),
  });

  await updateDoc(docRef, updateData);
}

export async function adjustProductStock(
  productoId: string,
  newStock: number,
  motivo: string,
  userEmail: string,
  firestoreInstance: Firestore = db
): Promise<void> {
  if (typeof newStock !== 'number' || isNaN(newStock) || newStock < 0) {
    throw new Error('La cantidad de stock debe ser un número mayor o igual a 0.');
  }

  const docRef = doc(firestoreInstance, 'productos', productoId);

  await runTransaction(firestoreInstance, async (transaction) => {
    // 1. Fase de lectura atómica (todas las lecturas antes de cualquier escritura)
    const prodDoc = await transaction.get(docRef);
    if (!prodDoc.exists()) {
      throw new Error('El producto no existe.');
    }

    const prodData = prodDoc.data();
    const stockAnterior = typeof prodData.cantidad === 'number' ? prodData.cantidad : Number(prodData.cantidad) || 0;
    const diff = newStock - stockAnterior;
    const prodNombre = prodData.nombre || 'Sin nombre';

    // 2. Fase de escritura atómica
    transaction.update(docRef, {
      cantidad: newStock,
      fechaEdicion: serverTimestamp(),
      usuarioEdicion: userEmail,
    });

    // Registro inmutable en historial de ediciones
    const historyRef = doc(collection(firestoreInstance, 'historialEdiciones'));
    transaction.set(historyRef, {
      productoId,
      productoNombre: prodNombre,
      tipo: 'ajuste',
      cantidadAnterior: stockAnterior,
      cantidadNueva: newStock,
      motivo: motivo.trim() || 'Ajuste manual de inventario',
      usuario: userEmail,
      fecha: serverTimestamp(),
    });

    // Si hubo cambio de cantidad, registrar movimiento para consistencia
    if (diff !== 0) {
      const movRef = doc(collection(firestoreInstance, 'movimientos'));
      transaction.set(movRef, {
        productoId,
        productoNombre: prodNombre,
        tipo: diff > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(diff),
        nota: `Ajuste manual (${stockAnterior} → ${newStock})${motivo.trim() ? ': ' + motivo.trim() : ''}`,
        usuario: userEmail,
        fecha: serverTimestamp(),
      });
    }
  });
}

export async function deleteProduct(productId: string, firestoreInstance: Firestore = db): Promise<void> {
  // Eliminar los movimientos asociados en chunks
  const q = query(collection(firestoreInstance, 'movimientos'), where('productoId', '==', productId));
  const movSnap = await getDocs(q);

  const CHUNK_SIZE = 400;
  for (let i = 0; i < movSnap.docs.length; i += CHUNK_SIZE) {
    const chunk = movSnap.docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestoreInstance);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(firestoreInstance, 'productos', productId));
}
