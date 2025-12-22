// Tipo común para Lead usado en todo el sistema

export type LeadEstado =
  | "nuevo"
  | "en_conversacion"
  | "cotizado"
  | "esperando_pago"
  | "pago_informado"
  | "pedido_confirmado"
  | "perdido"

export interface Lead {
  id: string
  nombre?: string
  nombre_cliente?: string
  telefono?: string
  telefono_whatsapp?: string
  canal?: string
  region: string
  estado: LeadEstado
  ultima_interaccion: string | null
  created_at: string
  updated_at?: string
  origen?: string
  codigo_confirmacion?: string | null
  notas?: string | null
  
  // Campos para analytics
  ultimo_total?: number | null
  forma_pago?: string | null
  producto_descripcion?: string | null
  
  // Consultas y cotizaciones (múltiples)
  consultas?: Array<{
    id?: string
    medida_neumatico: string
    marca_preferida: string | null
    tipo_vehiculo: string | null
    cantidad: number
    created_at?: string
  }> | null
  
  cotizaciones?: Array<{
    id?: string
    productos_mostrados: any
    precio_total_contado: number
    precio_total_3cuotas?: number
    region: string
    created_at?: string
  }> | null
  
  // Pedidos
  pedidos?: Array<{
    id?: string
    total: number
    forma_pago: string
    estado_pago?: string
    created_at?: string
    items?: Array<{
      producto_sku: string
      cantidad: number
      precio_unitario: number
      producto_descripcion: string
    }>
  }> | null
  
  // Campos adicionales
  tipo_uso?: string | null
  pagos_count?: number
  tiene_turno?: boolean | number
  turno_fecha?: string | null
  turno_hora?: string | null
  turno_estado?: string | null
  total_consultas?: number
  total_pedidos?: number
  medida_neumatico?: string | null
  marca_preferida?: string | null
  tipo_vehiculo?: string | null
  ultimo_contacto_at?: string | null
  mensaje_inicial?: string
  fecha_creacion?: string
  cantidad?: number | null
  precio_final?: number | null
  forma_pago_detalle?: string | null
}
