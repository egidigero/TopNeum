import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PedidosTable } from "@/components/pedidos/pedidos-table"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PedidosPage() {
  const user = await getSession()

  // Fetch pedidos (clientes que ya confirmaron pago)
  const pedidosRaw = await sql`
    SELECT 
      l.id as lead_id,
      l.telefono_whatsapp,
      l.nombre_cliente,
      l.region,
      l.estado as estado_lead,
      l.whatsapp_label,
      l.codigo_confirmacion,
      p.id as pedido_id,
      p.productos,
      p.cantidad_total,
      p.forma_pago,
      p.subtotal,
      p.descuento_porcentaje,
      p.total,
      p.estado_pago,
      p.comprobante_url,
      p.created_at as fecha_pedido,
      p.fecha_pago,
      -- Datos de turno (tabla turnos unificada)
      t.id as turno_id,
      t.tipo as tipo_entrega,
      t.fecha as fecha_turno,
      t.hora_inicio as hora_turno,
      t.estado as estado_turno,
      t.estado_pago as turno_estado_pago,
      t.observaciones
    FROM leads l
    INNER JOIN lead_pedidos p ON p.lead_id = l.id
    LEFT JOIN turnos t ON t.lead_id = l.id
    WHERE l.estado IN ('pedido_confirmado', 'turno_agendado', 'pedido_enviado', 'pedido_finalizado')
    ORDER BY p.created_at DESC
  `

  const pedidos = pedidosRaw.map((p: any) => ({
    id: String(p.pedido_id),
    lead_id: String(p.lead_id),
    cliente_nombre: String(p.nombre_cliente || 'Sin nombre'),
    cliente_telefono: String(p.telefono_whatsapp),
    codigo_confirmacion: String(p.codigo_confirmacion || ''),
    region: String(p.region),
    estado_lead: String(p.estado_lead),
    whatsapp_label: String(p.whatsapp_label),
    productos: p.productos,
    cantidad_total: Number(p.cantidad_total),
    forma_pago: String(p.forma_pago),
    subtotal: Number(p.subtotal),
    descuento_porcentaje: Number(p.descuento_porcentaje || 0),
    total: Number(p.total),
    estado_pago: String(p.estado_pago),
    comprobante_url: p.comprobante_url,
    fecha_pedido: String(p.fecha_pedido),
    fecha_pago: p.fecha_pago ? String(p.fecha_pago) : null,
    // Turno (usando tabla turnos unificada)
    turno_id: p.turno_id ? String(p.turno_id) : null,
    tipo_entrega: p.tipo_entrega || null,
    fecha_turno: p.fecha_turno ? String(p.fecha_turno) : null,
    hora_turno: p.hora_turno ? String(p.hora_turno) : null,
    estado_turno: p.estado_turno || null,
    turno_estado_pago: p.turno_estado_pago || 'pendiente', // 🆕 Estado de pago del turno
    observaciones: p.observaciones || null,
    items_count: Number(p.cantidad_total || 0),
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Pedidos Confirmados</h1>
            <p className="text-slate-600">
              Clientes que ya realizaron el pago - Total: {pedidos.length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <PedidosTable pedidos={pedidos} />
        </div>
      </div>
    </div>
  )
}
