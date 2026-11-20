export type HistoryType = 'creacion' | 'edicion' | 'ajuste';

export interface HistorialItem {
  id: string;
  productoId: string;
  productoNombre?: string;
  tipo: HistoryType;
  datosAnteriores?: Record<string, any>;
  datosNuevos?: Record<string, any>;
  cantidadAnterior?: number;
  cantidadNueva?: number;
  motivo?: string;
  usuario?: string;
  fecha?: any;
}

