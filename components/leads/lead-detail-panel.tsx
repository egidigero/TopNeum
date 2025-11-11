"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { X, Phone, MessageSquare, ShoppingCart } from "lucide-react"
import type { User as AuthUser } from "@/lib/auth"

interface LeadDetailPanelProps {
  lead: {
    id: string
    nombre: string
    telefono: string
    canal: string
    mensaje_inicial: string
    origen: string
    estado: string
    asignado_a: string | null
    asignado_nombre: string | null
    ultimo_contacto_at: string | null
    notas: string | null
    created_at: string
    whatsapp_label: string
    // Datos recolectados
    medida_neumatico?: string | null
    marca_preferida?: string | null
    tipo_vehiculo?: string | null
    tipo_uso?: string | null
    forma_pago?: string | null
    ultimo_total?: number | null
    region?: string
  }
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
  onClose: () => void
  onUpdate: (updates: any) => void
}

export function LeadDetailPanel({ lead, users, currentUser, onClose, onUpdate }: LeadDetailPanelProps) {
  const [notas, setNotas] = useState(lead.notas || "")
  const [pagos, setPagos] = useState<any[]>([])
  const [loadingPagos, setLoadingPagos] = useState(true)

  useEffect(() => {
    async function fetchPagos() {
      try {
        const res = await fetch(`/api/leads/${lead.id}/pagos`)
        if (res.ok) {
          const data = await res.json()
          setPagos(data.pagos)
        }
      } catch (error) {
        console.error("[v0] Fetch pagos error:", error)
      } finally {
        setLoadingPagos(false)
      }
    }

    fetchPagos()
  }, [lead.id])

  const handleSaveNotas = async () => {
    onUpdate({ notas })
  }

  const handleChangeEstado = async (nuevoEstado: string) => {
    onUpdate({ estado: nuevoEstado, ultimo_contacto_at: new Date().toISOString() })
  }

  const handleAsignar = async (userId: string) => {
    onUpdate({ asignado_a: userId })
  }

  const openWhatsApp = () => {
    const phone = lead.telefono.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="w-96 flex-shrink-0">
      <Card className="bg-slate-900 border-slate-800 sticky top-8">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-lg">{lead.nombre}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                <Phone className="w-3 h-3" />
                <span className="font-mono">{lead.telefono}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Quick Actions */}
          <div className="space-y-2">
            <Button onClick={openWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <Phone className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {lead.canal}
              </Badge>
              {lead.whatsapp_label && (
                <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                  {lead.whatsapp_label}
                </Badge>
              )}
              {lead.origen && (
                <Badge variant="outline" className="border-slate-700 text-slate-400">
                  {lead.origen}
                </Badge>
              )}
            </div>

            {lead.mensaje_inicial && (
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <MessageSquare className="w-3 h-3" />
                  <span>Mensaje inicial</span>
                </div>
                <p className="text-sm text-slate-300">{lead.mensaje_inicial}</p>
              </div>
            )}
          </div>

          {/* Datos del Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Información Recolectada</label>
            <div className="bg-slate-800 rounded-lg p-3 space-y-2">
              {lead.tipo_vehiculo && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Vehículo:</span>
                  <span className="text-white font-medium">{lead.tipo_vehiculo}</span>
                </div>
              )}
              {lead.medida_neumatico && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Medida:</span>
                  <span className="text-white font-medium">{lead.medida_neumatico}</span>
                </div>
              )}
              {lead.marca_preferida && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Marca Preferida:</span>
                  <span className="text-white font-medium">{lead.marca_preferida}</span>
                </div>
              )}
              {lead.tipo_uso && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Uso:</span>
                  <span className="text-white font-medium">{lead.tipo_uso}</span>
                </div>
              )}
              {lead.forma_pago && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Forma de Pago:</span>
                  <span className="text-white font-medium">{lead.forma_pago}</span>
                </div>
              )}
              {lead.ultimo_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Último Total:</span>
                  <span className="text-white font-medium">{formatPrice(lead.ultimo_total)}</span>
                </div>
              )}
              {lead.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Región:</span>
                  <span className="text-white font-medium">{lead.region}</span>
                </div>
              )}
              {!lead.tipo_vehiculo && !lead.medida_neumatico && !lead.marca_preferida && !lead.forma_pago && (
                <p className="text-sm text-slate-500 italic">No hay información recolectada aún</p>
              )}
            </div>
          </div>

          {/* Asignación */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Asignado a</label>
            <select
              value={lead.asignado_a || ""}
              onChange={(e) => handleAsignar(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Cambiar estado</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("contactado")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                Contactado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("cotizado")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                Cotizado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("esperando_pago")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                Esperando Pago
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("perdido")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                Perdido
              </Button>
            </div>
          </div>

          {/* Pagos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Pagos</label>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {pagos.length}
              </Badge>
            </div>

            {loadingPagos ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : pagos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago) => (
                  <div key={pago.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{formatPrice(pago.monto_reportado)}</span>
                      <Badge
                        className={
                          pago.estado === "verificado"
                            ? "bg-green-900/50 text-green-300"
                            : pago.estado === "rechazado"
                              ? "bg-red-900/50 text-red-300"
                              : "bg-yellow-900/50 text-yellow-300"
                        }
                      >
                        {pago.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{pago.metodo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Notas</label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agregar notas sobre el lead..."
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
            <Button onClick={handleSaveNotas} size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
              Guardar Notas
            </Button>
          </div>

          {/* Crear Pedido */}
          {lead.estado === "pago_verificado" && (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Crear Pedido
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
