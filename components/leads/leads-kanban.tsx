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
  | "en_conversacion"
  | "cotizado"
  | "esperando_pago"
  | "pago_informado"
  | "pedido_confirmado"
  | "perdido"

interface Lead {
  id: string
  nombre?: string
  nombre_cliente?: string
  telefono?: string
  telefono_whatsapp?: string
  canal: string
  region: string
  estado: LeadEstado
  // 🆕 Consultas y cotizaciones (múltiples)
  consultas?: Array<{
    medida_neumatico: string
    marca_preferida: string | null
    tipo_vehiculo: string | null
    cantidad: number
  }> | null
  cotizaciones?: Array<{
    productos_mostrados: any
    precio_total_contado: number
    region: string
  }> | null
  // Datos recolectados (retrocompatibilidad - última consulta)
  medida_neumatico: string | null
  marca_preferida: string | null
  tipo_vehiculo: string | null
  tipo_uso: string | null
  forma_pago: string | null
  ultimo_total: number | null
  // Contadores
  total_consultas: number
  total_pedidos: number
  pagos_count: number
  // Seguimiento
  ultima_interaccion: string | null
  created_at: string
  origen: string
  ultimo_contacto_at: string | null
  mensaje_inicial: string
  notas: string | null
  // Campos nuevos de producto
  producto_descripcion?: string | null
  forma_pago_detalle?: string | null
  cantidad?: number | null
  precio_final?: number | null
  // Campos de turno
  tiene_turno?: number | boolean
  turno_fecha?: string | null
  turno_hora?: string | null
  turno_estado?: string | null
}

interface LeadsKanbanProps {
  leads: Lead[]
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
}

const ESTADOS: Array<{ value: LeadEstado; label: string; color: string }> = [
  { value: "nuevo", label: "🆕 Nuevo", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "en_conversacion", label: "💬 En Conversación", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cotizado", label: "📋 Cotizado", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "esperando_pago", label: "⏳ Esperando Pago", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "pago_informado", label: "💬 Pago Informado", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "pedido_confirmado", label: "✅ Pedido Confirmado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "perdido", label: "❌ Perdido", color: "bg-red-100 text-red-700 border-red-200" },
]

export function LeadsKanban({ leads: initialLeads, users, currentUser }: LeadsKanbanProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredLeads = leads.filter((lead) => {
    const nombre = lead.nombre_cliente || lead.nombre || ""
    const telefono = lead.telefono_whatsapp || lead.telefono || ""
    
    const matchesSearch =
      nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      telefono.includes(searchTerm) ||
      (lead.origen?.toLowerCase() || "").includes(searchTerm.toLowerCase())

    return matchesSearch
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

  function handleDeleteLead() {
    if (!selectedLead) return
    setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id))
    setSelectedLead(null)
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
          onDelete={handleDeleteLead}
        />
      )}
    </div>
  )
}
