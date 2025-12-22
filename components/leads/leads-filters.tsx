"use client"

import { Search, Filter, Calendar, MapPin, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface LeadsFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  regionFilter: string
  onRegionChange: (value: string) => void
  activityFilter: string
  onActivityChange: (value: string) => void
  dateFilter: string
  onDateChange: (value: string) => void
  estadoFilter: string
  onEstadoChange: (value: string) => void
  totalLeads: number
  filteredCount: number
}

export function LeadsFilters({
  searchTerm,
  onSearchChange,
  regionFilter,
  onRegionChange,
  activityFilter,
  onActivityChange,
  dateFilter,
  onDateChange,
  estadoFilter,
  onEstadoChange,
  totalLeads,
  filteredCount,
}: LeadsFiltersProps) {
  const hasActiveFilters = searchTerm || regionFilter !== "todos" || activityFilter !== "todos" || dateFilter !== "todos" || estadoFilter !== "todos"

  const clearFilters = () => {
    onSearchChange("")
    onRegionChange("todos")
    onActivityChange("todos")
    onDateChange("todos")
    onEstadoChange("todos")
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-6 space-y-4">
      {/* Búsqueda principal */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, teléfono, código o medida..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filtros adicionales */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Región */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <Select value={regionFilter} onValueChange={onRegionChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las regiones</SelectItem>
              <SelectItem value="CABA">CABA</SelectItem>
              <SelectItem value="INTERIOR">Interior</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={estadoFilter} onValueChange={onEstadoChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="en_conversacion">En conversación</SelectItem>
              <SelectItem value="cotizado">Cotizado</SelectItem>
              <SelectItem value="esperando_pago">Esperando pago</SelectItem>
              <SelectItem value="pago_informado">Pago informado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actividad */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <Select value={activityFilter} onValueChange={onActivityChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Actividad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda la actividad</SelectItem>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="sin_actividad_3d">Sin actividad &gt;3 días</SelectItem>
              <SelectItem value="sin_actividad_7d">Sin actividad &gt;7 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <Select value={dateFilter} onValueChange={onDateChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las fechas</SelectItem>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="esta_semana">Esta semana</SelectItem>
              <SelectItem value="este_mes">Este mes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contador de resultados */}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {filteredCount} de {totalLeads} leads
          </Badge>
        </div>
      </div>
    </div>
  )
}
