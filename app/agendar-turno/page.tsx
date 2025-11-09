"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Calendar, Clock, User, Phone, Mail, Car, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AgendarTurnoPage() {
  const [tipo, setTipo] = useState<"colocacion" | "retiro" | null>(null)
  const [fecha, setFecha] = useState<Date | undefined>()
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
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

  const handleTipoSelect = (tipoSeleccionado: "colocacion" | "retiro") => {
    setTipo(tipoSeleccionado)
    setStep(2)
  }

  const handleFechaChange = async (selectedDate: Date | undefined) => {
    if (!selectedDate || !tipo) return
    
    setFecha(selectedDate)
    const fechaStr = selectedDate.toISOString().split('T')[0]

    setLoading(true)
    try {
      const res = await fetch(`/api/turnos/disponibles?fecha=${fechaStr}&tipo=${tipo}`)
      const data = await res.json()
      setSlots(data)
      if (data.length > 0) {
        setStep(3)
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los horarios", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setStep(4)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo || !fecha || !selectedSlot) return

    const fechaStr = fecha.toISOString().split('T')[0]

    setLoading(true)
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tipo,
          fecha: fechaStr,
          hora_inicio: selectedSlot.hora_inicio,
          hora_fin: selectedSlot.hora_fin,
          origen: "whatsapp",
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al agendar turno")
      }

      toast({ 
        title: "✅ Turno agendado", 
        description: "Te enviaremos una confirmación por WhatsApp" 
      })
      
      setStep(5)
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  
  const enUnMes = new Date()
  enUnMes.setDate(enUnMes.getDate() + 30)
  enUnMes.setHours(23, 59, 59, 999)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Agendar Turno</h1>
          <p className="text-slate-300">TopNeum - Colocación y Retiro de Neumáticos</p>
        </div>

        {/* Step 1: Seleccionar tipo */}
        {step >= 1 && (
          <Card className="bg-slate-900/80 border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
              ¿Qué necesitás?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={tipo === "colocacion" ? "default" : "outline"}
                className={`h-24 flex flex-col gap-2 ${
                  tipo === "colocacion" 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
                onClick={() => handleTipoSelect("colocacion")}
              >
                <Car className="w-6 h-6" />
                <span>Colocación</span>
                <span className="text-xs opacity-80">Lun-Vie 9-13 y 14-15:30</span>
              </Button>
              <Button
                variant={tipo === "retiro" ? "default" : "outline"}
                className={`h-24 flex flex-col gap-2 ${
                  tipo === "retiro" 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
                onClick={() => handleTipoSelect("retiro")}
              >
                <Calendar className="w-6 h-6" />
                <span>Retiro</span>
                <span className="text-xs opacity-80">Lun-Vie 9-13 y 14-17</span>
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Seleccionar fecha */}
        {step >= 2 && tipo && (
          <Card className="bg-slate-900/80 border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
              Seleccioná la fecha
            </h2>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={fecha}
                onSelect={handleFechaChange}
                disabled={(date) => {
                  // Deshabilitar fines de semana (0 = domingo, 6 = sábado)
                  const dia = date.getDay()
                  if (dia === 0 || dia === 6) return true
                  
                  // Deshabilitar fechas fuera del rango
                  return date < hoy || date > enUnMes
                }}
                className="rounded-md border border-slate-700 bg-slate-800"
                classNames={{
                  months: "text-white",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-700 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-700 hover:text-white rounded-md text-slate-300",
                  day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                  day_today: "bg-slate-700 text-white",
                  day_outside: "text-slate-600 opacity-50",
                  day_disabled: "text-slate-600 opacity-50 line-through",
                  day_range_middle: "aria-selected:bg-slate-700 aria-selected:text-white",
                  day_hidden: "invisible",
                }}
              />
            </div>
            {loading && (
              <p className="text-slate-400 text-center mt-4">Cargando horarios disponibles...</p>
            )}
          </Card>
        )}

        {/* Step 3: Seleccionar horario */}
        {step >= 3 && slots.length > 0 && (
          <Card className="bg-slate-900/80 border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
              Elegí el horario
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {slots.map((slot, idx) => (
                <Button
                  key={idx}
                  variant={selectedSlot?.hora_inicio === slot.hora_inicio ? "default" : "outline"}
                  disabled={!slot.disponible}
                  onClick={() => handleSlotSelect(slot)}
                  className={`${
                    selectedSlot?.hora_inicio === slot.hora_inicio
                      ? "bg-blue-600 hover:bg-blue-700"
                      : slot.disponible
                      ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                      : "opacity-30 cursor-not-allowed"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {slot.display}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Step 4: Completar datos */}
        {step >= 4 && selectedSlot && (
          <Card className="bg-slate-900/80 border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
              Tus datos
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300 flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" /> Nombre completo *
                </Label>
                <Input
                  required
                  value={formData.nombre_cliente}
                  onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <Label className="text-slate-300 flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" /> Teléfono *
                </Label>
                <Input
                  required
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="11 1234-5678"
                />
              </div>

              <div>
                <Label className="text-slate-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" /> Email (opcional)
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">Marca del vehículo</Label>
                  <Input
                    value={formData.marca_vehiculo}
                    onChange={(e) => setFormData({ ...formData, marca_vehiculo: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Ford"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">Modelo</Label>
                  <Input
                    value={formData.modelo_vehiculo}
                    onChange={(e) => setFormData({ ...formData, modelo_vehiculo: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Focus"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Patente</Label>
                <Input
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="ABC123"
                />
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Cantidad de neumáticos</Label>
                <select
                  value={formData.cantidad_neumaticos}
                  onChange={(e) => setFormData({ ...formData, cantidad_neumaticos: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5 (con auxilio)</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-300 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" /> Observaciones
                </Label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                  rows={3}
                  placeholder="Información adicional..."
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
              >
                {loading ? "Agendando..." : "Confirmar Turno"}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 5: Confirmación */}
        {step === 5 && fecha && (
          <Card className="bg-green-900/20 border-green-700 p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Turno Confirmado!</h2>
            <p className="text-slate-300 mb-4">
              Tu turno para <strong>{tipo}</strong> el día{" "}
              <strong>{fecha.toLocaleDateString("es-AR")}</strong> a las{" "}
              <strong>{selectedSlot?.display}</strong> fue agendado exitosamente.
            </p>
            <p className="text-slate-400 text-sm">
              Te enviaremos un mensaje de confirmación por WhatsApp al número {formData.telefono}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
