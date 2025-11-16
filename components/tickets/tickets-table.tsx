"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Ticket {
  id: string
  lead_id: string
  tipo: string
  descripcion: string
  prioridad: string
  estado: string
  asignado_a: string | null
  created_at: string
  updated_at: string
  fecha_resolucion: string | null
  nombre_cliente: string
  telefono_whatsapp: string
  region: string
}

interface TicketsTableProps {
  tickets: Ticket[]
}

const TIPOS = {
  marca_especial: { label: "Marca Especial", icon: "🏷️" },
  medida_no_disponible: { label: "Medida No Disponible", icon: "📏" },
  consulta_tecnica: { label: "Consulta Técnica", icon: "🔧" },
  problema_pago: { label: "Problema de Pago", icon: "💳" },
  reclamo: { label: "Reclamo", icon: "⚠️" },
  otro: { label: "Otro", icon: "📌" },
}

const PRIORIDADES = {
  baja: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  media: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  alta: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  urgente: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
}

const ESTADOS = {
  abierto: { label: "Abierto", icon: Clock, color: "text-blue-600" },
  en_revision: { label: "En Revisión", icon: Clock, color: "text-amber-600" },
  resuelto: { label: "Resuelto", icon: CheckCircle2, color: "text-green-600" },
  cerrado: { label: "Cerrado", icon: XCircle, color: "text-slate-600" },
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  const router = useRouter()
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todos")

  const ticketsFiltrados = tickets.filter((ticket) => {
    if (filtroEstado !== "todos" && ticket.estado !== filtroEstado) return false
    if (filtroPrioridad !== "todos" && ticket.prioridad !== filtroPrioridad) return false
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleChangeEstado = async (ticketId: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error al actualizar ticket:", error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-4">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="abierto">Abiertos</SelectItem>
            <SelectItem value="en_revision">En Revisión</SelectItem>
            <SelectItem value="resuelto">Resueltos</SelectItem>
            <SelectItem value="cerrado">Cerrados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las prioridades</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-slate-600">
          Mostrando {ticketsFiltrados.length} de {tickets.length} tickets
        </div>
      </div>

      {/* Tabla */}
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-bold">Prioridad</TableHead>
              <TableHead className="font-bold">Tipo</TableHead>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Descripción</TableHead>
              <TableHead className="font-bold">Estado</TableHead>
              <TableHead className="font-bold">Creado</TableHead>
              <TableHead className="font-bold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No hay tickets que coincidan con los filtros
                </TableCell>
              </TableRow>
            ) : (
              ticketsFiltrados.map((ticket) => {
                const EstadoIcon = ESTADOS[ticket.estado as keyof typeof ESTADOS].icon
                return (
                  <TableRow key={ticket.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Badge
                        className={cn(
                          "font-semibold border-2 capitalize",
                          PRIORIDADES[ticket.prioridad as keyof typeof PRIORIDADES].bg,
                          PRIORIDADES[ticket.prioridad as keyof typeof PRIORIDADES].text,
                          PRIORIDADES[ticket.prioridad as keyof typeof PRIORIDADES].border
                        )}
                      >
                        {ticket.prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{TIPOS[ticket.tipo as keyof typeof TIPOS]?.icon || "📌"}</span>
                        <span className="text-sm text-slate-700">
                          {TIPOS[ticket.tipo as keyof typeof TIPOS]?.label || ticket.tipo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{ticket.nombre_cliente}</p>
                        <p className="text-xs text-slate-500 font-mono">{ticket.telefono_whatsapp}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-slate-700 line-clamp-2">{ticket.descripcion}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EstadoIcon
                          className={cn("w-4 h-4", ESTADOS[ticket.estado as keyof typeof ESTADOS].color)}
                        />
                        <span className="text-sm font-medium">
                          {ESTADOS[ticket.estado as keyof typeof ESTADOS].label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(ticket.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ticket.estado === "abierto" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangeEstado(ticket.id, "en_revision")}
                            className="text-xs"
                          >
                            En Revisión
                          </Button>
                        )}
                        {ticket.estado === "en_revision" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangeEstado(ticket.id, "resuelto")}
                            className="text-xs bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            Resolver
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/leads?id=${ticket.lead_id}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
