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
      lp.forma_pago,
      lp.total,
      lp.estado_pago,
      -- Items del pedido
      (
        SELECT json_agg(
          json_build_object(
            'producto_sku', pi.producto_sku,
            'cantidad', pi.cantidad,
            'precio_unitario', pi.precio_unitario,
            'producto_descripcion', COALESCE(
              pr.descripcion_larga,
              pr.marca || ' ' || pr.familia || ' ' || pr.medida
            )
          )
        )
        FROM pedido_items pi
        LEFT JOIN products pr ON pr.sku = pi.producto_sku
        WHERE pi.pedido_id = lp.id
      ) as items,
      t.tipo as tipo_entrega,
      t.estado_turno as estado_turno,
      t.fecha as fecha_turno,
      t.hora_inicio,
      t.observaciones,
      -- Datos del cliente desde turnos
      t.datos_envio->>'email' as cliente_email,
      t.datos_envio->>'telefono' as cliente_telefono_contacto,
      t.datos_envio
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
  }

  // Obtener items del pedido
  const items = (pedidoRaw.items || []).map((item: any, index: number) => ({
    id: String(index + 1),
    cantidad: Number(item.cantidad || 1),
    precio_unitario: Number(item.precio_unitario || 0),
    subtotal: Number(item.cantidad || 1) * Number(item.precio_unitario || 0),
    codigo: item.producto_sku || `ITEM-${index + 1}`,
    descripcion: item.producto_descripcion || 'Sin descripción',
  }))

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
