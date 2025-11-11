"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Phone, Package, Calendar, MapPin } from "lucide-react"

interface PedidoDetailPanelProps {
  pedido: {
    id: string
    lead_id: string
    cliente_nombre: string
    cliente_telefono: string
    codigo_confirmacion: string
    region: string
    estado_lead: string
    productos: any
    cantidad_total: number
    forma_pago: string
    total: number
    estado_pago: string
    fecha_pedido: string
    fecha_pago: string | null
    turno_id: string | null
    tipo_entrega: string | null
    fecha_turno: string | null
    hora_turno: string | null
    estado_turno: string | null
    turno_estado_pago: string
    observaciones: string | null
  }
  onClose: () => void
  onUpdate: () => void
}

export function PedidoDetailPanel({ pedido, onClose, onUpdate }: PedidoDetailPanelProps) {
  const openWhatsApp = () => {
    const phone = pedido.cliente_telefono.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="w-96 flex-shrink-0">
      <Card className="bg-white border-2 border-emerald-100 shadow-xl sticky top-8">
        <CardHeader className="border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-slate-900 text-lg font-bold">{pedido.cliente_nombre}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span className="font-mono">{pedido.cliente_telefono}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600 hover:text-slate-900 hover:bg-emerald-100">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto bg-emerald-50/30">
          {/* Quick Actions */}
          <div className="space-y-2">
            <Button onClick={openWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <Phone className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>

          {/* Info Básica */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Package className="w-3 h-3 mr-1" />
                Pedido Confirmado
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {pedido.region}
              </Badge>
              {pedido.codigo_confirmacion && (
                <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700 font-mono">
                  {pedido.codigo_confirmacion}
                </Badge>
              )}
            </div>
          </div>

          {/* Detalle del Pedido */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Detalle del Pedido</label>
            <div className="bg-white border-2 border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Fecha pedido:</span>
                <span className="text-slate-900 font-medium">{formatDate(pedido.fecha_pedido)}</span>
              </div>
              {pedido.fecha_pago && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Fecha pago:</span>
                  <span className="text-slate-900 font-medium">{formatDate(pedido.fecha_pago)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cantidad:</span>
                <span className="text-slate-900 font-medium">{pedido.cantidad_total} neumáticos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Forma de pago:</span>
                <span className="text-slate-900 font-medium">{pedido.forma_pago}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-emerald-100">
                <span className="text-emerald-700">Total:</span>
                <span className="text-emerald-900">{formatPrice(pedido.total)}</span>
              </div>
            </div>
          </div>

          {/* Estado del Turno/Entrega */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Entrega</label>
            <div className="bg-white border-2 border-blue-200 rounded-lg p-3 space-y-2">
              {pedido.tipo_entrega && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tipo:</span>
                  <Badge variant="outline" className="capitalize">
                    {pedido.tipo_entrega === 'colocacion' && '🔧 Colocación'}
                    {pedido.tipo_entrega === 'retiro' && '📦 Retiro'}
                    {pedido.tipo_entrega === 'envio' && '🚚 Envío'}
                  </Badge>
                </div>
              )}
              
              {pedido.fecha_turno && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Fecha:
                  </span>
                  <span className="text-slate-900 font-medium">
                    {formatDate(pedido.fecha_turno)} {pedido.hora_turno && `a las ${pedido.hora_turno.substring(0, 5)}`}
                  </span>
                </div>
              )}

              {pedido.estado_turno && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Estado turno:</span>
                  <Badge variant="outline" className="capitalize">
                    {pedido.estado_turno === 'pendiente' && '⏳ Pendiente'}
                    {pedido.estado_turno === 'confirmado' && '✅ Confirmado'}
                    {pedido.estado_turno === 'completado' && '🎉 Completado'}
                    {pedido.estado_turno === 'cancelado' && '❌ Cancelado'}
                  </Badge>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Estado pago:</span>
                <Badge 
                  variant="outline" 
                  className={
                    pedido.turno_estado_pago === 'confirmado' 
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  }
                >
                  {pedido.turno_estado_pago === 'confirmado' ? '✅ Pago Confirmado' : '⏳ A Confirmar'}
                </Badge>
              </div>

              {!pedido.turno_id && (
                <div className="text-sm text-slate-400 text-center py-2 border-2 border-dashed border-slate-200 rounded">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  El cliente aún no agendó turno
                </div>
              )}

              {pedido.observaciones && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Observaciones:</div>
                  <div className="text-sm text-slate-700">{pedido.observaciones}</div>
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          {pedido.productos && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Productos</label>
              <div className="bg-white border-2 border-slate-200 rounded-lg p-3">
                <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                  {JSON.stringify(pedido.productos, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
