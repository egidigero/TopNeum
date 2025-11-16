"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { X, Phone, MessageSquare, ShoppingCart, Trash2, Edit, Save } from "lucide-react"
import type { User as AuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
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
    nombre?: string
    nombre_cliente?: string
    telefono?: string
    telefono_whatsapp?: string
    canal: string
    mensaje_inicial: string
    origen: string
    estado: string
    ultimo_contacto_at: string | null
    notas: string | null
    created_at: string
    codigo_confirmacion?: string | null
    // Datos recolectados
    medida_neumatico?: string | null
    marca_preferida?: string | null
    tipo_vehiculo?: string | null
    tipo_uso?: string | null
    forma_pago?: string | null
    ultimo_total?: number | null
    region?: string
    // Producto elegido
    producto_descripcion?: string | null
    forma_pago_detalle?: string | null
    cantidad?: number | null
    precio_final?: number | null
    // Información de turno
    tiene_turno?: number | boolean
    turno_fecha?: string | null
    turno_hora?: string | null
    turno_estado?: string | null
  }
  users: Array<{ id: string; nombre: string; role: string }>
  currentUser: AuthUser
  onClose: () => void
  onUpdate: (updates: any) => void
  onDelete?: () => void
}

export function LeadDetailPanel({ lead, users, currentUser, onClose, onUpdate, onDelete }: LeadDetailPanelProps) {
  // Compatibilidad con campos antiguos y nuevos
  const nombre = lead.nombre_cliente || lead.nombre || "Sin nombre"
  const telefono = lead.telefono_whatsapp || lead.telefono || "Sin teléfono"
  
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
    const phone = telefono.replace(/\D/g, "")
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
      <Card className="bg-white border-2 border-blue-100 shadow-xl sticky top-8">
        <CardHeader className="border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-slate-900 text-lg font-bold">{nombre}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                <Phone className="w-3 h-3 text-blue-600" />
                <span className="font-mono">{telefono}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600 hover:text-slate-900 hover:bg-blue-100">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto bg-blue-50/30">
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
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-200">
                WhatsApp
              </Badge>
              {lead.region && (
                <Badge variant="outline" className="border-slate-300 text-slate-600">
                  {lead.region}
                </Badge>
              )}
              {lead.codigo_confirmacion && (
                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 font-mono">
                  Código: {lead.codigo_confirmacion}
                </Badge>
              )}
            </div>

            {lead.mensaje_inicial && (
              <div className="bg-white border-2 border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                  <MessageSquare className="w-3 h-3" />
                  <span className="font-semibold">Mensaje inicial</span>
                </div>
                <p className="text-sm text-slate-700">{lead.mensaje_inicial}</p>
              </div>
            )}
          </div>

          {/* Información Recolectada (consulta de producto) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Información Recolectada</label>
            <div className="bg-white border-2 border-slate-200 rounded-lg p-3 space-y-2">
              {lead.tipo_vehiculo && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Vehículo:</span>
                  <span className="text-slate-900 font-medium">{lead.tipo_vehiculo}</span>
                </div>
              )}
              {lead.medida_neumatico && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Medida:</span>
                  <span className="text-slate-900 font-medium">{lead.medida_neumatico}</span>
                </div>
              )}
              {lead.marca_preferida && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Marca Preferida:</span>
                  <span className="text-slate-900 font-medium">{lead.marca_preferida}</span>
                </div>
              )}
              {lead.tipo_uso && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Uso:</span>
                  <span className="text-slate-900 font-medium">{lead.tipo_uso}</span>
                </div>
              )}
              {lead.forma_pago && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Forma de Pago:</span>
                  <span className="text-slate-900 font-medium">{lead.forma_pago}</span>
                </div>
              )}
              {lead.ultimo_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Último Total:</span>
                  <span className="text-slate-900 font-medium">{formatPrice(lead.ultimo_total)}</span>
                </div>
              )}
              {lead.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Región:</span>
                  <span className="text-slate-900 font-medium">{lead.region}</span>
                </div>
              )}
              {!lead.tipo_vehiculo && !lead.medida_neumatico && !lead.marca_preferida && !lead.forma_pago && (
                <p className="text-sm text-slate-400 italic">No hay información recolectada aún</p>
              )}
            </div>
          </div>

          {/* 🆕 Detalle de Compra - Solo si hay producto elegido */}
          {(lead.producto_descripcion || lead.precio_final) && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Detalle de Compra
              </label>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg p-3 space-y-3">
                {lead.producto_descripcion && (
                  <div>
                    <div className="text-xs text-emerald-700 font-semibold mb-1">Producto elegido:</div>
                    <div className="text-sm text-emerald-900 font-semibold">{lead.producto_descripcion}</div>
                  </div>
                )}
                
                {lead.cantidad && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700">Cantidad:</span>
                    <span className="text-emerald-900 font-medium">{lead.cantidad} unidades</span>
                  </div>
                )}

                {lead.precio_final && (
                  <div className="flex justify-between text-sm pt-2 border-t-2 border-emerald-300">
                    <span className="text-emerald-700 font-semibold">TOTAL:</span>
                    <span className="text-emerald-900 font-bold text-lg">{formatPrice(lead.precio_final)}</span>
                  </div>
                )}

                {lead.forma_pago_detalle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700">Forma de pago:</span>
                    <span className="text-emerald-900 font-medium">{lead.forma_pago_detalle}</span>
                  </div>
                )}

                {/* 🆕 Botón Confirmar Pago - Solo si está en "pago_informado" */}
                {lead.estado === 'pago_informado' && (
                  <Button
                    onClick={() => handleChangeEstado('pedido_confirmado')}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold mt-2 shadow-lg"
                  >
                    ✅ Confirmar Pago
                  </Button>
                )}

                {/* Badge del estado del pedido */}
                {lead.estado === 'esperando_pago' && (
                  <Badge variant="outline" className="border-2 border-amber-400 text-amber-700 bg-amber-50 w-full justify-center font-semibold">
                    ⏳ Esperando pago del cliente
                  </Badge>
                )}
                {lead.estado === 'pago_informado' && (
                  <Badge variant="outline" className="border-2 border-blue-400 text-blue-700 bg-blue-50 w-full justify-center font-semibold">
                    💬 Cliente informó pago - Confirmar
                  </Badge>
                )}
                {lead.estado === 'pedido_confirmado' && (
                  <Badge variant="outline" className="border-2 border-emerald-500 text-emerald-700 bg-emerald-50 w-full justify-center font-semibold">
                    ✅ Pago confirmado
                  </Badge>
                )}

                {/* 🆕 Estado del Turno - Siempre visible */}
                <div className="mt-3 pt-3 border-t-2 border-emerald-300">
                  <div className="text-xs text-emerald-700 font-bold mb-2">Estado del turno:</div>
                  {lead.tiene_turno && lead.turno_fecha ? (
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-900 font-medium">
                          📅 {new Date(lead.turno_fecha).toLocaleDateString('es-AR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </span>
                        {lead.turno_hora && (
                          <span className="text-sm text-blue-900 font-medium">
                            🕐 {lead.turno_hora}
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "w-full justify-center font-semibold",
                          lead.turno_estado === 'pendiente' && "border-2 border-amber-400 text-amber-700 bg-amber-50",
                          lead.turno_estado === 'confirmado' && "border-2 border-green-500 text-green-700 bg-green-50",
                          lead.turno_estado === 'completado' && "border-2 border-emerald-500 text-emerald-700 bg-emerald-50"
                        )}
                      >
                        {lead.turno_estado === 'pendiente' && '⏳ Turno Pendiente'}
                        {lead.turno_estado === 'confirmado' && '✅ Turno Confirmado'}
                        {lead.turno_estado === 'completado' && '✔️ Turno Completado'}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="border-2 border-amber-300 text-amber-700 bg-amber-50 w-full justify-center font-semibold">
                      ⏳ Turno Pendiente de Agendar
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Cambiar estado</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("en_conversacion")}
                className="border-2 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-medium"
              >
                En Conversación
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("cotizado")}
                className="border-2 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-medium"
              >
                Cotizado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("esperando_pago")}
                className="border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-medium"
              >
                Esperando Pago
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("pago_informado")}
                className="border-2 border-cyan-300 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 text-xs font-medium"
              >
                Pago Informado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("pedido_confirmado")}
                className="border-2 border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium"
              >
                Pedido Confirmado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeEstado("perdido")}
                className="border-2 border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-medium"
              >
                Perdido
              </Button>
            </div>
          </div>

          {/* Pagos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Pagos</label>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-200">
                {pagos.length}
              </Badge>
            </div>

            {loadingPagos ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : pagos.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago) => (
                  <div key={pago.id} className="bg-white border-2 border-slate-200 rounded-lg p-3">
                    {/* Producto */}
                    {pago.producto_descripcion && (
                      <div className="mb-2">
                        <span className="text-xs text-slate-600">Producto:</span>
                        <p className="text-sm font-semibold text-slate-900">{pago.producto_descripcion}</p>
                      </div>
                    )}
                    
                    {/* Cantidad y Precio */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-700">
                        {pago.cantidad_total && (
                          <span className="font-medium">{pago.cantidad_total} unidades</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatPrice(pago.precio_final || pago.total)}
                      </span>
                    </div>
                    
                    {/* Forma de Pago */}
                    {pago.forma_pago_detalle && (
                      <div className="text-xs text-slate-600 mb-1">
                        💳 {pago.forma_pago_detalle}
                      </div>
                    )}
                    
                    {/* Estado y Fecha */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500">
                        {new Date(pago.created_at).toLocaleDateString('es-AR')}
                      </span>
                      <Badge
                        className={
                          pago.estado_pago === "confirmado"
                            ? "bg-green-100 text-green-700 border-2 border-green-300"
                            : pago.estado_pago === "rechazado"
                              ? "bg-red-100 text-red-700 border-2 border-red-300"
                              : "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                        }
                      >
                        {pago.estado_pago || 'pendiente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notas</label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agregar notas sobre el lead..."
              className="bg-white border-2 border-slate-300 text-slate-900 focus:border-blue-500 min-h-[100px]"
            />
            <Button onClick={handleSaveNotas} size="sm" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-lg">
              Guardar Notas
            </Button>
          </div>

          {/* Crear Pedido */}
          {lead.estado === "pago_verificado" && (
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-lg">
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
                  className="w-full border-2 border-red-400 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 font-medium"
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white border-2 border-red-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-700 font-bold">¿Eliminar lead?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-700">
                    Esta acción no se puede deshacer. Se eliminará el lead <strong className="text-red-700">{nombre}</strong> y todos sus datos asociados (consultas, pedidos, pagos).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-100 border-2 border-slate-300 text-slate-700 hover:bg-slate-200">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg"
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
