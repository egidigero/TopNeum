import { getSession } from "@/lib/auth"
import { NuevoLeadForm } from "@/components/leads/nuevo-lead-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NuevoLeadPage() {
  await getSession()

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/leads">
          <Button variant="outline" className="mb-4 border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Leads
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nuevo Lead</h1>
        <p className="text-slate-600">Registrar un nuevo cliente potencial</p>
      </div>

      <NuevoLeadForm />
    </div>
  )
}
