export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  stockMinimo: number;
  ubicacion?: string;
  marca?: string;
  proveedor?: string;
  notas?: string;
  categoria?: string;
  
  // Compatibilidad con registros históricos y campos heterogéneos
  sku?: string;
  codigo_barra?: string;
  unidad?: string;
  fechaCreacion?: any;
  usuarioCreacion?: string;
  fechaEdicion?: any;
  usuarioEdicion?: string;
  [key: string]: any;
}

export type ProductoInput = Omit<Producto, 'id'>;

export type StockStatusLevel = 'ok' | 'low' | 'critical';

export interface StockStatus {
  level: StockStatusLevel;
  label: string;
  colorClass: string;
  badgeClass: string;
}
