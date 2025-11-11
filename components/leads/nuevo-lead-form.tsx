"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Phone, MessageSquare, MapPin, Tag, AlertCircle, Sparkles } from "lucide-react"

interface NuevoLeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NuevoLeadForm({ open, onOpenChange, onSuccess }: NuevoLeadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    nombre_cliente: "",
    telefono_whatsapp: "",
    region: "CABA",
    origen: "manual",
    whatsapp_label: "",
    observaciones: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estado: "nuevo",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al crear lead")
        return
      }

      // Reset form
      setFormData({
        nombre_cliente: "",
        telefono_whatsapp: "",
        region: "CABA",
        origen: "manual",
        whatsapp_label: "",
        observaciones: "",
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-2 border-blue-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Nuevo Lead
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre_cliente" className="text-slate-700 flex items-center gap-2 font-medium">
              <User className="w-4 h-4 text-blue-600" />
              Nombre del Cliente *
            </Label>
            <Input
              id="nombre_cliente"
              value={formData.nombre_cliente}
              onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
              required
              className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
              placeholder="Juan Pérez"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono_whatsapp" className="text-slate-700 flex items-center gap-2 font-medium">
              <Phone className="w-4 h-4 text-green-600" />
              Teléfono WhatsApp *
            </Label>
            <Input
              id="telefono_whatsapp"
              type="tel"
              value={formData.telefono_whatsapp}
              onChange={(e) => setFormData({ ...formData, telefono_whatsapp: e.target.value })}
              required
              className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
              placeholder="+54 9 11 1234-5678"
            />
            <p className="text-xs text-slate-500">Incluir código de país y área</p>
          </div>

          {/* Región */}
          <div className="space-y-2">
            <Label htmlFor="region" className="text-slate-700 flex items-center gap-2 font-medium">
              <MapPin className="w-4 h-4 text-purple-600" />
              Región *
            </Label>
            <select
              id="region"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-slate-800 h-12 focus:border-blue-500 transition-colors"
              required
            >
              <option value="CABA">CABA</option>
              <option value="GBA Norte">GBA Norte</option>
              <option value="GBA Sur">GBA Sur</option>
              <option value="GBA Oeste">GBA Oeste</option>
              <option value="Interior">Interior</option>
            </select>
          </div>

          {/* Origen y WhatsApp Label en 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origen" className="text-slate-700 flex items-center gap-2 font-medium">
                <Tag className="w-4 h-4 text-orange-600" />
                Origen
              </Label>
              <select
                id="origen"
                value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-slate-800 h-12 focus:border-blue-500 transition-colors"
              >
                <option value="manual">Manual</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="web">Sitio Web</option>
                <option value="referido">Referido</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_label" className="text-slate-700 flex items-center gap-2 font-medium">
                <MessageSquare className="w-4 h-4 text-cyan-600" />
                Etiqueta WhatsApp
              </Label>
              <Input
                id="whatsapp_label"
                value={formData.whatsapp_label}
                onChange={(e) => setFormData({ ...formData, whatsapp_label: e.target.value })}
                className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                placeholder="Cliente nuevo"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-slate-700 flex items-center gap-2 font-medium">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="bg-blue-50 border-2 border-blue-200 text-slate-800 resize-none focus:border-blue-500 transition-colors"
              placeholder="Información adicional sobre el cliente..."
              rows={4}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold h-12 text-base shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear Lead
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 border-2 border-slate-300 text-slate-700 hover:bg-slate-100 h-12 text-base"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
