"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Phone, Calendar, Package, DollarSign, MapPin, Clock, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import type { Lead } from "@/lib/types/lead"
import { LeadDetailPanel } from "./lead-detail-panel"
import type { User as AuthUser } from "@/lib/auth"

interface LeadsTableProps {
  leads: Lead[]
  users?: Array<{ id: string; nombre: string; role: string }>
  currentUser?: AuthUser
}

type SortField = "nombre" | "estado" | "fecha"

const estadoConfig: Record<string, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  en_conversacion: { label: "En conversación", color: "bg-yellow-100 text-yellow-800" },
  cotizado: { label: "Cotizado", color: "bg-purple-100 text-purple-800" },
  esperando_pago: { label: "Esperando pago", color: "bg-orange-100 text-orange-800" },
  pago_informado: { label: "Pago informado", color: "bg-green-100 text-green-800" },
  pedido_confirmado: { label: "Confirmado", color: "bg-green-600 text-white" },
  perdido: { label: "Perdido", color: "bg-gray-100 text-gray-800" },
}

export function LeadsTable({ leads, users = [], currentUser }: LeadsTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("fecha")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)

  const handleLeadUpdate = async (updates: any) => {
    if (!selectedLead) return
    
    try {
      console.log('[LeadsTable] Actualizando lead:', selectedLead.id, updates)
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await res.json()
      console.log('[LeadsTable] Respuesta:', data)

      if (res.ok) {
        const { lead: updatedLead } = data
        setLocalLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, ...updatedLead } : l)))
        setSelectedLead((prev) => (prev ? { ...prev, ...updatedLead } : null))
      } else {
        console.error('[LeadsTable] Error en respuesta:', data.error)
        alert('Error al actualizar: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error("[LeadsTable] Update lead error:", error)
      alert('Error al actualizar el lead')
    }
  }

  const handleLeadDelete = async () => {
    if (!selectedLead) return
    setLocalLeads((prev) => prev.filter((l) => l.id !== selectedLead.id))
    setSelectedLead(null)
  }

  const sortedLeads = [...localLeads].sort((a, b) => {
    let compareValue = 0
    
    if (sortBy === "fecha") {
      compareValue = new Date(a.ultima_interaccion || a.created_at).getTime() - 
                     new Date(b.ultima_interaccion || b.created_at).getTime()
    } else if (sortBy === "nombre") {
      compareValue = (a.nombre || "Sin nombre").localeCompare(b.nombre || "Sin nombre")
    } else if (sortBy === "estado") {
      compareValue = a.estado.localeCompare(b.estado)
    }

    return sortOrder === "asc" ? compareValue : -compareValue
  })

  const toggleSort = (column: "fecha" | "nombre" | "estado") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const formatPrice = (price: number | null) => {
    if (!price) return "-"
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getTimeAgo = (date: string | null) => {
    if (!date) return "-"
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
    } catch {
      return "-"
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabla */}
      <div className="bg-white border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[200px]">
              <button 
                onClick={() => toggleSort("nombre")}
                className="flex items-center gap-2 font-semibold hover:text-blue-600"
              >
                Cliente
                {sortBy === "nombre" && (
                  <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </TableHead>
            <TableHead className="w-[140px]">
              <button 
                onClick={() => toggleSort("estado")}
                className="flex items-center gap-2 font-semibold hover:text-blue-600"
              >
                Estado
                {sortBy === "estado" && (
                  <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </TableHead>
            <TableHead className="w-[250px]">Producto</TableHead>
            <TableHead className="w-[120px]">Total</TableHead>
            <TableHead className="w-[100px]">Región</TableHead>
            <TableHead className="w-[180px]">
              <button 
                onClick={() => toggleSort("fecha")}
                className="flex items-center gap-2 font-semibold hover:text-blue-600"
              >
                Última actividad
                {sortBy === "fecha" && (
                  <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </TableHead>
            <TableHead className="w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                No se encontraron leads con los filtros aplicados
              </TableCell>
            </TableRow>
          ) : (
            sortedLeads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-slate-50">
                {/* Cliente */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">
                      {lead.nombre || "Sin nombre"}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Phone className="w-3 h-3" />
                      {lead.telefono}
                    </div>
                    {lead.codigo_confirmacion && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {lead.codigo_confirmacion}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell>
                  <Badge className={estadoConfig[lead.estado]?.color || "bg-gray-100"}>
                    {estadoConfig[lead.estado]?.label || lead.estado}
                  </Badge>
                  {lead.tiene_turno && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <Calendar className="w-3 h-3" />
                      Turno agendado
                    </div>
                  )}
                </TableCell>

                {/* Producto */}
                <TableCell>
                  <div className="space-y-1 text-sm">
                    {lead.producto_descripcion ? (
                      <div className="font-medium text-slate-900">
                        {lead.producto_descripcion}
                      </div>
                    ) : lead.medida_neumatico ? (
                      <div className="text-slate-600">
                        {lead.medida_neumatico}
                        {lead.marca_preferida && (
                          <span className="text-slate-400"> • {lead.marca_preferida}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">Sin producto</span>
                    )}
                    {lead.tipo_vehiculo && (
                      <div className="text-xs text-slate-500">{lead.tipo_vehiculo}</div>
                    )}
                    {((lead.total_consultas || 0) > 0 || (lead.total_pedidos || 0) > 0) && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {(lead.total_consultas || 0) > 0 && (
                          <span>{lead.total_consultas} consulta{lead.total_consultas !== 1 ? 's' : ''}</span>
                        )}
                        {(lead.total_pedidos || 0) > 0 && (
                          <span>{lead.total_pedidos} pedido{lead.total_pedidos !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Total */}
                <TableCell>
                  {lead.ultimo_total ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">
                        {formatPrice(lead.ultimo_total)}
                      </div>
                      {lead.forma_pago && (
                        <div className="text-xs text-slate-500">
                          {lead.forma_pago.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>

                {/* Región */}
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className={lead.region === "CABA" ? "text-blue-600" : "text-slate-600"}>
                      {lead.region}
                    </span>
                  </div>
                </TableCell>

                {/* Última actividad */}
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {getTimeAgo(lead.ultima_interaccion || lead.created_at)}
                  </div>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {/* Panel de detalle - se abre debajo de la tabla */}
      {selectedLead && currentUser && (
        <div className="w-full">
          <LeadDetailPanel
            lead={selectedLead}
            users={users}
            currentUser={currentUser}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleLeadUpdate}
            onDelete={handleLeadDelete}
          />
        </div>
      )}
    </div>
  )
}
