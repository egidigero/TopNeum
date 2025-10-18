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

export function NuevoLeadForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    canal: "whatsapp",
    mensaje_inicial: "",
    origen: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al crear lead")
        return
      }

      router.push("/leads")
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/leads">
        <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a leads
        </Button>
      </Link>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Información del Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-slate-200">
                Nombre *
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Juan Pérez"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-slate-200">
                Teléfono *
              </Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="+5491123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="canal" className="text-slate-200">
                Canal *
              </Label>
              <select
                id="canal"
                value={formData.canal}
                onChange={(e) => setFormData({ ...formData, canal: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origen" className="text-slate-200">
                Origen
              </Label>
              <Input
                id="origen"
                value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Instagram Ad, Referido, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensaje_inicial" className="text-slate-200">
                Mensaje Inicial
              </Label>
              <Textarea
                id="mensaje_inicial"
                value={formData.mensaje_inicial}
                onChange={(e) => setFormData({ ...formData, mensaje_inicial: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Primer mensaje del cliente..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? "Creando..." : "Crear Lead"}
              </Button>
              <Link href="/leads">
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
