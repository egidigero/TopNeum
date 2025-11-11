"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { X, Phone, MessageSquare, ShoppingCart, Trash2 } from "lucide-react"
import type { User as AuthUser } from "@/lib/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
    // 🆕 Producto elegido (campos nuevos)
    producto_descripcion?: string | null
    forma_pago_detalle?: string | null
    cantidad?: number | null
    precio_final?: number | null
  }
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
  onClose: () => void
  onUpdate: (updates: any) => void
  onDelete?: () => void
}

export function LeadDetailPanel({ lead, users, currentUser, onClose, onUpdate, onDelete }: LeadDetailPanelProps) {
  const [notas, setNotas] = useState(lead.notas || "")
  const [pagos, setPagos] = useState<any[]>([])
  const [loadingPagos, setLoadingPagos] = useState(true)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!onDelete) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onDelete()
        onClose()
      } else {
        alert('Error al eliminar el lead')
      }
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert('Error al eliminar el lead')
    } finally {
      setDeleting(false)
    }
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

          {/* 🆕 Detalle de Compra - Solo si hay producto elegido */}
          {(lead.producto_descripcion || lead.precio_final) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Detalle de Compra
              </label>
              <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-3 space-y-3">
                {lead.producto_descripcion && (
                  <div>
                    <div className="text-xs text-emerald-400 mb-1">Producto elegido:</div>
                    <div className="text-sm text-white font-semibold">{lead.producto_descripcion}</div>
                  </div>
                )}
                
                {lead.cantidad && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-300">Cantidad:</span>
                    <span className="text-white font-medium">{lead.cantidad} unidades</span>
                  </div>
                )}

                {lead.precio_final && (
                  <div className="flex justify-between text-sm pt-2 border-t border-emerald-800">
                    <span className="text-emerald-300 font-semibold">TOTAL:</span>
                    <span className="text-white font-bold text-lg">{formatPrice(lead.precio_final)}</span>
                  </div>
                )}

                {lead.forma_pago_detalle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-300">Forma de pago:</span>
                    <span className="text-white font-medium">{lead.forma_pago_detalle}</span>
                  </div>
                )}

                {/* 🆕 Botón Confirmar Pago - Solo si está en "pago_informado" */}
                {lead.estado === 'pago_informado' && (
                  <Button
                    onClick={() => handleChangeEstado('pedido_confirmado')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                  >
                    ✅ Confirmar Pago
                  </Button>
                )}

                {/* Badge del estado del pedido */}
                {lead.estado === 'esperando_pago' && (
                  <Badge variant="outline" className="border-amber-500 text-amber-400 w-full justify-center">
                    ⏳ Esperando pago del cliente
                  </Badge>
                )}
                {lead.estado === 'pago_informado' && (
                  <Badge variant="outline" className="border-blue-500 text-blue-400 w-full justify-center">
                    💬 Cliente informó pago - Confirmar
                  </Badge>
                )}
                {lead.estado === 'pedido_confirmado' && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-400 w-full justify-center">
                    ✅ Pago confirmado
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Cambiar estado</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("en_conversacion")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                En Conversación
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
                onClick={() => handleChangeEstado("pago_informado")}
                className="border-slate-700 text-slate-300 bg-transparent text-xs"
              >
                Pago Informado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("pedido_confirmado")}
                className="border-emerald-700 text-emerald-300 bg-transparent text-xs"
              >
                Pedido Confirmado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("perdido")}
                className="border-red-700 text-red-300 bg-transparent text-xs"
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

          {/* Eliminar Lead */}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-red-700 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">¿Eliminar lead?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Esta acción no se puede deshacer. Se eliminará el lead <strong>{lead.nombre}</strong> y todos sus datos asociados (consultas, pedidos, pagos).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={deleting}
                  >
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
