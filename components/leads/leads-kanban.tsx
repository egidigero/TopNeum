"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { LeadCard } from "./lead-card"
import { LeadDetailPanel } from "./lead-detail-panel"
import type { AuthUser } from "@/lib/auth"

type LeadEstado =
  | "nuevo"
  | "contactado"
  | "cotizado"
  | "esperando_pago"
  | "pagado_pendiente_verificacion"
  | "pago_verificado"
  | "convertido_a_pedido"
  | "perdido"

interface Lead {
  id: string
  nombre: string
  telefono: string
  canal: string
  mensaje_inicial: string
  origen: string
  estado: LeadEstado
  asignado_a: string | null
  asignado_nombre: string | null
  ultimo_contacto_at: string | null
  notas: string | null
  created_at: string
  pagos_count: number
}

interface LeadsKanbanProps {
  leads: Lead[]
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
}

const ESTADOS: Array<{ value: LeadEstado; label: string; color: string }> = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-500" },
  { value: "contactado", label: "Contactado", color: "bg-cyan-500" },
  { value: "cotizado", label: "Cotizado", color: "bg-purple-500" },
  { value: "esperando_pago", label: "Esperando Pago", color: "bg-yellow-500" },
  { value: "pagado_pendiente_verificacion", label: "Pago Pendiente", color: "bg-orange-500" },
  { value: "pago_verificado", label: "Pago Verificado", color: "bg-green-500" },
  { value: "convertido_a_pedido", label: "Convertido", color: "bg-emerald-600" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
]

export function LeadsKanban({ leads: initialLeads, users, currentUser }: LeadsKanbanProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAsignado, setFilterAsignado] = useState<string>("all")

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefono.includes(searchTerm) ||
      lead.origen?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAsignado = filterAsignado === "all" || lead.asignado_a === filterAsignado

    return matchesSearch && matchesAsignado
  })

  const getLeadsByEstado = (estado: LeadEstado) => {
    return filteredLeads.filter((lead) => lead.estado === estado)
  }

  async function handleUpdateLead(leadId: string, updates: Partial<Lead>) {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const { lead: updatedLead } = await res.json()
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updatedLead } : l)))
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) => (prev ? { ...prev, ...updatedLead } : null))
        }
      }
    } catch (error) {
      console.error("[v0] Update lead error:", error)
    }
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono u origen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <select
              value={filterAsignado}
              onChange={(e) => setFilterAsignado(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="all">Todos los asignados</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Mostrando {filteredLeads.length} de {leads.length} leads
          </div>
        </Card>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {ESTADOS.map((estado) => {
              const leadsInEstado = getLeadsByEstado(estado.value)

              return (
                <div key={estado.value} className="w-80 flex-shrink-0">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${estado.color}`} />
                      <h3 className="font-semibold text-white">{estado.label}</h3>
                      <Badge variant="secondary" className="ml-auto bg-slate-800 text-slate-300">
                        {leadsInEstado.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {leadsInEstado.length === 0 ? (
                      <Card className="bg-slate-900/50 border-slate-800 border-dashed p-4">
                        <p className="text-center text-slate-500 text-sm">Sin leads</p>
                      </Card>
                    ) : (
                      leadsInEstado.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelectedLead(lead)}
                          onUpdate={handleUpdateLead}
                          isSelected={selectedLead?.id === lead.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updates) => handleUpdateLead(selectedLead.id, updates)}
        />
      )}
    </div>
  )
}
