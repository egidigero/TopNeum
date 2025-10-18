import { getSession } from "@/lib/auth"
import { NuevoLeadForm } from "@/components/leads/nuevo-lead-form"

export default async function NuevoLeadPage() {
  await getSession()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nuevo Lead</h1>
        <p className="text-slate-400">Registrar un nuevo cliente potencial</p>
      </div>

      <NuevoLeadForm />
    </div>
  )
}
