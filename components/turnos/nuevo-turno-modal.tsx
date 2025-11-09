"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function NuevoTurnoModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<"colocacion" | "retiro">("colocacion")
  const [fecha, setFecha] = useState("")
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    nombre_cliente: "",
    telefono: "",
    email: "",
    marca_vehiculo: "",
    modelo_vehiculo: "",
    patente: "",
    cantidad_neumaticos: "4",
    observaciones: "",
  })

  const { toast } = useToast()
  const router = useRouter()

  const handleFechaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fechaSeleccionada = e.target.value
    setFecha(fechaSeleccionada)
    
    setLoading(true)
    try {
      const res = await fetch(`/api/turnos/disponibles?fecha=${fechaSeleccionada}&tipo=${tipo}`)
      const data = await res.json()
      setSlots(data)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los horarios", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) {
      toast({ title: "Error", description: "Seleccioná un horario", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tipo,
          fecha,
          hora_inicio: selectedSlot.hora_inicio,
          hora_fin: selectedSlot.hora_fin,
          origen: "manual",
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear turno")
      }

      toast({ title: "✅ Turno creado", description: "El turno fue agendado exitosamente" })
      setOpen(false)
      router.refresh()
      
      // Reset form
      setFormData({
        nombre_cliente: "",
        telefono: "",
        email: "",
        marca_vehiculo: "",
        modelo_vehiculo: "",
        patente: "",
        cantidad_neumaticos: "4",
        observaciones: "",
      })
      setFecha("")
      setSlots([])
      setSelectedSlot(null)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const minFecha = new Date().toISOString().split('T')[0]

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />
        Nuevo Turno
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Agendar Nuevo Turno</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-700 mb-2 block">Tipo de servicio</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={tipo === "colocacion" ? "default" : "outline"}
                  onClick={() => {
                    setTipo("colocacion")
                    setFecha("")
                    setSlots([])
                    setSelectedSlot(null)
                  }}
                  className={tipo === "colocacion" ? "bg-blue-600" : "border-slate-300"}
                >
                  Colocación
                </Button>
                <Button
                  type="button"
                  variant={tipo === "retiro" ? "default" : "outline"}
                  onClick={() => {
                    setTipo("retiro")
                    setFecha("")
                    setSlots([])
                    setSelectedSlot(null)
                  }}
                  className={tipo === "retiro" ? "bg-blue-600" : "border-slate-300"}
                >
                  Retiro
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 mb-2 block">Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={handleFechaChange}
                min={minFecha}
                className="bg-white border-slate-300 text-slate-900"
                required
              />
            </div>

            {slots.length > 0 && (
              <div>
                <Label className="text-slate-700 mb-2 block">Horario disponible</Label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {slots.map((slot, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant={selectedSlot?.hora_inicio === slot.hora_inicio ? "default" : "outline"}
                      disabled={!slot.disponible}
                      onClick={() => setSelectedSlot(slot)}
                      className={`${
                        selectedSlot?.hora_inicio === slot.hora_inicio
                          ? "bg-blue-600"
                          : slot.disponible
                          ? "border-slate-300"
                          : "opacity-30"
                      }`}
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 mb-2 block">Nombre del cliente *</Label>
                <Input
                  required
                  value={formData.nombre_cliente}
                  onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 mb-2 block">Teléfono *</Label>
                <Input
                  required
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 mb-2 block">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-700 mb-2 block">Marca</Label>
                <Input
                  value={formData.marca_vehiculo}
                  onChange={(e) => setFormData({ ...formData, marca_vehiculo: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 mb-2 block">Modelo</Label>
                <Input
                  value={formData.modelo_vehiculo}
                  onChange={(e) => setFormData({ ...formData, modelo_vehiculo: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 mb-2 block">Patente</Label>
                <Input
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 mb-2 block">Observaciones</Label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 resize-none"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-300">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !selectedSlot} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Creando..." : "Crear Turno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
