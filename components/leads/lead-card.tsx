"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, User, Calendar, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeadCardProps {
  lead: {
    id: string
    nombre: string
    telefono: string
    canal: string
    origen: string
    asignado_nombre: string | null
    ultimo_contacto_at: string | null
    created_at: string
    pagos_count: number
  }
  onClick: () => void
  onUpdate: (leadId: string, updates: any) => void
  isSelected: boolean
}

export function LeadCard({ lead, onClick, isSelected }: LeadCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "Sin contacto"
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `Hace ${diffDays} días`
    return d.toLocaleDateString("es-AR")
  }

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = lead.telefono.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-slate-900 border-slate-800 p-4 cursor-pointer transition-all hover:border-slate-700 hover:shadow-lg",
        isSelected && "border-blue-500 shadow-lg shadow-blue-500/20",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-1">{lead.nombre}</h4>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Phone className="w-3 h-3" />
              <span className="font-mono">{lead.telefono}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={openWhatsApp}
            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
            {lead.canal}
          </Badge>
          {lead.origen && (
            <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
              {lead.origen}
            </Badge>
          )}
          {lead.pagos_count > 0 && (
            <Badge className="bg-green-900/50 text-green-300 text-xs">
              <DollarSign className="w-3 h-3 mr-1" />
              {lead.pagos_count}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {lead.asignado_nombre ? (
              <>
                <User className="w-3 h-3" />
                <span>{lead.asignado_nombre}</span>
              </>
            ) : (
              <span>Sin asignar</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(lead.ultimo_contacto_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
