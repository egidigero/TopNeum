"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, User, Calendar, DollarSign, CalendarCheck, Package } from "lucide-react"
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
    // 🆕 Campos de producto
    producto_descripcion?: string | null
    precio_final?: number | null
    // 🆕 Campos de turno
    tiene_turno?: boolean
    turno_fecha?: string | null
    turno_hora?: string | null
    turno_estado?: string | null
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatTurnoDate = (fecha: string) => {
    const d = new Date(fecha)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
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

        {/* 🆕 Producto Info */}
        {lead.producto_descripcion && (
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-md p-2 space-y-1">
            <div className="flex items-start gap-2">
              <Package className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-300 line-clamp-2">{lead.producto_descripcion}</p>
            </div>
            {lead.precio_final && (
              <p className="text-sm font-bold text-emerald-400">{formatPrice(lead.precio_final)}</p>
            )}
          </div>
        )}

        {/* 🆕 Turno Info */}
        {lead.tiene_turno && lead.turno_fecha && (
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-md p-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-300">
                {formatTurnoDate(lead.turno_fecha)} {lead.turno_hora && `- ${lead.turno_hora}`}
              </span>
              {lead.turno_estado && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border-0",
                    lead.turno_estado === "pendiente" && "bg-amber-900/50 text-amber-300",
                    lead.turno_estado === "confirmado" && "bg-green-900/50 text-green-300",
                    lead.turno_estado === "completado" && "bg-emerald-900/50 text-emerald-300",
                  )}
                >
                  {lead.turno_estado}
                </Badge>
              )}
            </div>
          </div>
        )}

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
