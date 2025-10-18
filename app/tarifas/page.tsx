import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { TarifasTable } from "@/components/tarifas/tarifas-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function TarifasPage() {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/dashboard")
  }

  const tarifas = await sql`
    SELECT * FROM tarifas
    ORDER BY vigente DESC, created_at DESC
  `

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tarifas de Precios</h1>
          <p className="text-slate-400">Gestión de perfiles de precios y márgenes</p>
        </div>
        <Link href="/tarifas/nueva">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarifa
          </Button>
        </Link>
      </div>

      <TarifasTable tarifas={tarifas} />
    </div>
  )
}
