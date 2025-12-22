"use client"

import { useState, useMemo } from "react"
import { LayoutGrid, Table as TableIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeadsFilters } from "./leads-filters"
import { LeadsTable } from "./leads-table"
import { LeadsKanban } from "./leads-kanban"
import type { Lead } from "@/lib/types/lead"

interface LeadsViewWrapperProps {
  leads: Lead[]
  users: any[]
  currentUser: any
}

export function LeadsViewWrapper({ leads, users, currentUser }: LeadsViewWrapperProps) {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [regionFilter, setRegionFilter] = useState("todos")
  const [activityFilter, setActivityFilter] = useState("todos")
  const [dateFilter, setDateFilter] = useState("todos")
  const [estadoFilter, setEstadoFilter] = useState("todos")

  // Función para calcular diferencia en días
  const getDaysSinceActivity = (date: string | null) => {
    if (!date) return Infinity
    const lastActivity = new Date(date)
    const now = new Date()
    return Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Búsqueda de texto
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          lead.nombre?.toLowerCase().includes(search) ||
          lead.telefono?.toLowerCase().includes(search) ||
          lead.codigo_confirmacion?.toLowerCase().includes(search) ||
          lead.medida_neumatico?.toLowerCase().includes(search) ||
          lead.marca_preferida?.toLowerCase().includes(search) ||
          lead.tipo_vehiculo?.toLowerCase().includes(search) ||
          lead.producto_descripcion?.toLowerCase().includes(search)
        
        if (!matchesSearch) return false
      }

      // Filtro de región
      if (regionFilter !== "todos" && lead.region !== regionFilter) {
        return false
      }

      // Filtro de estado
      if (estadoFilter !== "todos" && lead.estado !== estadoFilter) {
        return false
      }

      // Filtro de actividad
      if (activityFilter !== "todos") {
        const daysSince = getDaysSinceActivity(lead.ultima_interaccion || lead.created_at)
        
        if (activityFilter === "24h" && daysSince > 1) {
          return false
        }
        if (activityFilter === "sin_actividad_3d" && daysSince <= 3) {
          return false
        }
        if (activityFilter === "sin_actividad_7d" && daysSince <= 7) {
          return false
        }
      }

      // Filtro de fecha
      if (dateFilter !== "todos") {
        const createdDate = new Date(lead.created_at)
        const now = new Date()
        
        if (dateFilter === "hoy") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (createdDate < today) return false
        }
        
        if (dateFilter === "esta_semana") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (createdDate < weekAgo) return false
        }
        
        if (dateFilter === "este_mes") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (createdDate < monthAgo) return false
        }
      }

      return true
    })
  }, [leads, searchTerm, regionFilter, activityFilter, dateFilter, estadoFilter])

  return (
    <div className="space-y-6">
      {/* Toggle de vista */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <TableIcon className="w-4 h-4" />
            Tabla
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Button>
        </div>

        <div className="text-sm text-slate-600">
          Vista: {viewMode === "table" ? "Lista detallada" : "Tablero visual"}
        </div>
      </div>

      {/* Filtros */}
      <LeadsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        activityFilter={activityFilter}
        onActivityChange={setActivityFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        estadoFilter={estadoFilter}
        onEstadoChange={setEstadoFilter}
        totalLeads={leads.length}
        filteredCount={filteredLeads.length}
      />

      {/* Vista seleccionada */}
      {viewMode === "table" ? (
        <LeadsTable leads={filteredLeads} />
      ) : (
        <LeadsKanban leads={filteredLeads} users={users} currentUser={currentUser} />
      )}
    </div>
  )
}
