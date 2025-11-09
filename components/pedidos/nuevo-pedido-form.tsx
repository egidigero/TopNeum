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
import { Plus, Trash2 } from "lucide-react"
import Link from "next/link"

interface Producto {
  id: string
  marca: string
  diseno: string
  modelo: string
  medida: string
  indice: string
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
  const [selectedMedida, setSelectedMedida] = useState("")
  const [selectedIndice, setSelectedIndice] = useState("")
  const [selectedMarca, setSelectedMarca] = useState("")
  const [selectedProducto, setSelectedProducto] = useState("")
  const [cantidad, setCantidad] = useState(1)

  // Obtener medidas únicas
  const medidasUnicas = Array.from(new Set(productos.map(p => p.medida))).sort()

  // Filtrar índices disponibles según medida seleccionada
  const indicesDisponibles = selectedMedida
    ? Array.from(new Set(
        productos
          .filter(p => p.medida === selectedMedida)
          .map(p => p.indice)
      )).sort()
    : []

  // Filtrar marcas disponibles según medida e índice seleccionados
  const marcasDisponibles = selectedMedida && selectedIndice
    ? Array.from(new Set(
        productos
          .filter(p => p.medida === selectedMedida && p.indice === selectedIndice)
          .map(p => p.marca)
      )).sort()
    : []

  // Filtrar productos finales según todos los criterios
  const productosFiltrados = selectedMedida && selectedIndice && selectedMarca
    ? productos.filter(
        p => p.medida === selectedMedida && 
             p.indice === selectedIndice && 
             p.marca === selectedMarca
      )
    : []

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

    // Resetear selección
    setSelectedMedida("")
    setSelectedIndice("")
    setSelectedMarca("")
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cliente Info */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_nombre" className="text-slate-700">
                  Nombre *
                </Label>
                <Input
                  id="cliente_nombre"
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_telefono" className="text-slate-700">
                  Teléfono *
                </Label>
                <Input
                  id="cliente_telefono"
                  value={formData.cliente_telefono}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_entrega" className="text-slate-700">
                Tipo de Entrega *
              </Label>
              <select
                id="tipo_entrega"
                value={formData.tipo_entrega}
                onChange={(e) => setFormData({ ...formData, tipo_entrega: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="retiro">Retiro en local</option>
                <option value="envio_caba">Envío CABA</option>
                <option value="envio_interior">Envío Interior</option>
              </select>
            </div>

            {formData.tipo_entrega !== "retiro" && (
              <div className="space-y-2">
                <Label htmlFor="direccion" className="text-slate-700">
                  Dirección *
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  required={formData.tipo_entrega !== "retiro"}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notas" className="text-slate-700">
                Notas
              </Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="bg-white border-slate-300 text-slate-900"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item - Filtros en cascada */}
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                {/* Filtro 1: Medida */}
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Medida</Label>
                  <select
                    value={selectedMedida}
                    onChange={(e) => {
                      setSelectedMedida(e.target.value)
                      setSelectedIndice("")
                      setSelectedMarca("")
                      setSelectedProducto("")
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm"
                  >
                    <option value="">Todas las medidas</option>
                    {medidasUnicas.map((medida) => (
                      <option key={medida} value={medida}>
                        {medida}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro 2: Índice */}
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Índice</Label>
                  <select
                    value={selectedIndice}
                    onChange={(e) => {
                      setSelectedIndice(e.target.value)
                      setSelectedMarca("")
                      setSelectedProducto("")
                    }}
                    disabled={!selectedMedida}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Índice...</option>
                    {indicesDisponibles.map((indice) => (
                      <option key={indice} value={indice}>
                        {indice}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro 3: Marca */}
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Marca</Label>
                  <select
                    value={selectedMarca}
                    onChange={(e) => {
                      setSelectedMarca(e.target.value)
                      setSelectedProducto("")
                    }}
                    disabled={!selectedIndice}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Marca...</option>
                    {marcasDisponibles.map((marca) => (
                      <option key={marca} value={marca}>
                        {marca}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro 4: Producto específico */}
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Producto</Label>
                  <select
                    value={selectedProducto}
                    onChange={(e) => setSelectedProducto(e.target.value)}
                    disabled={!selectedMarca}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Producto...</option>
                    {productosFiltrados.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.diseno} (Stock: {producto.stock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cantidad y botón agregar */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  {selectedProducto && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-slate-900 font-medium">
                        {productos.find(p => p.id === selectedProducto)?.medida} {productos.find(p => p.id === selectedProducto)?.indice} - {productos.find(p => p.id === selectedProducto)?.marca} {productos.find(p => p.id === selectedProducto)?.diseno}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatPrice(productos.find(p => p.id === selectedProducto)?.precio_online_base || 0)} c/u
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number.parseInt(e.target.value))}
                    className="w-24 bg-white border-slate-300 text-slate-900"
                  />
                </div>
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
                    <div key={index} className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex-1">
                        <p className="text-slate-900 font-medium">
                          {producto.medida} {producto.indice} - {producto.marca} {producto.diseno}
                        </p>
                        <p className="text-sm text-slate-600">{producto.codigo}</p>
                      </div>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                        x{item.cantidad}
                      </Badge>
                      <div className="text-right">
                        <p className="text-slate-900 font-medium">{formatPrice(item.cantidad * item.precio_unitario)}</p>
                        <p className="text-xs text-slate-600">{formatPrice(item.precio_unitario)} c/u</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}

                <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200">
                  <span className="text-lg text-slate-700 font-semibold">Total:</span>
                  <span className="text-2xl text-slate-900 font-bold">{formatPrice(calculateTotal())}</span>
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
            <Button type="button" variant="outline" className="border-slate-300 text-slate-700">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
