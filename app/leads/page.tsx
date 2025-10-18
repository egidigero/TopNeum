import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LeadsKanban } from "@/components/leads/leads-kanban"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function LeadsPage() {
  const user = await getSession()

  // Fetch all leads with related data
  const leads = await sql`
    SELECT 
      l.*,
      u.nombre as asignado_nombre,
      COUNT(DISTINCT p.id) as pagos_count
    FROM leads_whatsapp l
    LEFT JOIN users u ON l.asignado_a = u.id
    LEFT JOIN pagos p ON p.lead_id = l.id
    GROUP BY l.id, u.nombre
    ORDER BY l.created_at DESC
  `

  // Fetch users for assignment
  const users = await sql`
    SELECT id, nombre, role
    FROM users
    WHERE activo = true
    ORDER BY nombre
  `

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clientes WhatsApp</h1>
          <p className="text-slate-400">Seguimiento de leads y funnel de ventas</p>
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
