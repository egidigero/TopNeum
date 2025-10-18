"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Phone } from "lucide-react"
import Link from "next/link"

interface Pedido {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  estado: string
  tipo_entrega: string
  items_total: number
  items_count: number
  created_at: string
  updated_at: string
}

interface PedidosTableProps {
  pedidos: Pedido[]
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente_preparacion: "bg-yellow-900/50 text-yellow-300",
  preparado: "bg-blue-900/50 text-blue-300",
  despachado: "bg-purple-900/50 text-purple-300",
  entregado: "bg-green-900/50 text-green-300",
  cancelado: "bg-red-900/50 text-red-300",
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente_preparacion: "Pendiente",
  preparado: "Preparado",
  despachado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export function PedidosTable({ pedidos }: PedidosTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("all")

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((pedido) => {
      const matchesSearch =
        pedido.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_telefono.includes(searchTerm) ||
        pedido.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = estadoFilter === "all" || pedido.estado === estadoFilter

      return matchesSearch && matchesEstado
    })
  }, [pedidos, searchTerm, estadoFilter])

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
      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, teléfono o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente_preparacion">Pendiente</option>
            <option value="preparado">Preparado</option>
            <option value="despachado">Despachado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredPedidos.length} de {pedidos.length} pedidos
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">ID</TableHead>
                <TableHead className="text-slate-300">Cliente</TableHead>
                <TableHead className="text-slate-300">Teléfono</TableHead>
                <TableHead className="text-slate-300">Estado</TableHead>
                <TableHead className="text-slate-300">Tipo Entrega</TableHead>
                <TableHead className="text-slate-300 text-right">Items</TableHead>
                <TableHead className="text-slate-300 text-right">Total</TableHead>
                <TableHead className="text-slate-300">Fecha</TableHead>
                <TableHead className="text-slate-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                    No se encontraron pedidos
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-xs text-slate-400">{pedido.id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-white font-medium">{pedido.cliente_nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-mono text-sm">{pedido.cliente_telefono}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWhatsApp(pedido.cliente_telefono)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20 h-6 w-6 p-0"
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ESTADO_COLORS[pedido.estado] || "bg-slate-800 text-slate-300"}>
                        {ESTADO_LABELS[pedido.estado] || pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300 capitalize">
                      {pedido.tipo_entrega?.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">{pedido.items_count}</TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {formatPrice(pedido.items_total)}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{formatDate(pedido.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/pedidos/${pedido.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <Eye className="w-4 h-4" />
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
