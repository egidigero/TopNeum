import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { NuevoGastoForm } from "@/components/gastos/nuevo-gasto-form"

export default async function NuevoGastoPage() {
  const user = await getSession()

  if (user?.role !== "admin" && user?.role !== "finanzas") {
    redirect("/dashboard")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nuevo Gasto</h1>
        <p className="text-slate-400">Registrar un nuevo gasto operativo</p>
      </div>

      <NuevoGastoForm userId={user.id} />
    </div>
  )
}
