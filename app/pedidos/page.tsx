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
      l.notas,
      -- Datos de consultas (para obtener productos si no están en pedidos)
      (SELECT medida_neumatico FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as medida_neumatico,
      (SELECT marca_preferida FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as marca_preferida,
      (SELECT tipo_vehiculo FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as tipo_vehiculo,
      (SELECT cantidad FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as cantidad_consulta,
      p.id as pedido_id,
      p.forma_pago,
      p.total,
      p.estado_pago,
      p.created_at as fecha_pedido,
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
        WHERE pi.pedido_id = p.id
      ) as items,
      -- Cotizaciones (productos mostrados al cliente)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', lcot.id,
            'productos_mostrados', lcot.productos_mostrados,
            'precio_total_contado', lcot.precio_total_contado,
            'precio_total_3cuotas', lcot.precio_total_3cuotas,
            'region', lcot.region,
            'created_at', lcot.created_at
          ) ORDER BY lcot.created_at DESC
        ), '[]'::json)
        FROM lead_cotizaciones lcot WHERE lcot.lead_id = l.id
      ) as cotizaciones,
      -- Datos de turno/envío (tabla turnos unificada)
      t.id as turno_id,
      t.tipo as tipo_entrega,
      t.fecha as fecha_turno,
      t.hora_inicio as hora_turno,
      t.estado_turno as estado_turno,
      t.observaciones,
      t.datos_envio,
      -- Extraer datos del cliente desde datos_envio JSONB (si existe)
      t.datos_envio->>'email' as email,
      t.datos_envio->>'dni' as dni,
      t.datos_envio->>'direccion' as direccion,
      t.datos_envio->>'localidad' as localidad,
      t.datos_envio->>'provincia' as provincia,
      t.datos_envio->>'codigo_postal' as codigo_postal
    FROM leads l
    LEFT JOIN lead_pedidos p ON p.lead_id = l.id
    LEFT JOIN turnos t ON t.lead_id = l.id
    WHERE l.estado = 'pedido_confirmado'
      AND l.codigo_confirmacion IS NOT NULL
      AND l.codigo_confirmacion != ''
    ORDER BY l.updated_at DESC
  `

  const pedidos = pedidosRaw.map((p: any) => {
    // Obtener productos desde items o construir desde consultas
    let productos = p.items || []
    if (productos.length === 0 && (p.medida_neumatico || p.marca_preferida)) {
      // Construir producto desde datos de consultas como ARRAY
      productos = [{
        producto_sku: null,
        cantidad: p.cantidad_consulta || 4,
        precio_unitario: p.total ? p.total / (p.cantidad_consulta || 4) : 0,
        producto_descripcion: `${p.marca_preferida || 'Sin marca'} ${p.medida_neumatico || ''} - ${p.tipo_vehiculo || ''}`.trim()
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
      // Productos
      productos: productos,
      cotizaciones: p.cotizaciones || [],
      notas: p.notas || null,
      // Datos del pedido
      forma_pago: String(p.forma_pago || 'Sin especificar'),
      total: Number(p.total || 0),
      estado_pago: String(p.estado_pago || 'confirmado'),
      fecha_pedido: p.fecha_pedido ? String(p.fecha_pedido) : new Date().toISOString(),
      // Turno/Envío
      turno_id: p.turno_id ? String(p.turno_id) : null,
      tipo_entrega: p.tipo_entrega || null,
      fecha_turno: p.fecha_turno ? String(p.fecha_turno) : null,
      hora_turno: p.hora_turno ? String(p.hora_turno) : null,
      estado_turno: p.estado_turno || null,
      observaciones: p.observaciones || null,
      datos_envio: p.datos_envio || null,
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
