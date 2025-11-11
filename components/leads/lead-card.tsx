"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, User, Calendar, CalendarCheck, Package, MapPin, Tag, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeadCardProps {
  lead: {
    id: string
    nombre_cliente?: string
    nombre?: string
    telefono_whatsapp?: string
    telefono?: string
    region?: string | null
    origen?: string | null
    whatsapp_label?: string | null
    asignado_nombre: string | null
    ultima_interaccion: string | null
    created_at: string
    // Campos de producto
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
  onClick: () => void
  onUpdate?: (leadId: string, updates: any) => void
  isSelected: boolean
}

export function LeadCard({ lead, onClick, isSelected }: LeadCardProps) {
  // Compatibilidad con nombres de campos antiguos y nuevos
  const nombre_cliente = lead.nombre_cliente || lead.nombre || "Sin nombre"
  const telefono_whatsapp = lead.telefono_whatsapp || lead.telefono || "Sin telefono"
  
  const formatDate = (date: string | null) => {
    if (!date) return "Sin contacto"
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `Hace ${diffDays} días`
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
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
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = telefono_whatsapp.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  const getEstadoTurnoBadge = (estado: string) => {
    const estados = {
      pendiente: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
      confirmado: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
      completado: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
      cancelado: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    }
    return estados[estado as keyof typeof estados] || estados.pendiente
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-white border-2 border-slate-200 p-4 cursor-pointer transition-all hover:border-blue-300 hover:shadow-lg",
        isSelected && "border-blue-500 shadow-lg ring-2 ring-blue-200",
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-slate-900 text-base">{nombre_cliente}</h4>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono text-xs">{telefono_whatsapp}</span>
            </div>
            {lead.region && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>{lead.region}</span>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={openWhatsApp}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* Producto Info */}
        {lead.producto_descripcion && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-900 font-medium line-clamp-2 leading-relaxed">
                  {lead.producto_descripcion}
                </p>
                {lead.cantidad && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Cantidad: <span className="font-semibold">{lead.cantidad}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
              {lead.precio_final && (
                <p className="text-base font-bold text-emerald-700">{formatPrice(lead.precio_final)}</p>
              )}
              {lead.forma_pago_detalle && (
                <p className="text-xs text-emerald-600 font-medium">{lead.forma_pago_detalle}</p>
              )}
            </div>
          </div>
        )}

        {/* Turno Info */}
        {(lead.tiene_turno && lead.turno_fecha) ? (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">
                    {formatTurnoDate(lead.turno_fecha)}
                  </p>
                  {lead.turno_hora && (
                    <p className="text-xs text-blue-700">{lead.turno_hora}</p>
                  )}
                </div>
              </div>
              {lead.turno_estado && (
                <Badge
                  className={cn(
                    "text-xs font-medium border-2 capitalize",
                    getEstadoTurnoBadge(lead.turno_estado).bg,
                    getEstadoTurnoBadge(lead.turno_estado).text,
                    getEstadoTurnoBadge(lead.turno_estado).border
                  )}
                >
                  {lead.turno_estado}
                </Badge>
              )}
            </div>
          </div>
        ) : lead.producto_descripcion ? (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-2">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              ⏳ Turno Pendiente de Agendar
            </p>
          </div>
        ) : null}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {lead.origen && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
              <Tag className="w-3 h-3 mr-1" />
              {lead.origen}
            </Badge>
          )}
          {lead.whatsapp_label && (
            <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 text-xs font-medium">
              {lead.whatsapp_label}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1 text-slate-600">
            {lead.asignado_nombre ? (
              <>
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium">{lead.asignado_nombre}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">Sin asignar</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(lead.ultima_interaccion)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
