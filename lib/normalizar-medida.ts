/**
 * Normaliza medidas de neumáticos a formato estándar
 * Útil para búsquedas y cuando clientes escriben medidas en distintos formatos
 */

export interface MedidaNormalizada {
  medida: string      // Formato estándar: "205/55R16"
  indice?: string     // Índice si está presente: "91H"
  original: string    // La medida original que entró
  valida: boolean     // Si se pudo normalizar correctamente
}

/**
 * Normaliza una medida de neumático a formato estándar
 * 
 * Ejemplos de entrada → salida:
 * - "205/55R16" → "205/55R16"
 * - "205/55/16" → "205/55R16"
 * - "205 55 16" → "205/55R16"
 * - "205-55-16" → "205/55R16"
 * - "205/55r16" → "205/55R16"
 * - "205/55R16-91H" → medida: "205/55R16", indice: "91H"
 * - "205/55R1691H" → medida: "205/55R16", indice: "91H"
 */
export function normalizarMedida(input: string): MedidaNormalizada {
  if (!input || typeof input !== 'string') {
    return {
      medida: '',
      original: input || '',
      valida: false
    }
  }

  const original = input.trim()
  let texto = original.toUpperCase()

  // Separar índice si viene con guion
  let indice: string | undefined
  if (texto.includes('-')) {
    const partes = texto.split('-')
    texto = partes[0]
    indice = partes.slice(1).join('-').trim()
  }

  // Casos especiales: medidas de camioneta/4x4
  // Ej: "31X10.50R15LT", "33X12.50R17", "30X9.50R15"
  if (texto.match(/^\d{2}X\d+\.?\d*R\d{2}/)) {
    // Ya está en formato correcto
    const match = texto.match(/^(\d{2}X\d+\.?\d*R\d{2})(LT)?(C)?(.*)$/)
    if (match) {
      const medida = match[1] + (match[2] || '') + (match[3] || '')
      indice = indice || match[4]?.trim() || undefined
      return {
        medida,
        indice,
        original,
        valida: true
      }
    }
  }

  // Casos especiales: medidas con letras adelante (LT, P, etc)
  if (texto.match(/^(LT|P)\d{3}/)) {
    // "LT235/75R15" → formato correcto
    const match = texto.match(/^([A-Z]+)(\d{3})[\/\-\s]?(\d{2})[RrCc]?(\d{2})(.*)$/)
    if (match) {
      const medida = `${match[1]}${match[2]}/${match[3]}R${match[4]}`
      indice = indice || match[5]?.trim() || undefined
      return {
        medida,
        indice,
        original,
        valida: true
      }
    }
  }

  // Casos especiales: medidas tipo "155R12C", "185R14C"
  if (texto.match(/^\d{3}R\d{2}C?$/)) {
    const match = texto.match(/^(\d{3}R\d{2})(C)?(.*)$/)
    if (match) {
      const medida = match[1] + (match[2] || '')
      indice = indice || match[3]?.trim() || undefined
      return {
        medida,
        indice,
        original,
        valida: true
      }
    }
  }

  // Formato estándar: 205/55R16, 205-55-16, 205 55 16, etc
  // Regex: (ancho) separador (perfil) separador R? (rodado)
  const match = texto.match(/^(\d{3})[\/\-\s]?(\d{2})[\/\-\s]?[RrZz]?(\d{2})(.*)$/)
  
  if (match) {
    const ancho = match[1]
    const perfil = match[2]
    const rodado = match[3]
    const resto = match[4]?.trim()

    // Detectar si tiene rating Z (alta velocidad)
    const tieneZ = original.toUpperCase().includes('ZR')
    const r = tieneZ ? 'ZR' : 'R'

    const medida = `${ancho}/${perfil}${r}${rodado}`
    
    // Si no hay índice previo, intentar extraerlo del resto
    if (!indice && resto) {
      // Buscar índice de carga/velocidad: XXH, XXY, XXW, etc
      const indiceMatch = resto.match(/^(\d{2,3}[A-Z]+)/)
      if (indiceMatch) {
        indice = indiceMatch[1]
      }
    }

    return {
      medida,
      indice,
      original,
      valida: true
    }
  }

  // Si no coincide con ningún patrón, devolver inválido
  return {
    medida: texto,
    original,
    valida: false
  }
}

/**
 * Normaliza solo la parte de la medida (sin índice) para búsquedas flexibles
 * Útil para comparaciones en SQL: REPLACE(REPLACE(medida, '/', ''), ' ', '')
 */
export function normalizarParaBusqueda(medida: string): string {
  const normalizada = normalizarMedida(medida)
  if (!normalizada.valida) return medida.toUpperCase()
  
  // Quitar separadores para búsqueda flexible
  return normalizada.medida
    .replace(/\//g, '')
    .replace(/\-/g, '')
    .replace(/\s/g, '')
    .toUpperCase()
}

/**
 * Ejemplos de uso:
 * 
 * const ejemplos = [
 *   "205/55R16",
 *   "205/55/16",
 *   "205 55 16",
 *   "205-55-16",
 *   "205/55r16-91H",
 *   "31X10.50R15LT",
 *   "LT235/75R15",
 *   "155R12C",
 * ]
 * 
 * ejemplos.forEach(ej => {
 *   const resultado = normalizarMedida(ej)
 *   console.log(`"${ej}" → medida: "${resultado.medida}", índice: "${resultado.indice || 'N/A'}"`)
 * })
 */
