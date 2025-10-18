import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { GastosTable } from "@/components/gastos/gastos-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function GastosPage() {
  const user = await getSession()

  if (user?.role !== "admin" && user?.role !== "finanzas") {
    redirect("/dashboard")
  }

  const gastos = await sql`
    SELECT 
      g.*,
      u.nombre as creado_por_nombre
    FROM gastos g
    LEFT JOIN users u ON g.creado_por = u.id
    ORDER BY g.fecha DESC, g.created_at DESC
  `

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gastos</h1>
          <p className="text-slate-400">Registro y control de gastos operativos</p>
        </div>
        <Link href="/gastos/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Gasto
          </Button>
        </Link>
      </div>

      <GastosTable gastos={gastos} />
    </div>
  )
}
