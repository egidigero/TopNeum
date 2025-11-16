import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"
import { PedidoDetail } from "@/components/pedidos/pedido-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  await getSession()

  // El ID puede ser lead_id o pedido_id, intentar ambos
  const pedidosRaw = await sql`
    SELECT 
      l.id as lead_id,
      l.telefono_whatsapp,
      l.nombre_cliente,
      l.region,
      l.estado as estado_lead,
      l.notas,
      l.created_at,
      l.updated_at,
      lp.id as pedido_id,
      lp.producto_descripcion,
      lp.productos,
      lp.cantidad_total,
      lp.forma_pago,
      lp.total,
      lp.estado_pago,
      t.tipo as tipo_entrega,
      t.estado as estado_turno,
      t.fecha as fecha_turno,
      t.hora_inicio,
      t.observaciones,
      -- Datos del cliente desde turnos
      t.email as cliente_email,
      t.telefono as cliente_telefono_contacto,
      t.datos_envio,
      -- Datos de envío si aplica
      t.transportista,
      t.numero_tracking,
      t.estado_envio,
      t.fecha_envio,
      t.fecha_entrega_estimada
    FROM leads l
    LEFT JOIN lead_pedidos lp ON lp.lead_id = l.id
    LEFT JOIN turnos t ON t.lead_id = l.id
    WHERE l.id = ${params.id} OR lp.id = ${params.id}
    LIMIT 1
  `

  if (pedidosRaw.length === 0) {
    notFound()
  }

  const pedidoRaw = pedidosRaw[0]
  
  // Construir dirección desde datos_envio (jsonb) o datos de turno
  let direccionCompleta = 'Sin dirección especificada'
  if (pedidoRaw.datos_envio) {
    const envio = pedidoRaw.datos_envio
    direccionCompleta = [
      envio.direccion,
      envio.localidad,
      envio.provincia,
      envio.codigo_postal
    ].filter(Boolean).join(', ')
  }

  const pedido = {
    id: String(pedidoRaw.pedido_id || pedidoRaw.lead_id),
    cliente_nombre: String(pedidoRaw.nombre_cliente || 'Sin nombre'),
    cliente_telefono: String(pedidoRaw.cliente_telefono_contacto || pedidoRaw.telefono_whatsapp || ''),
    cliente_email: pedidoRaw.cliente_email || null,
    estado: String(pedidoRaw.estado_turno || pedidoRaw.estado_pago || 'pendiente_preparacion'),
    direccion: direccionCompleta,
    tipo_entrega: String(pedidoRaw.tipo_entrega || 'retiro'),
    items_total: Number(pedidoRaw.total || 0),
    notas: pedidoRaw.notas || pedidoRaw.observaciones || null,
    created_at: String(pedidoRaw.created_at),
    updated_at: String(pedidoRaw.updated_at),
    // Datos de envío
    transportista: pedidoRaw.transportista || null,
    numero_tracking: pedidoRaw.numero_tracking || null,
    estado_envio: pedidoRaw.estado_envio || null,
    fecha_envio: pedidoRaw.fecha_envio ? String(pedidoRaw.fecha_envio) : null,
    fecha_entrega_estimada: pedidoRaw.fecha_entrega_estimada ? String(pedidoRaw.fecha_entrega_estimada) : null,
  }

  // Parsear productos desde producto_descripcion (texto) o productos (jsonb)
  const items = []
  
  if (pedidoRaw.producto_descripcion) {
    // Parsear descripción: "Yokohama BLUEARTH ES32 185/60R15 84H"
    const desc = String(pedidoRaw.producto_descripcion)
    const parts = desc.split(' ')
    const marca = parts[0] || ''
    const diseno = parts.slice(1, -1).join(' ') || ''
    const medida = parts[parts.length - 1] || ''
    
    items.push({
      id: '1',
      cantidad: Number(pedidoRaw.cantidad_total || 4),
      precio_unitario: Number(pedidoRaw.total || 0) / Number(pedidoRaw.cantidad_total || 4),
      subtotal: Number(pedidoRaw.total || 0),
      marca: marca,
      diseno: diseno.replace(/\d+[HVT]$/, ''), // Quitar índice del final
      modelo: diseno,
      medida: medida.replace(/\d+[HVT]$/, ''), // Extraer solo la medida sin índice
      codigo: desc.substring(0, 20).toUpperCase().replace(/\s+/g, '-'),
    })
  } else if (pedidoRaw.productos && Array.isArray(pedidoRaw.productos)) {
    // Si hay productos en formato jsonb array
    pedidoRaw.productos.forEach((prod: any, idx: number) => {
      items.push({
        id: String(idx + 1),
        cantidad: Number(prod.cantidad || pedidoRaw.cantidad_total || 1),
        precio_unitario: Number(prod.precio || 0),
        subtotal: Number(prod.precio || 0) * Number(prod.cantidad || 1),
        marca: String(prod.marca || ''),
        diseno: String(prod.modelo || prod.diseno || ''),
        modelo: String(prod.modelo || ''),
        medida: String(prod.medida || ''),
        codigo: String(prod.sku || prod.codigo || ''),
      })
    })
  }

  return (
    <div className="p-8">
      <Link href="/pedidos">
        <Button variant="outline" className="mb-4 border-slate-300">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Pedidos
        </Button>
      </Link>
      <PedidoDetail pedido={pedido} items={items} />
    </div>
  )
}
