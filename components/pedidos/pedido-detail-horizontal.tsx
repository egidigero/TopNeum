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
    // Datos del cliente
    email: string | null
    dni: string | null
    direccion: string | null
    localidad: string | null
    provincia: string | null
    codigo_postal: string | null
    notas: string | null
    // Datos del pedido
    productos: any
    producto_descripcion?: string | null
    cantidad_total: number
    forma_pago: string
    subtotal: number
    descuento_porcentaje: number
    total: number
    estado_pago: string
    fecha_pedido: string
    fecha_pago: string | null
    // Turno/Envío
    turno_id: string | null
    tipo_entrega: string | null
    fecha_turno: string | null
    hora_turno: string | null
    estado_turno: string | null
    turno_estado_pago: string
    observaciones: string | null
    datos_envio: any
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div 
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="border-b-2 border-emerald-200 bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
          <div className="flex items-start justify-between max-w-7xl mx-auto">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6" />
                <h2 className="text-white text-2xl font-bold">Pedido Confirmado</h2>
              </div>
              <div className="text-emerald-50 text-xl font-semibold">{pedido.cliente_nombre}</div>
              <div className="flex items-center gap-2 text-sm text-emerald-100 mt-1">
                <Phone className="w-4 h-4" />
                <span className="font-mono">{pedido.cliente_telefono}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={openWhatsApp} 
                className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50"
              >
                <Phone className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose} 
                className="text-white hover:text-white hover:bg-emerald-600/50"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content - Grid horizontal */}
        <div className="overflow-y-auto max-h-[calc(85vh-130px)] bg-slate-50">
          <div className="max-w-7xl mx-auto p-6">
            {/* Info Badges */}
            <div className="flex items-center gap-3 flex-wrap mb-6">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-2 border-emerald-200 px-4 py-2 text-base">
                ✅ Pago Confirmado
              </Badge>
              <Badge variant="outline" className="border-2 border-slate-300 text-slate-700 px-4 py-2 text-base">
                📍 {pedido.region}
              </Badge>
              {pedido.codigo_confirmacion && (
                <Badge variant="outline" className="border-2 border-blue-400 bg-blue-50 text-blue-700 font-mono px-4 py-2 text-base">
                  {pedido.codigo_confirmacion}
                </Badge>
              )}
            </div>

            {/* Grid 3 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Columna 1: Cliente */}
              <Card className="bg-white border-2 border-blue-200 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">👤</span>
                    </div>
                    <CardTitle className="text-lg text-slate-800">Cliente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 uppercase mb-1">Teléfono</div>
                    <div className="text-slate-900 font-mono font-semibold">{pedido.cliente_telefono}</div>
                  </div>
                  {pedido.email && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1">Email</div>
                      <div className="text-slate-900 text-sm">{pedido.email}</div>
                    </div>
                  )}
                  {pedido.dni && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1">DNI</div>
                      <div className="text-slate-900 font-medium">{pedido.dni}</div>
                    </div>
                  )}
                  {pedido.direccion && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-slate-500 uppercase mb-1">Dirección</div>
                      <div className="text-slate-900 font-medium text-sm leading-relaxed">
                        {pedido.direccion}
                        {(pedido.localidad || pedido.provincia) && (
                          <div className="text-slate-600 mt-1">
                            {pedido.localidad}{pedido.localidad && pedido.provincia && ', '}{pedido.provincia}
                            {pedido.codigo_postal && ` (${pedido.codigo_postal})`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Columna 2: Pedido */}
              <Card className="bg-white border-2 border-emerald-200 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-br from-emerald-50 to-green-50">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-lg">💰</span>
                    </div>
                    <CardTitle className="text-lg text-slate-800">Pedido</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 text-sm">Fecha:</span>
                    <span className="text-slate-900 font-semibold">{formatDate(pedido.fecha_pedido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 text-sm">Cantidad:</span>
                    <span className="text-slate-900 font-semibold">{pedido.cantidad_total} neumáticos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 text-sm">Forma de pago:</span>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium">
                      {pedido.forma_pago}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t-2 border-emerald-200">
                    <span className="text-emerald-700 font-bold text-lg">Total:</span>
                    <span className="text-emerald-900 font-bold text-2xl">{formatPrice(pedido.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Columna 3: Entrega */}
              <Card className="bg-white border-2 border-orange-200 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-br from-orange-50 to-amber-50">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-lg">🚚</span>
                    </div>
                    <CardTitle className="text-lg text-slate-800">Entrega</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {pedido.tipo_entrega ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm">Tipo:</span>
                        <Badge variant="outline" className="border-2 border-orange-300 bg-white text-orange-700 font-semibold">
                          {pedido.tipo_entrega === 'colocacion' && '🔧 Colocación'}
                          {pedido.tipo_entrega === 'retiro' && '🏪 Retiro'}
                          {pedido.tipo_entrega === 'envio' && '📦 Envío'}
                        </Badge>
                      </div>

                      {/* Envío */}
                      {pedido.tipo_entrega === 'envio' && pedido.datos_envio && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-bold text-orange-700 uppercase mb-2">Dirección de Envío</div>
                          {pedido.datos_envio.nombre_destinatario && (
                            <div className="text-slate-900 font-semibold mb-1">{pedido.datos_envio.nombre_destinatario}</div>
                          )}
                          {(pedido.datos_envio.calle || pedido.datos_envio.altura) && (
                            <div className="text-slate-700 text-sm">
                              {pedido.datos_envio.calle} {pedido.datos_envio.altura}
                              {(pedido.datos_envio.localidad || pedido.datos_envio.provincia) && (
                                <div className="mt-1">
                                  {pedido.datos_envio.localidad}{pedido.datos_envio.localidad && pedido.datos_envio.provincia && ', '}
                                  {pedido.datos_envio.provincia}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Turno */}
                      {pedido.fecha_turno && pedido.tipo_entrega !== 'envio' && (
                        <div className="flex justify-between items-center bg-orange-50 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-600" />
                            <span className="text-slate-600 text-sm">Fecha:</span>
                          </div>
                          <span className="text-slate-900 font-semibold">
                            {formatDate(pedido.fecha_turno)}
                            {pedido.hora_turno && (
                              <span className="text-orange-600 ml-2">
                                {pedido.hora_turno.substring(0, 5)}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      ⏳ Esperando que elija tipo de entrega
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Productos - Full width */}
            <Card className="bg-white border-2 border-purple-200 shadow-sm mb-6">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">🛞</span>
                  </div>
                  <CardTitle className="text-lg text-slate-800">Productos Cotizados</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {(pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pedido.productos.map((prod: any, idx: number) => (
                      <div key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 text-base">
                              {prod.marca} {prod.modelo}
                            </div>
                            <div className="text-purple-700 font-semibold mt-1">{prod.medida}</div>
                            {prod.descripcion && (
                              <div className="text-xs text-slate-600 mt-2 leading-relaxed">{prod.descripcion}</div>
                            )}
                          </div>
                          {prod.precio && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-purple-700">{formatPrice(prod.precio)}</div>
                              <div className="text-xs text-slate-500">por unidad</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pedido.producto_descripcion ? (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 text-center">
                    <div className="font-bold text-slate-900 text-base mb-2">{pedido.producto_descripcion}</div>
                    <div className="text-slate-500 text-xs">(Desde producto_descripcion)</div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <div className="text-slate-400 text-sm">ℹ️ No hay información de productos registrada</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas */}
            {pedido.notas && (
              <Card className="bg-white border-2 border-yellow-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-bold text-lg">📋</span>
                    </div>
                    <CardTitle className="text-lg text-slate-800">Notas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{pedido.notas}</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
