"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Phone, Calendar } from "lucide-react"
import Link from "next/link"

interface Pedido {
  id: string
  lead_id: string
  cliente_nombre: string
  cliente_telefono: string
  codigo_confirmacion: string  // 🆕 Código para agendar turno
  region: string
  estado_lead: string
  whatsapp_label: string
  productos: any
  cantidad_total: number
  forma_pago: string
  subtotal: number
  descuento_porcentaje: number
  total: number
  estado_pago: string
  fecha_pedido: string
  fecha_pago: string | null
  // Turno (tabla turnos unificada)
  turno_id: string | null
  tipo_entrega: string | null
  fecha_turno: string | null
  hora_turno: string | null
  estado_turno: string | null
  turno_estado_pago: string  // 🆕 Estado de pago del turno (pendiente/confirmado)
  observaciones: string | null
}

interface PedidosTableProps {
  pedidos: Pedido[]
}

const ESTADO_LEAD_COLORS: Record<string, string> = {
  pagado: "bg-green-100 text-green-700 border-green-200",
  turno_pendiente: "bg-blue-100 text-blue-700 border-blue-200",
  turno_agendado: "bg-purple-100 text-purple-700 border-purple-200",
  pedido_enviado: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pedido_finalizado: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const ESTADO_LEAD_LABELS: Record<string, string> = {
  pagado: "✅ Pagado",
  turno_pendiente: "📅 Turno Pendiente",
  turno_agendado: "🗓️ Turno Agendado",
  pedido_enviado: "📦 En Camino",
  pedido_finalizado: "🎉 Finalizado",
}

const ESTADO_TURNO_COLORS: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  confirmado: "bg-blue-100 text-blue-700",
  en_proceso: "bg-yellow-100 text-yellow-700",
  completado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

// 🆕 Colores para estado de pago de turnos
const ESTADO_PAGO_TURNO_COLORS: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700 border-green-200",
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  rechazado: "bg-red-100 text-red-700 border-red-200",
}

const ESTADO_PAGO_TURNO_LABELS: Record<string, string> = {
  confirmado: "✅ Pago Confirmado",
  pendiente: "⏳ A Confirmar Pago",
  rechazado: "❌ Pago Rechazado",
}

export function PedidosTable({ pedidos }: PedidosTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [tipoEntregaFilter, setTipoEntregaFilter] = useState<string>("all")

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((pedido) => {
      const matchesSearch =
        pedido.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_telefono.includes(searchTerm) ||
        pedido.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = estadoFilter === "all" || pedido.estado_lead === estadoFilter
      const matchesTipoEntrega = tipoEntregaFilter === "all" || pedido.tipo_entrega === tipoEntregaFilter

      return matchesSearch && matchesEstado && matchesTipoEntrega
    })
  }, [pedidos, searchTerm, estadoFilter, tipoEntregaFilter])

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
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const openWhatsApp = (telefono: string) => {
    const phone = telefono.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  return (
    <div className="space-y-4">
      {/* Filters - FIXED: Fondo blanco */}
      <Card className="bg-white border-slate-200 p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, teléfono o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[180px]"
          >
            <option value="all">Todos los estados</option>
            <option value="pagado">✅ Pagado</option>
            <option value="turno_pendiente">📅 Turno Pendiente</option>
            <option value="turno_agendado">🗓️ Turno Agendado</option>
            <option value="pedido_enviado">📦 En Camino</option>
            <option value="pedido_finalizado">🎉 Finalizado</option>
          </select>

          <select
            value={tipoEntregaFilter}
            onChange={(e) => setTipoEntregaFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[160px]"
          >
            <option value="all">Todos los tipos</option>
            <option value="retiro">🏪 Retiro</option>
            <option value="envio">📦 Envío</option>
            <option value="colocacion">🔧 Colocación</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Mostrando {filteredPedidos.length} de {pedidos.length} pedidos
        </div>
      </Card>

      {/* Table - FIXED: Fondo blanco */}
      <Card className="bg-white border-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-slate-50">
                <TableHead className="text-slate-700">Cliente</TableHead>
                <TableHead className="text-slate-700">Código</TableHead>
                <TableHead className="text-slate-700">Teléfono</TableHead>
                <TableHead className="text-slate-700">Región</TableHead>
                <TableHead className="text-slate-700">Estado</TableHead>
                <TableHead className="text-slate-700">Entrega</TableHead>
                <TableHead className="text-slate-700">Turno</TableHead>
                <TableHead className="text-slate-700 text-right">Total</TableHead>
                <TableHead className="text-slate-700">Fecha Pedido</TableHead>
                <TableHead className="text-slate-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-slate-400 py-8">
                    No se encontraron pedidos
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell className="text-slate-900 font-medium">{pedido.cliente_nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-300">
                        {pedido.codigo_confirmacion || 'Sin código'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-sm">{pedido.cliente_telefono}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWhatsApp(pedido.cliente_telefono)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-6 w-6 p-0"
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-slate-300">
                        {pedido.region}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={ESTADO_LEAD_COLORS[pedido.estado_lead] || "bg-slate-100 text-slate-600"}>
                        {ESTADO_LEAD_LABELS[pedido.estado_lead] || pedido.estado_lead}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-600 capitalize text-sm">
                          {pedido.tipo_entrega ? (
                            pedido.tipo_entrega === 'retiro' ? '🏪 Retiro' :
                            pedido.tipo_entrega === 'colocacion' ? '� Colocación' :
                            '� Envío'
                          ) : '⏳ Sin definir'}
                        </span>
                        {pedido.estado_turno && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${ESTADO_TURNO_COLORS[pedido.estado_turno]}`}
                          >
                            {pedido.estado_turno}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {pedido.fecha_turno ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(pedido.fecha_turno).toLocaleDateString('es-AR')}
                              {pedido.hora_turno && ` ${pedido.hora_turno}`}
                            </span>
                          </div>
                          {/* 🆕 Estado de Pago del Turno */}
                          {pedido.turno_id && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${ESTADO_PAGO_TURNO_COLORS[pedido.turno_estado_pago] || ESTADO_PAGO_TURNO_COLORS.pendiente}`}
                            >
                              {ESTADO_PAGO_TURNO_LABELS[pedido.turno_estado_pago] || ESTADO_PAGO_TURNO_LABELS.pendiente}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Sin turno</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 font-medium">
                      {formatPrice(pedido.total)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{formatDate(pedido.fecha_pedido)}</TableCell>
                    <TableCell>
                      <Link href={`/leads`}>
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Lead
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
