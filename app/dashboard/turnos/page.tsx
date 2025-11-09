import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TurnosCalendar } from "@/components/turnos/turnos-calendar"
import { NuevoTurnoModal } from "@/components/turnos/nuevo-turno-modal"
import { Button } from "@/components/ui/button"
import { Calendar, Plus } from "lucide-react"

export default async function TurnosPage() {
  const user = await getSession()
  if (!user) redirect("/login")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Gestión de Turnos
          </h1>
          <p className="text-slate-600">
            Colocación y retiro de neumáticos
          </p>
        </div>
        <NuevoTurnoModal />
      </div>

      <TurnosCalendar userRole={user.role} />
    </div>
  )
}
