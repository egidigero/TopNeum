"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Phone, Mail, Car, Calendar, Clock, MessageSquare, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Turno {
  id: string
  nombre_cliente: string
  telefono: string
  email?: string
  tipo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  marca_vehiculo?: string
  modelo_vehiculo?: string
  patente?: string
  cantidad_neumaticos?: number
  observaciones?: string
  origen: string
  created_at: string
}

interface TurnoDetailModalProps {
  turno: Turno
  open: boolean
  onClose: () => void
}

export function TurnoDetailModal({ turno, open, onClose }: TurnoDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleEstadoChange = async (nuevoEstado: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/turnos/${turno.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (!res.ok) throw new Error("Error al actualizar estado")

      toast({ title: "✅ Estado actualizado" })
      router.refresh()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = async () => {
    if (!confirm("¿Estás seguro de cancelar este turno?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/turnos/${turno.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al cancelar turno")

      toast({ title: "✅ Turno cancelado" })
      router.refresh()
      onClose()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cancelar el turno", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const estadosDisponibles = ["pendiente", "confirmado", "en_proceso", "completado"]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-slate-200 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 flex items-center justify-between">
            <span>Detalle del Turno</span>
            <Badge className={`${
              turno.tipo === 'colocacion'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-green-100 text-green-800 border-green-300'
            } border`}>
              {turno.tipo === 'colocacion' ? '🔧 Colocación' : '📦 Retiro'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del cliente */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Información del Cliente</h3>
            
            <div className="flex items-center gap-3 text-slate-900">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-medium">{turno.nombre_cliente}</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-700">
              <Phone className="w-4 h-4 text-slate-500" />
              <a href={`tel:${turno.telefono}`} className="hover:text-blue-600">
                {turno.telefono}
              </a>
            </div>
            
            {turno.email && (
              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="w-4 h-4 text-slate-500" />
                <a href={`mailto:${turno.email}`} className="hover:text-blue-600">
                  {turno.email}
                </a>
              </div>
            )}
          </div>

          {/* Fecha y hora */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Fecha y Horario</h3>
            
            <div className="flex items-center gap-3 text-slate-900">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{new Date(turno.fecha + 'T00:00:00').toLocaleDateString('es-AR', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-900">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>{turno.hora_inicio.substring(0, 5)} - {turno.hora_fin.substring(0, 5)}</span>
            </div>
          </div>

          {/* Información del vehículo */}
          {(turno.marca_vehiculo || turno.modelo_vehiculo || turno.patente) && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Información del Vehículo</h3>
              
              <div className="flex items-center gap-3 text-slate-900">
                <Car className="w-4 h-4 text-slate-500" />
                <span>
                  {turno.marca_vehiculo} {turno.modelo_vehiculo}
                  {turno.patente && ` - ${turno.patente}`}
                </span>
              </div>
              
              {turno.cantidad_neumaticos && (
                <div className="text-slate-700">
                  Cantidad de neumáticos: <span className="font-medium text-slate-900">{turno.cantidad_neumaticos}</span>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          {turno.observaciones && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Observaciones
              </h3>
              <p className="text-slate-700 text-sm">{turno.observaciones}</p>
            </div>
          )}

          {/* Estado del turno */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Estado del Turno</h3>
            <div className="flex flex-wrap gap-2">
              {estadosDisponibles.map((estado) => (
                <Button
                  key={estado}
                  size="sm"
                  variant={turno.estado === estado ? "default" : "outline"}
                  onClick={() => handleEstadoChange(estado)}
                  disabled={loading || turno.estado === estado}
                  className={
                    turno.estado === estado
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-slate-300 hover:bg-slate-100"
                  }
                >
                  {estado === "pendiente" && "Pendiente"}
                  {estado === "confirmado" && "Confirmado"}
                  {estado === "en_proceso" && "En Proceso"}
                  {estado === "completado" && "Completado"}
                </Button>
              ))}
            </div>
            
            <div className="mt-3 text-xs text-slate-500">
              <div>Origen: <span className="text-slate-700">{turno.origen}</span></div>
              <div>Creado: <span className="text-slate-700">
                {new Date(turno.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span></div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleCancelar}
            disabled={loading || turno.estado === 'cancelado'}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancelar Turno
          </Button>
          
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
