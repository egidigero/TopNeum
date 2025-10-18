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
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface NuevoGastoFormProps {
  userId: string
}

export function NuevoGastoForm({ userId }: NuevoGastoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    categoria: "",
    descripcion: "",
    monto: 0,
    medio_pago: "",
    comprobante_url: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          creado_por: userId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al crear gasto")
        return
      }

      router.push("/gastos")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/gastos">
        <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a gastos
        </Button>
      </Link>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Información del Gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-slate-200">
                  Fecha *
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto" className="text-slate-200">
                  Monto *
                </Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: Number.parseFloat(e.target.value) })}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria" className="text-slate-200">
                Categoría *
              </Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ej: Alquiler, Servicios, Sueldos, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-slate-200">
                Descripción *
              </Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medio_pago" className="text-slate-200">
                Medio de Pago
              </Label>
              <Input
                id="medio_pago"
                value={formData.medio_pago}
                onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Efectivo, Transferencia, Tarjeta, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprobante_url" className="text-slate-200">
                URL del Comprobante
              </Label>
              <Input
                id="comprobante_url"
                type="url"
                value={formData.comprobante_url}
                onChange={(e) => setFormData({ ...formData, comprobante_url: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Gasto"}
              </Button>
              <Link href="/gastos">
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
