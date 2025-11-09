import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LeadsKanban } from "@/components/leads/leads-kanban"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function LeadsPage() {
  const user = await getSession()

  // Fetch all leads with related data
  const leadsRaw = await sql`
    SELECT 
      l.id,
      l.telefono_whatsapp,
      l.nombre_cliente,
      l.region,
      l.estado,
      l.whatsapp_label,
      l.ultima_interaccion,
      l.asignado_a,
      l.created_at,
      l.updated_at,
      l.origen,
      u.nombre as asignado_nombre,
      -- Datos adicionales
      (SELECT medida_neumatico FROM lead_consultas WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as ultima_medida,
      (SELECT COUNT(*) FROM lead_consultas WHERE lead_id = l.id) as total_consultas,
      (SELECT COUNT(*) FROM lead_pedidos WHERE lead_id = l.id) as total_pedidos,
      (SELECT COUNT(*) FROM lead_pedidos WHERE lead_id = l.id AND estado_pago IN ('pagado', 'sena_recibida')) as pagos_count
    FROM leads l
    LEFT JOIN users u ON l.asignado_a = u.id
    WHERE l.estado NOT IN ('pedido_finalizado', 'abandonado')
    ORDER BY l.ultima_interaccion DESC
  `

  const leads = leadsRaw.map((l: any) => ({
    id: String(l.id),
    nombre: String(l.nombre_cliente || ''),
    telefono: String(l.telefono_whatsapp || ''),
    canal: 'whatsapp',
    estado: String(l.estado || 'conversacion_iniciada') as "conversacion_iniciada" | "consulta_producto" | "cotizacion_enviada" | "en_proceso_de_pago" | "pagado" | "turno_pendiente" | "turno_agendado" | "abandonado",
    region: String(l.region || 'INTERIOR'),
    whatsapp_label: String(l.whatsapp_label || 'en caliente'),
    ultima_medida: l.ultima_medida || null,
    total_consultas: Number(l.total_consultas || 0),
    total_pedidos: Number(l.total_pedidos || 0),
    asignado_a: l.asignado_a ? String(l.asignado_a) : null,
    asignado_nombre: l.asignado_nombre || null,
    ultima_interaccion: l.ultima_interaccion || null,
    created_at: String(l.created_at),
    origen: String(l.origen || 'whatsapp'),
    ultimo_contacto_at: l.ultima_interaccion || null, // Usar ultima_interaccion en lugar de ultimo_contacto_at
    pagos_count: Number(l.pagos_count || 0),
    mensaje_inicial: '', // No existe en nueva tabla
    notas: null, // No existe en nueva tabla
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
        <Link href="/leads/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Lead
          </Button>
        </Link>
      </div>

      <LeadsKanban leads={leads} users={users} currentUser={user!} />
    </div>
  )
}
