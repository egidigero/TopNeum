import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { TicketsTable } from "@/components/tickets/tickets-table"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function TicketsPage() {
  await getSession()

  const ticketsRaw = await sql`
    SELECT 
      t.id,
      t.lead_id,
      t.tipo,
      t.descripcion,
      t.prioridad,
      t.estado,
      t.asignado_a,
      t.created_at,
      t.updated_at,
      t.fecha_resolucion,
      l.nombre_cliente,
      l.telefono_whatsapp,
      l.region
    FROM lead_tickets t
    JOIN leads l ON l.id = t.lead_id
    ORDER BY 
      CASE t.prioridad
        WHEN 'urgente' THEN 1
        WHEN 'alta' THEN 2
        WHEN 'media' THEN 3
        WHEN 'baja' THEN 4
      END,
      CASE t.estado
        WHEN 'abierto' THEN 1
        WHEN 'en_revision' THEN 2
        WHEN 'resuelto' THEN 3
        WHEN 'cerrado' THEN 4
      END,
      t.created_at DESC
  `

  const tickets = ticketsRaw.map((t: any) => ({
    id: String(t.id),
    lead_id: String(t.lead_id),
    tipo: String(t.tipo),
    descripcion: String(t.descripcion || ''),
    prioridad: String(t.prioridad),
    estado: String(t.estado),
    asignado_a: t.asignado_a ? String(t.asignado_a) : null,
    created_at: String(t.created_at),
    updated_at: String(t.updated_at),
    fecha_resolucion: t.fecha_resolucion ? String(t.fecha_resolucion) : null,
    nombre_cliente: String(t.nombre_cliente || 'Sin nombre'),
    telefono_whatsapp: String(t.telefono_whatsapp || ''),
    region: String(t.region || ''),
  }))

  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.estado === 'abierto').length,
    en_revision: tickets.filter(t => t.estado === 'en_revision').length,
    urgentes: tickets.filter(t => t.prioridad === 'urgente' && t.estado !== 'cerrado').length,
  }

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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Tickets de Soporte</h1>
            <p className="text-slate-600">
              Casos especiales que requieren atención • {stats.total} tickets
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 mb-1">Abiertos</p>
          <p className="text-3xl font-bold text-blue-900">{stats.abiertos}</p>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700 mb-1">En Revisión</p>
          <p className="text-3xl font-bold text-amber-900">{stats.en_revision}</p>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 mb-1">Urgentes</p>
          <p className="text-3xl font-bold text-red-900">{stats.urgentes}</p>
        </div>
      </div>

      <TicketsTable tickets={tickets} />
    </div>
  )
}
