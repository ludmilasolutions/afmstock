export type MovementType = 'entrada' | 'salida' | 'creacion';

export interface Movimiento {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: MovementType;
  cantidad: number;
  nota?: string;
  fecha?: any;
  usuario?: string;
}

export interface MovimientoInput {
  productoId: string;
  productoNombre?: string;
  tipo: MovementType;
  cantidad: number;
  nota?: string;
}
