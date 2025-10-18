"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ProductoFormProps {
  producto?: {
    id: string
    marca: string
    diseno: string
    modelo: string
    medida: string
    codigo: string
    costo: number
    stock: number
    precio_lista_base: number | null
    activo: boolean
  }
}

export function ProductoForm({ producto }: ProductoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    marca: producto?.marca || "",
    diseno: producto?.diseno || "",
    modelo: producto?.modelo || "",
    medida: producto?.medida || "",
    codigo: producto?.codigo || "",
    costo: producto?.costo || 0,
    stock: producto?.stock || 0,
    precio_lista_base: producto?.precio_lista_base || null,
    activo: producto?.activo ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const url = producto ? `/api/productos/${producto.id}` : "/api/productos"

      const method = producto ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al guardar producto")
        return
      }

      router.push("/catalogo")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/catalogo">
        <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al catálogo
        </Button>
      </Link>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">{producto ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca" className="text-slate-200">
                  Marca *
                </Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Michelin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diseno" className="text-slate-200">
                  Diseño *
                </Label>
                <Input
                  id="diseno"
                  value={formData.diseno}
                  onChange={(e) => setFormData({ ...formData, diseno: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Primacy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo" className="text-slate-200">
                  Modelo *
                </Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medida" className="text-slate-200">
                  Medida *
                </Label>
                <Input
                  id="medida"
                  value={formData.medida}
                  onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="205/55R16"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo" className="text-slate-200">
                  Código *
                </Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="MICH-PRIM4-205-55-16"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costo" className="text-slate-200">
                  Costo *
                </Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  value={formData.costo}
                  onChange={(e) => setFormData({ ...formData, costo: Number.parseFloat(e.target.value) })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="85000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-slate-200">
                  Stock *
                </Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_lista_base" className="text-slate-200">
                  Precio Lista Base (opcional)
                </Label>
                <Input
                  id="precio_lista_base"
                  type="number"
                  step="0.01"
                  value={formData.precio_lista_base || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      precio_lista_base: e.target.value ? Number.parseFloat(e.target.value) : null,
                    })
                  }
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Dejar vacío para calcular automáticamente"
                />
                <p className="text-xs text-slate-500">Si se deja vacío, se calculará con jitter de la tarifa vigente</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800"
              />
              <Label htmlFor="activo" className="text-slate-200">
                Producto activo
              </Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? "Guardando..." : producto ? "Actualizar Producto" : "Crear Producto"}
              </Button>
              <Link href="/catalogo">
                <Button type="button" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
