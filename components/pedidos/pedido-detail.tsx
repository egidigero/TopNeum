"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Phone, MapPin, Package, Truck, CheckCircle } from "lucide-react"
import Link from "next/link"

interface PedidoDetailProps {
  pedido: {
    id: string
    cliente_nombre: string
    cliente_telefono: string
    estado: string
    direccion: string
    tipo_entrega: string
    items_total: number
    notas: string | null
    created_at: string
    updated_at: string
  }
  items: Array<{
    id: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    marca: string
    diseno: string
    modelo: string
    medida: string
    codigo: string
  }>
}

const ESTADOS = [
  { value: "pendiente_preparacion", label: "Pendiente Preparación", icon: Package },
  { value: "preparado", label: "Preparado", icon: CheckCircle },
  { value: "despachado", label: "Despachado", icon: Truck },
  { value: "entregado", label: "Entregado", icon: CheckCircle },
]

export function PedidoDetail({ pedido, items }: PedidoDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

  const openWhatsApp = () => {
    const phone = pedido.cliente_telefono.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}`, "_blank")
  }

  async function handleChangeEstado(nuevoEstado: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Update pedido error:", error)
    } finally {
      setLoading(false)
    }
  }

  const currentEstadoIndex = ESTADOS.findIndex((e) => e.value === pedido.estado)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/pedidos">
          <Button variant="ghost" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a pedidos
          </Button>
        </Link>

        <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700">
          <Phone className="w-4 h-4 mr-2" />
          Contactar Cliente
        </Button>
      </div>

      {/* Header */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl mb-2">Pedido #{pedido.id.substring(0, 8)}</CardTitle>
              <div className="space-y-1 text-sm text-slate-400">
                <p>Creado: {formatDate(pedido.created_at)}</p>
                <p>Actualizado: {formatDate(pedido.updated_at)}</p>
              </div>
            </div>
            <Badge
              className={
                pedido.estado === "entregado"
                  ? "bg-green-900/50 text-green-300"
                  : pedido.estado === "cancelado"
                    ? "bg-red-900/50 text-red-300"
                    : "bg-blue-900/50 text-blue-300"
              }
            >
              {pedido.estado.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cliente Info */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">Nombre</p>
              <p className="text-white font-medium">{pedido.cliente_nombre}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Teléfono</p>
              <p className="text-white font-mono">{pedido.cliente_telefono}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Tipo de Entrega</p>
              <p className="text-white capitalize">{pedido.tipo_entrega?.replace("_", " ")}</p>
            </div>
            {pedido.direccion && (
              <div>
                <p className="text-sm text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Dirección
                </p>
                <p className="text-white">{pedido.direccion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-lg">Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ESTADOS.map((estado, index) => {
                const Icon = estado.icon
                const isCompleted = index <= currentEstadoIndex
                const isCurrent = index === currentEstadoIndex

                return (
                  <div key={estado.value} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-blue-600" : "bg-slate-800"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isCompleted ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCompleted ? "text-white" : "text-slate-500"}`}>{estado.label}</p>
                    </div>
                    {isCurrent && index < ESTADOS.length - 1 && (
                      <Button
                        size="sm"
                        onClick={() => handleChangeEstado(ESTADOS[index + 1].value)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Avanzar
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Items del Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-300">Código</TableHead>
                <TableHead className="text-slate-300">Producto</TableHead>
                <TableHead className="text-slate-300 text-right">Cantidad</TableHead>
                <TableHead className="text-slate-300 text-right">Precio Unit.</TableHead>
                <TableHead className="text-slate-300 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-slate-800">
                  <TableCell className="font-mono text-sm text-slate-400">{item.codigo}</TableCell>
                  <TableCell className="text-white">
                    {item.medida} {item.diseno} {item.marca}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">{item.cantidad}</TableCell>
                  <TableCell className="text-right text-slate-300">{formatPrice(item.precio_unitario)}</TableCell>
                  <TableCell className="text-right text-white font-medium">{formatPrice(item.subtotal)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-slate-800 border-t-2">
                <TableCell colSpan={4} className="text-right text-white font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right text-white font-bold text-lg">
                  {formatPrice(pedido.items_total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notas */}
      {pedido.notas && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">{pedido.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
