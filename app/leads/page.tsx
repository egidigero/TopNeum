import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LeadsViewWrapper } from "@/components/leads"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default async function LeadsPage() {
  const user = await getSession()

  // Fetch all leads with related data including ALL consultas and cotizaciones
  const leadsRaw = await sql`
    SELECT 
      l.id,
      l.telefono_whatsapp,
      l.nombre_cliente,
      l.region,
      l.estado,
      l.ultima_interaccion,
      l.created_at,
      l.updated_at,
      l.origen,
      l.codigo_confirmacion,
      l.notas,
      -- 🆕 TODAS las consultas como array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', lc.id,
            'medida_neumatico', lc.medida_neumatico,
            'marca_preferida', lc.marca_preferida,
            'tipo_vehiculo', lc.tipo_vehiculo,
            'cantidad', lc.cantidad,
            'created_at', lc.created_at
          ) ORDER BY lc.created_at DESC
        ), '[]'::json)
        FROM lead_consultas lc WHERE lc.lead_id = l.id
      ) as consultas,
      -- 🆕 TODAS las cotizaciones como array
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
      -- Pedidos con items (para analytics)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', lp.id,
            'total', lp.total,
            'forma_pago', lp.forma_pago,
            'estado_pago', lp.estado_pago,
            'created_at', lp.created_at,
            'items', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'producto_sku', pi.producto_sku,
                  'cantidad', pi.cantidad,
                  'precio_unitario', pi.precio_unitario,
                  'subtotal', pi.subtotal,
                  'producto_descripcion', COALESCE(
                    p.familia || ' ' || p.marca || ' ' || p.diseno || ' ' || p.medida,
                    'Producto no encontrado'
                  )
                )
              ), '[]'::json)
              FROM pedido_items pi
              LEFT JOIN products p ON p.sku = pi.producto_sku
              WHERE pi.pedido_id = lp.id
            )
          ) ORDER BY lp.created_at DESC
        ), '[]'::json)
        FROM lead_pedidos lp
        WHERE lp.lead_id = l.id
      ) as pedidos,
      -- Última consulta para retrocompatibilidad
      (SELECT medida_neumatico FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as medida_neumatico,
      (SELECT marca_preferida FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as marca_preferida,
      (SELECT tipo_vehiculo FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as tipo_vehiculo,
      -- Datos adicionales de pedidos
      (SELECT forma_pago FROM lead_pedidos WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as forma_pago,
      (SELECT total FROM lead_pedidos WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as ultimo_total,
      -- Contadores
      (SELECT COUNT(*) FROM lead_consultas WHERE lead_id = l.id) as total_consultas,
      (SELECT COUNT(*) FROM lead_pedidos WHERE lead_id = l.id) as total_pedidos,
      (SELECT COUNT(*) FROM lead_pedidos WHERE lead_id = l.id AND estado_pago IN ('pagado', 'sena_recibida')) as pagos_count,
      -- Información de turnos
      (SELECT COUNT(*) FROM turnos WHERE lead_id = l.id AND estado_turno != 'cancelado') as tiene_turno,
      (SELECT fecha FROM turnos WHERE lead_id = l.id AND estado_turno != 'cancelado' ORDER BY created_at DESC LIMIT 1) as turno_fecha,
      (SELECT hora_inicio FROM turnos WHERE lead_id = l.id AND estado_turno != 'cancelado' ORDER BY created_at DESC LIMIT 1) as turno_hora,
      (SELECT estado_turno FROM turnos WHERE lead_id = l.id AND estado_turno != 'cancelado' ORDER BY created_at DESC LIMIT 1) as turno_estado
    FROM leads l
    WHERE l.estado NOT IN ('pedido_confirmado', 'perdido')
    ORDER BY l.ultima_interaccion DESC
  `

  const leads = leadsRaw.map((l: any) => ({
    id: String(l.id),
    nombre: String(l.nombre_cliente || ''),
    telefono: String(l.telefono_whatsapp || ''),
    canal: 'whatsapp',
    estado: String(l.estado || 'nuevo') as "nuevo" | "en_conversacion" | "cotizado" | "esperando_pago" | "pago_informado" | "pedido_confirmado" | "perdido",
    region: String(l.region || 'INTERIOR'),
    codigo_confirmacion: l.codigo_confirmacion || null,
    // 🆕 TODAS las consultas
    consultas: Array.isArray(l.consultas) ? l.consultas.map((c: any) => ({
      id: String(c.id),
      medida_neumatico: String(c.medida_neumatico || ''),
      marca_preferida: c.marca_preferida || null,
      tipo_vehiculo: c.tipo_vehiculo || null,
      cantidad: Number(c.cantidad || 4),
      created_at: String(c.created_at),
    })) : [],
    // 🆕 TODAS las cotizaciones
    cotizaciones: Array.isArray(l.cotizaciones) ? l.cotizaciones.map((cot: any) => ({
      id: String(cot.id),
      productos_mostrados: cot.productos_mostrados || [],
      precio_total_contado: Number(cot.precio_total_contado || 0),
      precio_total_3cuotas: Number(cot.precio_total_3cuotas || 0),
      region: String(cot.region || 'INTERIOR'),
      created_at: String(cot.created_at),
    })) : [],
    // Pedidos con items
    pedidos: Array.isArray(l.pedidos) ? l.pedidos.map((p: any) => ({
      id: String(p.id),
      total: Number(p.total || 0),
      forma_pago: String(p.forma_pago || ''),
      estado_pago: p.estado_pago || null,
      created_at: String(p.created_at),
      items: Array.isArray(p.items) ? p.items : [],
    })) : [],
    // Última consulta para retrocompatibilidad
    medida_neumatico: l.medida_neumatico || null,
    marca_preferida: l.marca_preferida || null,
    tipo_vehiculo: l.tipo_vehiculo || null,
    forma_pago: l.forma_pago || null,
    ultimo_total: l.ultimo_total ? Number(l.ultimo_total) : null,
    // Contadores
    total_consultas: Number(l.total_consultas || 0),
    total_pedidos: Number(l.total_pedidos || 0),
    pagos_count: Number(l.pagos_count || 0),
    // Información de turnos
    tiene_turno: Number(l.tiene_turno || 0) > 0,
    turno_fecha: l.turno_fecha ? String(l.turno_fecha) : null,
    turno_hora: l.turno_hora ? String(l.turno_hora) : null,
    turno_estado: l.turno_estado ? String(l.turno_estado) : null,
    // Otros
    ultima_interaccion: l.ultima_interaccion || null,
    created_at: String(l.created_at),
    origen: String(l.origen || 'whatsapp'),
    ultimo_contacto_at: l.ultima_interaccion || null,
    mensaje_inicial: '',
    notas: l.notas || null,
  }))

  // Fetch users for assignment
  const usersRaw = await sql`
    SELECT id, nombre, role
    FROM users
    WHERE activo = true
    ORDER BY nombre
  `

  const users = usersRaw.map((u: any) => ({
    id: String(u.id),
    nombre: String(u.nombre || ''),
    role: String(u.role || 'vendedor'),
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Clientes WhatsApp</h1>
            <p className="text-slate-600">Seguimiento de leads y funnel de ventas</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Image 
            src="/images/image.png" 
            alt="TopNeum" 
            width={200} 
            height={60}
            className="h-12 w-auto"
            priority
          />
          <Link href="/leads/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Lead
            </Button>
          </Link>
        </div>
      </div>

      <LeadsViewWrapper leads={leads} users={users} currentUser={user!} />
    </div>
  )
}
