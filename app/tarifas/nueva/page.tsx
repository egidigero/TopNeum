import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TarifaForm } from "@/components/tarifas/tarifa-form"

export default async function NuevaTarifaPage() {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nueva Tarifa</h1>
        <p className="text-slate-400">Crear un nuevo perfil de precios</p>
      </div>

      <TarifaForm />
    </div>
  )
}
