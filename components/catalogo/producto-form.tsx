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

interface ProductoFormPropsExtended extends ProductoFormProps {
  onModal?: boolean
}

import { DialogClose } from "@/components/ui/dialog"

export function ProductoForm({ producto, onModal = false }: ProductoFormPropsExtended) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    marca: producto?.marca || "",
    familia: (producto as any)?.familia || "",
    diseno: producto?.diseno || "",
    modelo: producto?.modelo || "",
    medida: producto?.medida || "",
    codigo: producto?.codigo || "",
    costo: producto?.costo || 0,
    stock: producto?.stock || 0,
    precio_lista_base: producto?.precio_lista_base || null,
    activo: producto?.activo ?? true,
  })

  const isFormValid =
    formData.marca.trim() !== "" &&
    formData.familia.trim() !== "" &&
    formData.diseno.trim() !== "" &&
    formData.modelo.trim() !== "" &&
    formData.medida.trim() !== "" &&
    formData.codigo.trim() !== "" &&
    formData.costo !== undefined &&
    !Number.isNaN(Number(formData.costo))

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
      {!onModal ? (
        <Link href="/catalogo">
          <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Button>
        </Link>
      ) : (
        <div className="mb-4">
          <DialogClose>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </DialogClose>
        </div>
      )}

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
                <select
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border-slate-700 rounded text-white"
                >
                  <option value="">Seleccionar marca</option>
                  <option value="Yokohama">Yokohama</option>
                  <option value="Hankook">Hankook</option>
                  <option value="LingLong">LingLong</option>
                  <option value="Laufenn">Laufenn</option>
                  <option value="Nankang">Nankang</option>
                  <option value="Michelin">Michelin</option>
                  <option value="BFGoodrich">BFGoodrich</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="familia" className="text-slate-200">
                  Familia *
                </Label>
                <Input
                  id="familia"
                  value={(formData as any).familia}
                  onChange={(e) => setFormData({ ...formData, familia: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Ej: Touring, Performance"
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
                {/* Common tyre sizes - sorted for easier selection */}
                <select
                  id="medida"
                  value={formData.medida}
                  onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border-slate-700 rounded text-white"
                >
                  <option value="">Seleccionar medida</option>
                  {[
                    "155/65R14",
                    "165/65R13",
                    "165/70R13",
                    "175/65R14",
                    "175/70R13",
                    "185/60R14",
                    "185/65R14",
                    "185/65R15",
                    "195/50R15",
                    "195/55R15",
                    "195/60R15",
                    "195/65R15",
                    "205/50R16",
                    "205/55R16",
                    "205/65R15",
                    "215/45R17",
                    "215/55R16",
                    "225/45R17",
                    "225/50R17",
                    "225/55R17",
                    "235/45R17",
                    "235/50R18",
                    "245/45R17",
                    "255/40R18",
                    "265/35R18",
                    "275/40R18",
                    "285/35R19",
                    "295/35R21"
                  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
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
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading || !isFormValid}
              >
                {loading ? "Guardando..." : producto ? "Actualizar Producto" : "Crear Producto"}
              </Button>
              {onModal ? (
                <DialogClose>
                  <Button type="button" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    Cancelar
                  </Button>
                </DialogClose>
              ) : (
                <Link href="/catalogo">
                  <Button type="button" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    Cancelar
                  </Button>
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
