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
  | "conversacion_iniciada"
  | "consulta_producto"
  | "cotizacion_enviada"
  | "en_proceso_de_pago"
  | "pagado"
  | "turno_pendiente"
  | "turno_agendado"
  | "abandonado"

interface Lead {
  id: string
  nombre: string
  telefono: string
  canal: string
  region: string
  estado: LeadEstado
  whatsapp_label: string
  ultima_medida: string | null
  total_consultas: number
  total_pedidos: number
  asignado_a: string | null
  asignado_nombre: string | null
  ultima_interaccion: string | null
  created_at: string
}

interface LeadsKanbanProps {
  leads: Lead[]
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
}

const ESTADOS: Array<{ value: LeadEstado; label: string; color: string }> = [
  { value: "conversacion_iniciada", label: "🔥 En Caliente", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "consulta_producto", label: "💬 Consultando", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cotizacion_enviada", label: "📋 Cotizado", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "en_proceso_de_pago", label: "💳 Esperando Pago", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "pagado", label: "✅ Pagado", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "turno_pendiente", label: "📅 Turno Pendiente", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "turno_agendado", label: "🗓️ Turno Agendado", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { value: "abandonado", label: "❌ Abandonado", color: "bg-red-100 text-red-700 border-red-200" },
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
      <div className="flex-1 min-w-0">
        {/* Filters - FIXED: Fondo blanco y estático */}
        <Card className="bg-white border-slate-200 p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono u origen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-slate-300"
              />
            </div>

            <select
              value={filterAsignado}
              onChange={(e) => setFilterAsignado(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[200px]"
            >
              <option value="all">Todos los asignados</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-sm text-slate-600">
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
                    <div className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border ${estado.color}`}>
                      <h3 className="font-semibold">{estado.label}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {leadsInEstado.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {leadsInEstado.length === 0 ? (
                      <Card className="bg-slate-50 border-slate-200 border-dashed p-4">
                        <p className="text-center text-slate-400 text-sm">Sin leads</p>
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
