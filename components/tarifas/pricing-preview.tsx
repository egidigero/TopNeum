"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

interface PricingPreviewProps {
  tarifa: {
    jitter_min: number
    jitter_max: number
    iva: number
    margen_online: number
    recargo_3: number
    recargo_6: number
    recargo_12: number
    desc_cash_caba: number
    desc_cash_interior: number
    margen_mayorista_cf: number
    margen_mayorista_sf: number
  }
}

interface PreviewProduct {
  codigo: string
  marca: string
  costo: number
  precio_lista: number
  precio_online: number
  precio_3c: number
  precio_6c: number
  precio_12c: number
  efectivo_caba: number
  efectivo_interior: number
  mayorista_cf: number
  mayorista_sf: number
}

export function PricingPreview({ tarifa }: PricingPreviewProps) {
  const [products, setProducts] = useState<PreviewProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPreview() {
      setLoading(true)
      try {
        const res = await fetch("/api/tarifas/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tarifa),
        })

        if (res.ok) {
          const data = await res.json()
          setProducts(data.products)
        }
      } catch (err) {
        console.error("[v0] Preview error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [tarifa])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <Card className="bg-slate-900 border-slate-800 sticky top-8">
      <CardHeader>
        <CardTitle className="text-white text-lg">Preview de Precios</CardTitle>
        <p className="text-sm text-slate-400">Impacto en productos de muestra</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.codigo} className="border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="font-medium text-white text-sm">{product.marca}</div>
                <div className="text-xs text-slate-400">{product.codigo}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Costo:</span>
                    <span className="font-medium">{formatPrice(product.costo)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Lista:</span>
                    <span>{formatPrice(product.precio_lista)}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Online:</span>
                    <span className="font-medium">{formatPrice(product.precio_online)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>3 cuotas:</span>
                    <span>{formatPrice(product.precio_3c)}</span>
                  </div>
                  <div className="flex justify-between text-blue-300">
                    <span>Efectivo CABA:</span>
                    <span>{formatPrice(product.efectivo_caba)}</span>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>Mayorista C/F:</span>
                    <span>{formatPrice(product.mayorista_cf)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
