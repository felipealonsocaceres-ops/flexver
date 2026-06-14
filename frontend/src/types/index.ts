export interface Usuario {
  id_usuario: string
  nombre_completo: string
  email: string
  telefono: string
  rol: 'cliente' | 'conductor' | 'administrador'
  created_at: string
}

export interface Flete {
  id_flete: string
  id_usuario: string
  id_conductor?: string
  id_tarifa: string
  origen_direccion: string
  origen_lat: number
  origen_lng: number
  destino_direccion: string
  destino_lat: number
  destino_lng: number
  descripcion_carga: string
  distancia_km: number
  monto_total: number
  estado: 'pendiente' | 'buscando_conductor' | 'asignado' | 'en_camino' | 'carga_recogida' | 'entregado' | 'cancelado'
  created_at: string
}

export interface Tarifa {
  id_tarifa: string
  precio_base: number
  precio_por_km: number
  precio_por_m3: number
  vigente: boolean
}

export interface Conductor {
  id_conductor: string
  id_usuario: string
  rut: string
  estado_verificacion: 'pendiente' | 'aprobado' | 'rechazado'
  disponible: boolean
  latitud_actual?: number
  longitud_actual?: number
}