"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface EditProductoModalProps {
  productoId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MARCAS = ["Yokohama", "Hankook", "LingLong", "Laufenn", "Nankang", "Michelin", "BFGoodrich"]

const MEDIDAS_COMUNES = [
  "145/70R13", "155/70R13", "165/70R13", "175/70R13", "185/70R13",
  "155/65R14", "165/60R14", "165/65R14", "175/65R14", "175/70R14", "185/60R14", "185/65R14", "185/70R14",
  "175/65R15", "185/60R15", "185/65R15", "195/55R15", "195/60R15", "195/65R15", "205/60R15", "205/65R15",
  "185/55R16", "195/55R16", "205/55R16", "205/60R16", "215/55R16", "215/60R16", "225/55R16",
  "205/45R17", "205/50R17", "215/45R17", "215/50R17", "215/55R17", "225/45R17", "225/50R17", "225/55R17",
  "225/40R18", "225/45R18", "235/40R18", "235/45R18", "245/40R18", "245/45R18",
].sort()

export function EditProductoModal({ productoId, open, onOpenChange }: EditProductoModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    sku: "",
    marca: "",
    familia: "",
    diseno: "",
    medida: "",
    costo: "",
    cuota_3: "",
    cuota_6: "",
    cuota_12: "",
    efectivo_bsas_sin_iva: "",
    efectivo_int_sin_iva: "",
    mayorista_fact: "",
    mayorista_sin_fact: "",
    stock: "",
  })

  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    if (open && productoId) {
      setLoadingData(true)
      fetch(`/api/productos/${productoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.producto) {
            const p = data.producto
            setFormData({
              sku: p.sku || p.codigo || "",
              marca: p.marca || "",
              familia: p.familia || "",
              diseno: p.diseno || p.diseno_linea || "",
              medida: p.medida || "",
              costo: p.costo ? String(p.costo) : "",
              cuota_3: p.cuota_3 ? String(p.cuota_3) : "",
              cuota_6: p.cuota_6 ? String(p.cuota_6) : "",
              cuota_12: p.cuota_12 ? String(p.cuota_12) : "",
              efectivo_bsas_sin_iva: p.efectivo_bsas_sin_iva ? String(p.efectivo_bsas_sin_iva) : "",
              efectivo_int_sin_iva: p.efectivo_int_sin_iva ? String(p.efectivo_int_sin_iva) : "",
              mayorista_fact: p.mayorista_fact ? String(p.mayorista_fact) : "",
              mayorista_sin_fact: p.mayorista_sin_fact ? String(p.mayorista_sin_fact) : "",
              stock: p.stock || "",
            })
          }
        })
        .catch(err => {
          toast({
            title: "Error",
            description: "No se pudo cargar el producto",
            variant: "destructive",
          })
        })
        .finally(() => {
          setLoadingData(false)
        })
    }
  }, [open, productoId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/productos/${productoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku,
          marca: formData.marca,
          familia: formData.familia,
          diseno: formData.diseno,
          medida: formData.medida,
          costo: formData.costo ? parseFloat(formData.costo) : null,
          cuota_3: formData.cuota_3 ? parseFloat(formData.cuota_3) : null,
          cuota_6: formData.cuota_6 ? parseFloat(formData.cuota_6) : null,
          cuota_12: formData.cuota_12 ? parseFloat(formData.cuota_12) : null,
          efectivo_bsas_sin_iva: formData.efectivo_bsas_sin_iva ? parseFloat(formData.efectivo_bsas_sin_iva) : null,
          efectivo_int_sin_iva: formData.efectivo_int_sin_iva ? parseFloat(formData.efectivo_int_sin_iva) : null,
          mayorista_fact: formData.mayorista_fact ? parseFloat(formData.mayorista_fact) : null,
          mayorista_sin_fact: formData.mayorista_sin_fact ? parseFloat(formData.mayorista_sin_fact) : null,
          stock: formData.stock,
          descripcion_larga: `${formData.medida} ${formData.diseno} ${formData.marca}`.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al actualizar")
      }

      toast({
        title: "✅ Producto actualizado",
        description: `${formData.sku} se actualizó correctamente`,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el producto",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {/* Columna 1 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="marca">Marca *</Label>
                  <select
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => handleChange("marca", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  >
                    <option value="">Seleccionar marca</option>
                    {MARCAS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="familia">Familia *</Label>
                  <Input
                    id="familia"
                    value={formData.familia}
                    onChange={(e) => handleChange("familia", e.target.value)}
                    placeholder="Ej: Neumaticos"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="diseno">Diseño</Label>
                  <Input
                    id="diseno"
                    value={formData.diseno}
                    onChange={(e) => handleChange("diseno", e.target.value)}
                    placeholder="Ej: ES32, ADVAN, A050"
                  />
                </div>

                <div>
                  <Label htmlFor="medida">Medida *</Label>
                  <select
                    id="medida"
                    value={formData.medida}
                    onChange={(e) => handleChange("medida", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  >
                    <option value="">Seleccionar medida</option>
                    {MEDIDAS_COMUNES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    value={formData.stock}
                    onChange={(e) => handleChange("stock", e.target.value)}
                    placeholder="Número, 'OK', o vacío"
                  />
                </div>
              </div>

              {/* Columna 2 - Precios */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="costo">Costo *</Label>
                  <Input
                    id="costo"
                    type="number"
                    step="0.01"
                    value={formData.costo}
                    onChange={(e) => handleChange("costo", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cuota_3">3 Cuotas</Label>
                  <Input
                    id="cuota_3"
                    type="number"
                    step="0.01"
                    value={formData.cuota_3}
                    onChange={(e) => handleChange("cuota_3", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cuota_6">6 Cuotas</Label>
                  <Input
                    id="cuota_6"
                    type="number"
                    step="0.01"
                    value={formData.cuota_6}
                    onChange={(e) => handleChange("cuota_6", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cuota_12">12 Cuotas</Label>
                  <Input
                    id="cuota_12"
                    type="number"
                    step="0.01"
                    value={formData.cuota_12}
                    onChange={(e) => handleChange("cuota_12", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="efectivo_bsas_sin_iva">Efectivo BSAS</Label>
                  <Input
                    id="efectivo_bsas_sin_iva"
                    type="number"
                    step="0.01"
                    value={formData.efectivo_bsas_sin_iva}
                    onChange={(e) => handleChange("efectivo_bsas_sin_iva", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="efectivo_int_sin_iva">Efectivo Interior</Label>
                  <Input
                    id="efectivo_int_sin_iva"
                    type="number"
                    step="0.01"
                    value={formData.efectivo_int_sin_iva}
                    onChange={(e) => handleChange("efectivo_int_sin_iva", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="mayorista_fact">Mayorista c/Fact</Label>
                  <Input
                    id="mayorista_fact"
                    type="number"
                    step="0.01"
                    value={formData.mayorista_fact}
                    onChange={(e) => handleChange("mayorista_fact", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="mayorista_sin_fact">Mayorista s/Fact</Label>
                  <Input
                    id="mayorista_sin_fact"
                    type="number"
                    step="0.01"
                    value={formData.mayorista_sin_fact}
                    onChange={(e) => handleChange("mayorista_sin_fact", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
