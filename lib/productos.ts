/**
 * Utilidades para manejo de productos en pedidos
 */

export interface Producto {
  sku?: string
  marca: string
  modelo: string
  medida: string
  diseno?: string
  indice?: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

/**
 * Convierte un array de productos a texto descriptivo para WhatsApp
 * Ej: "4x Yokohama BLUEARTH ES32 185/60R15 84H - $487,996"
 */
export function productosATexto(productos: Producto[]): string {
  if (!productos || productos.length === 0) {
    return ''
  }

  return productos.map(p => {
    const partes = [p.marca, p.modelo, p.medida, p.indice].filter(Boolean)
    const descripcion = partes.join(' ')
    const cantidad = p.cantidad > 1 ? `${p.cantidad}x ` : ''
    const precio = p.subtotal ? ` - $${p.subtotal.toLocaleString('es-AR')}` : ''
    return `${cantidad}${descripcion}${precio}`
  }).join('\n')
}

/**
 * Convierte datos legacy o texto simple a formato de producto estructurado
 */
export function normalizarProducto(data: any): Producto {
  // Si ya es un objeto estructurado
  if (data.marca && data.medida) {
    return {
      sku: data.sku || null,
      marca: data.marca,
      modelo: data.modelo || '',
      medida: data.medida,
      diseno: data.diseno || null,
      indice: data.indice || null,
      cantidad: data.cantidad || 4,
      precio_unitario: data.precio_unitario || 0,
      subtotal: data.subtotal || (data.precio_unitario * data.cantidad) || 0
    }
  }

  // Si es texto simple: "Yokohama BLUEARTH ES32 185/60R15 84H"
  if (typeof data === 'string') {
    const partes = data.split(' ').filter(Boolean)
    return {
      marca: partes[0] || '',
      modelo: partes[1] || '',
      medida: partes[2] || '',
      indice: partes[3] || undefined,
      diseno: undefined,
      cantidad: 4,
      precio_unitario: 0,
      subtotal: 0
    }
  }

  throw new Error('Formato de producto inválido')
}

/**
 * Procesa input del agente y retorna array de productos + texto descriptivo
 */
export function procesarProductosInput(input: {
  productos?: Producto[]
  producto_descripcion?: string
  marca?: string
  modelo?: string
  medida?: string
  diseno?: string
  cantidad?: number
  precio_unitario?: number
  precio_final?: number
}): {
  productos: Producto[]
  producto_descripcion: string
} {
  // Caso 1: Ya viene array de productos estructurado
  if (input.productos && Array.isArray(input.productos) && input.productos.length > 0) {
    return {
      productos: input.productos.map(normalizarProducto),
      producto_descripcion: input.producto_descripcion || productosATexto(input.productos)
    }
  }

  // Caso 2: Viene un solo producto en campos separados (legacy)
  if (input.marca && input.medida) {
    const cantidad = input.cantidad || 4
    const precio_unitario = input.precio_unitario || (input.precio_final ? input.precio_final / cantidad : 0)
    const producto: Producto = {
      marca: input.marca,
      modelo: input.modelo || '',
      medida: input.medida,
      diseno: input.diseno || undefined,
      cantidad,
      precio_unitario,
      subtotal: precio_unitario * cantidad
    }
    return {
      productos: [producto],
      producto_descripcion: input.producto_descripcion || productosATexto([producto])
    }
  }

  // Caso 3: Solo viene texto descriptivo (mantener como estaba)
  if (input.producto_descripcion) {
    return {
      productos: [],
      producto_descripcion: input.producto_descripcion
    }
  }

  // Caso 4: Nada
  return {
    productos: [],
    producto_descripcion: ''
  }
}

/**
 * Calcula totales de un pedido
 */
export function calcularTotales(productos: Producto[]): {
  cantidad_total: number
  subtotal: number
} {
  const cantidad_total = productos.reduce((sum, p) => sum + p.cantidad, 0)
  const subtotal = productos.reduce((sum, p) => sum + p.subtotal, 0)
  
  return { cantidad_total, subtotal }
}
