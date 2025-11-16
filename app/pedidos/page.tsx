import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PedidosTable } from "@/components/pedidos/pedidos-table"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PedidosPage() {
  const user = await getSession()

  // Fetch pedidos (leads con estado 'pedido_confirmado' - coincide con dashboard)
  const pedidosRaw = await sql`
    SELECT 
      l.id as lead_id,
      l.telefono_whatsapp,
      l.nombre_cliente,
      l.region,
      l.estado as estado_lead,
      l.codigo_confirmacion,
      l.email,
      l.dni,
      l.direccion,
      l.localidad,
      l.provincia,
      l.codigo_postal,
      l.notas,
      -- Datos de consultas (para obtener productos si no están en pedidos)
      (SELECT medida_neumatico FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as medida_neumatico,
      (SELECT marca_preferida FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as marca_preferida,
      (SELECT tipo_vehiculo FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as tipo_vehiculo,
      (SELECT forma_pago FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as forma_pago_consulta,
      (SELECT cantidad FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as cantidad_consulta,
      p.id as pedido_id,
      p.productos,
      p.producto_descripcion,
      p.cantidad_total,
      p.forma_pago,
      p.subtotal,
      p.descuento_porcentaje,
      p.total,
      p.estado_pago,
      p.comprobante_url,
      p.created_at as fecha_pedido,
      p.fecha_pago,
      -- Datos de turno/envío (tabla turnos unificada)
      t.id as turno_id,
      t.tipo as tipo_entrega,
      t.fecha as fecha_turno,
      t.hora_inicio as hora_turno,
      t.estado as estado_turno,
      t.estado_pago as turno_estado_pago,
      t.observaciones,
      t.datos_envio
    FROM leads l
    LEFT JOIN lead_pedidos p ON p.lead_id = l.id
    LEFT JOIN turnos t ON t.lead_id = l.id
    WHERE l.estado = 'pedido_confirmado'
      AND l.codigo_confirmacion IS NOT NULL
      AND l.codigo_confirmacion != ''
    ORDER BY l.updated_at DESC
  `

  const pedidos = pedidosRaw.map((p: any) => {
    // Obtener productos: primero de lead_pedidos.productos, si no construir desde consultas
    let productos = p.productos
    if (!productos && (p.medida_neumatico || p.marca_preferida)) {
      // Construir producto desde datos de consultas como ARRAY
      productos = [{
        marca: p.marca_preferida || 'Sin marca',
        modelo: '',
        medida: p.medida_neumatico || '',
        precio: p.total || 0,
        descripcion: `${p.tipo_vehiculo || ''} - ${p.cantidad_consulta || ''} neumáticos`.trim()
      }]
    }

    return {
      id: String(p.pedido_id || p.lead_id), // Usar lead_id si no hay pedido_id
      lead_id: String(p.lead_id),
      cliente_nombre: String(p.nombre_cliente || 'Sin nombre'),
      cliente_telefono: String(p.telefono_whatsapp),
      codigo_confirmacion: String(p.codigo_confirmacion || ''),
      region: String(p.region),
      estado_lead: String(p.estado_lead),
      // Datos del cliente
      email: p.email || null,
      dni: p.dni || null,
      direccion: p.direccion || null,
      localidad: p.localidad || null,
      provincia: p.provincia || null,
      codigo_postal: p.codigo_postal || null,
      notas: p.notas || null,
      // Datos del pedido
      productos: productos || null,
      producto_descripcion: p.producto_descripcion || null,
      cantidad_total: Number(p.cantidad_total || p.cantidad_consulta || 0),
      forma_pago: String(p.forma_pago || p.forma_pago_consulta || 'Sin especificar'),
      subtotal: Number(p.subtotal || 0),
      descuento_porcentaje: Number(p.descuento_porcentaje || 0),
      total: Number(p.total || 0),
      estado_pago: String(p.estado_pago || 'confirmado'),
      comprobante_url: p.comprobante_url || null,
      fecha_pedido: p.fecha_pedido ? String(p.fecha_pedido) : new Date().toISOString(),
      fecha_pago: p.fecha_pago ? String(p.fecha_pago) : null,
      // Turno/Envío
      turno_id: p.turno_id ? String(p.turno_id) : null,
      tipo_entrega: p.tipo_entrega || null,
      fecha_turno: p.fecha_turno ? String(p.fecha_turno) : null,
      hora_turno: p.hora_turno ? String(p.hora_turno) : null,
      estado_turno: p.estado_turno || null,
      turno_estado_pago: p.turno_estado_pago || 'pendiente',
      observaciones: p.observaciones || null,
      datos_envio: p.datos_envio || null,
      items_count: Number(p.cantidad_total || p.cantidad_consulta || 0),
    }
  })

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
