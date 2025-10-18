"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"
import { PricingPreview } from "./pricing-preview"

interface TarifaFormProps {
  tarifa?: {
    id: string
    nombre: string
    vigente: boolean
    jitter_min: number
    jitter_max: number
    redondeo_lista_a: number
    iva: number
    redondeo_venta_a: number
    margen_online: number
    recargo_3: number
    recargo_6: number
    recargo_12: number
    desc_cash_caba: number
    desc_cash_interior: number
    margen_mayorista_cf: number
    margen_mayorista_sf: number
    vigente_desde: string | null
    vigente_hasta: string | null
  }
}

export function TarifaForm({ tarifa }: TarifaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [formData, setFormData] = useState({
    nombre: tarifa?.nombre || "",
    vigente: tarifa?.vigente ?? false,
    jitter_min: tarifa?.jitter_min ?? 1.8,
    jitter_max: tarifa?.jitter_max ?? 2.2,
    redondeo_lista_a: tarifa?.redondeo_lista_a ?? 1000,
    iva: tarifa?.iva ?? 0.21,
    redondeo_venta_a: tarifa?.redondeo_venta_a ?? 100,
    margen_online: tarifa?.margen_online ?? 0.25,
    recargo_3: tarifa?.recargo_3 ?? 0.0,
    recargo_6: tarifa?.recargo_6 ?? 0.06,
    recargo_12: tarifa?.recargo_12 ?? 0.18,
    desc_cash_caba: tarifa?.desc_cash_caba ?? 0.1,
    desc_cash_interior: tarifa?.desc_cash_interior ?? 0.12,
    margen_mayorista_cf: tarifa?.margen_mayorista_cf ?? 0.15,
    margen_mayorista_sf: tarifa?.margen_mayorista_sf ?? 0.12,
    vigente_desde: tarifa?.vigente_desde || new Date().toISOString().split("T")[0],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const url = tarifa ? `/api/tarifas/${tarifa.id}` : "/api/tarifas"
      const method = tarifa ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al guardar tarifa")
        return
      }

      router.push("/tarifas")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function handlePublicar() {
    if (!tarifa) return

    setLoading(true)
    try {
      const res = await fetch(`/api/tarifas/${tarifa.id}/publicar`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al publicar tarifa")
        return
      }

      router.push("/tarifas")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <Link href="/tarifas">
        <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a tarifas
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">{tarifa ? "Editar Tarifa" : "Nueva Tarifa"}</CardTitle>
              <CardDescription className="text-slate-400">
                Configura los márgenes, recargos y descuentos para el cálculo de precios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-slate-200">
                    Nombre de la Tarifa *
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Tarifa Base 2025"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Precio Lista (Jitter)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jitter_min" className="text-slate-200">
                        Jitter Mínimo
                      </Label>
                      <Input
                        id="jitter_min"
                        type="number"
                        step="0.01"
                        value={formData.jitter_min}
                        onChange={(e) => setFormData({ ...formData, jitter_min: Number.parseFloat(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jitter_max" className="text-slate-200">
                        Jitter Máximo
                      </Label>
                      <Input
                        id="jitter_max"
                        type="number"
                        step="0.01"
                        value={formData.jitter_max}
                        onChange={(e) => setFormData({ ...formData, jitter_max: Number.parseFloat(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Márgenes y Redondeos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="iva" className="text-slate-200">
                        IVA (%)
                      </Label>
                      <Input
                        id="iva"
                        type="number"
                        step="0.01"
                        value={formData.iva * 100}
                        onChange={(e) => setFormData({ ...formData, iva: Number.parseFloat(e.target.value) / 100 })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margen_online" className="text-slate-200">
                        Margen Online (%)
                      </Label>
                      <Input
                        id="margen_online"
                        type="number"
                        step="0.01"
                        value={formData.margen_online * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, margen_online: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Recargos por Cuotas (%)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recargo_3" className="text-slate-200">
                        3 Cuotas
                      </Label>
                      <Input
                        id="recargo_3"
                        type="number"
                        step="0.01"
                        value={formData.recargo_3 * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, recargo_3: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recargo_6" className="text-slate-200">
                        6 Cuotas
                      </Label>
                      <Input
                        id="recargo_6"
                        type="number"
                        step="0.01"
                        value={formData.recargo_6 * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, recargo_6: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recargo_12" className="text-slate-200">
                        12 Cuotas
                      </Label>
                      <Input
                        id="recargo_12"
                        type="number"
                        step="0.01"
                        value={formData.recargo_12 * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, recargo_12: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Descuentos Efectivo (%)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desc_cash_caba" className="text-slate-200">
                        CABA
                      </Label>
                      <Input
                        id="desc_cash_caba"
                        type="number"
                        step="0.01"
                        value={formData.desc_cash_caba * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, desc_cash_caba: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc_cash_interior" className="text-slate-200">
                        Interior
                      </Label>
                      <Input
                        id="desc_cash_interior"
                        type="number"
                        step="0.01"
                        value={formData.desc_cash_interior * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, desc_cash_interior: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Márgenes Mayorista (%)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="margen_mayorista_cf" className="text-slate-200">
                        Con Factura
                      </Label>
                      <Input
                        id="margen_mayorista_cf"
                        type="number"
                        step="0.01"
                        value={formData.margen_mayorista_cf * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, margen_mayorista_cf: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margen_mayorista_sf" className="text-slate-200">
                        Sin Factura
                      </Label>
                      <Input
                        id="margen_mayorista_sf"
                        type="number"
                        step="0.01"
                        value={formData.margen_mayorista_sf * 100}
                        onChange={(e) =>
                          setFormData({ ...formData, margen_mayorista_sf: Number.parseFloat(e.target.value) / 100 })
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? "Guardando..." : tarifa ? "Actualizar Tarifa" : "Crear Tarifa"}
                  </Button>

                  {tarifa && !tarifa.vigente && (
                    <Button
                      type="button"
                      onClick={handlePublicar}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      Publicar como Vigente
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="border-slate-700 text-slate-300 bg-transparent"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? "Ocultar" : "Ver"} Preview
                  </Button>

                  <Link href="/tarifas">
                    <Button type="button" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">{showPreview && <PricingPreview tarifa={formData} />}</div>
      </div>
    </div>
  )
}
