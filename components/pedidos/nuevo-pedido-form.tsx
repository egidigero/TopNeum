"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

interface Producto {
  id: string
  marca: string
  diseno: string
  modelo: string
  medida: string
  codigo: string
  stock: number
  precio_online_base: number
}

interface NuevoPedidoFormProps {
  productos: Producto[]
}

interface PedidoItem {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export function NuevoPedidoForm({ productos }: NuevoPedidoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    cliente_nombre: "",
    cliente_telefono: "",
    direccion: "",
    tipo_entrega: "retiro",
    notas: "",
  })
  const [items, setItems] = useState<PedidoItem[]>([])
  const [selectedProducto, setSelectedProducto] = useState("")
  const [cantidad, setCantidad] = useState(1)

  const addItem = () => {
    if (!selectedProducto) return

    const producto = productos.find((p) => p.id === selectedProducto)
    if (!producto) return

    setItems([
      ...items,
      {
        producto_id: producto.id,
        cantidad,
        precio_unitario: producto.precio_online_base,
      },
    ])

    setSelectedProducto("")
    setCantidad(1)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const getProductoById = (id: string) => {
    return productos.find((p) => p.id === id)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (items.length === 0) {
      setError("Debes agregar al menos un producto")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items,
          items_total: calculateTotal(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al crear pedido")
        return
      }

      router.push("/pedidos")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <Link href="/pedidos">
        <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a pedidos
        </Button>
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cliente Info */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_nombre" className="text-slate-200">
                  Nombre *
                </Label>
                <Input
                  id="cliente_nombre"
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_telefono" className="text-slate-200">
                  Teléfono *
                </Label>
                <Input
                  id="cliente_telefono"
                  value={formData.cliente_telefono}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_entrega" className="text-slate-200">
                Tipo de Entrega *
              </Label>
              <select
                id="tipo_entrega"
                value={formData.tipo_entrega}
                onChange={(e) => setFormData({ ...formData, tipo_entrega: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="retiro">Retiro en local</option>
                <option value="envio_caba">Envío CABA</option>
                <option value="envio_interior">Envío Interior</option>
              </select>
            </div>

            {formData.tipo_entrega !== "retiro" && (
              <div className="space-y-2">
                <Label htmlFor="direccion" className="text-slate-200">
                  Dirección *
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  required={formData.tipo_entrega !== "retiro"}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notas" className="text-slate-200">
                Notas
              </Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item */}
            <div className="flex gap-4">
              <select
                value={selectedProducto}
                onChange={(e) => setSelectedProducto(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.codigo} - {producto.medida} {producto.diseno} {producto.marca} (Stock: {producto.stock})
                  </option>
                ))}
              </select>

              <Input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Number.parseInt(e.target.value))}
                className="w-24 bg-slate-800 border-slate-700 text-white"
              />

              <Button
                type="button"
                onClick={addItem}
                disabled={!selectedProducto}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No hay productos agregados</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const producto = getProductoById(item.producto_id)
                  if (!producto) return null

                  return (
                    <div key={index} className="flex items-center gap-4 bg-slate-800 rounded-lg p-4">
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {producto.medida} {producto.diseno} {producto.marca}
                        </p>
                        <p className="text-sm text-slate-400">{producto.codigo}</p>
                      </div>
                      <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                        x{item.cantidad}
                      </Badge>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatPrice(item.cantidad * item.precio_unitario)}</p>
                        <p className="text-xs text-slate-400">{formatPrice(item.precio_unitario)} c/u</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}

                <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-700">
                  <span className="text-lg text-slate-300 font-semibold">Total:</span>
                  <span className="text-2xl text-white font-bold">{formatPrice(calculateTotal())}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading || items.length === 0}>
            {loading ? "Creando..." : "Crear Pedido"}
          </Button>
          <Link href="/pedidos">
            <Button type="button" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
