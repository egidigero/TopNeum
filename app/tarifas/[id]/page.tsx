import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { TarifaForm } from "@/components/tarifas/tarifa-form"
import { notFound } from "next/navigation"

export default async function EditTarifaPage({ params }: { params: { id: string } }) {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/dashboard")
  }

  const tarifas = await sql`
    SELECT * FROM tarifas WHERE id = ${params.id} LIMIT 1
  `

  if (tarifas.length === 0) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Editar Tarifa</h1>
        <p className="text-slate-400">Modificar perfil de precios</p>
      </div>

      <TarifaForm tarifa={tarifas[0]} />
    </div>
  )
}
