"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Calendar, Clock, User, Phone, Mail, Car, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

export default function AgendarTurnoPage() {
  const [hasCode, setHasCode] = useState<boolean | null>(true) // Siempre requiere codigo
  const [codigo, setCodigo] = useState("")
  const [leadData, setLeadData] = useState<any>(null)
  const [tipo, setTipo] = useState<"colocacion" | "retiro" | "envio" | null>(null)
  const [fecha, setFecha] = useState<Date | undefined>()
  const [slots, setSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(0) // 0 = código, 1 = tipo, 2 = fecha, etc
  
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

  // Datos de envío (solo si tipo === "envio")
  const [datosEnvio, setDatosEnvio] = useState({
    nombre_destinatario: "",
    dni: "",
    calle: "",
    altura: "",
    localidad: "",
    provincia: "",
    cp: "",
    telefono: "",
    mail: "",
  })

  const { toast } = useToast()

  const handleVerificarCodigo = async () => {
    setLoading(true)
    setError("")
    
    try {
      const res = await fetch(`/api/leads/por-codigo?codigo=${codigo}`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || "Código no encontrado")
        setLoading(false)
        return
      }

      if (data.turno_existente) {
        setError(`Ya tenés un turno agendado para el ${data.turno_existente.fecha} a las ${data.turno_existente.hora_inicio}`)
        setLoading(false)
        return
      }

      // Autocompletar datos del lead
      setLeadData(data)
      setFormData({
        nombre_cliente: data.lead.nombre_cliente || "",
        telefono: data.lead.telefono_whatsapp || "",
        email: data.lead.email || "",
        marca_vehiculo: "",
        modelo_vehiculo: "",
        patente: "",
        cantidad_neumaticos: data.pedido?.cantidad_total?.toString() || "4",
        observaciones: "",
      })
      
      toast({ 
        title: "✓ Código verificado", 
        description: `Hola ${data.lead.nombre_cliente}! Ahora podés agendar tu turno.` 
      })
      
      setStep(1)
    } catch (err: any) {
      setError("Error al buscar el código")
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async (selectedDate: Date) => {
    if (!selectedDate || !tipo) return
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Para envío, no se necesita fecha ni slot
    if (tipo !== "envio" && (!fecha || !selectedSlot)) return
    if (!tipo) return

    const fechaStr = tipo === "envio" ? null : fecha?.toISOString().split('T')[0]

    setLoading(true)
    try {
      // Si tiene código, usar endpoint especial
      if (leadData && codigo) {
        const payload: any = {
          codigo: codigo,
          tipo,
        }

        // Solo agregar fecha/hora si NO es envío
        if (tipo !== "envio") {
          payload.fecha = fechaStr
          payload.hora_inicio = selectedSlot.hora_inicio
          payload.hora_fin = selectedSlot.hora_fin
        }

        // Si es envío, agregar datos_envio
        if (tipo === "envio") {
          payload.datos_envio = datosEnvio
        }

        const res = await fetch("/api/turnos/agendar-con-codigo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || "Error al agendar")
        }
      } else {
        // Sin código, usar endpoint normal
        const payload: any = {
          ...formData,
          tipo,
          origen: "web",
        }

        if (tipo !== "envio") {
          payload.fecha = fechaStr
          payload.hora_inicio = selectedSlot.hora_inicio
          payload.hora_fin = selectedSlot.hora_fin
        }

        if (tipo === "envio") {
          payload.datos_envio = datosEnvio
        }

        const res = await fetch("/api/turnos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || "Error al agendar")
        }
      }

      toast({ 
        title: tipo === "envio" ? "✅ Envío coordinado" : "✅ Turno agendado", 
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header con Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/images/image.png" 
              alt="TopNeum" 
              width={240} 
              height={80}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
            Agendá tu Turno
          </h1>
          <p className="text-slate-600 text-lg">Colocación y Retiro de Neumáticos</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Stock 2025/2024
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              5 años de garantía
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-2 shadow-md">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step 0: Ingresá tu código */}
        {!leadData && (
          <Card className="bg-white border-2 border-blue-100 p-8 mb-6 shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center flex items-center justify-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl w-12 h-12 flex items-center justify-center text-xl font-bold shadow-lg">1</span>
              Ingresá tu código de confirmación
            </h2>
            <p className="text-slate-600 text-center mb-6">
              Te enviamos un código de 6 dígitos por WhatsApp cuando hiciste tu pedido
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <Input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-4xl font-bold tracking-widest bg-blue-50 border-2 border-blue-200 text-slate-800 h-20 uppercase focus:border-blue-500 transition-colors"
              />
              <p className="text-center text-sm text-slate-500">
                {codigo.length}/6 caracteres
              </p>
              <Button
                onClick={handleVerificarCodigo}
                disabled={codigo.length !== 6 || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-6 text-lg shadow-lg disabled:opacity-50 transition-all duration-200 border-0"
              >
                {loading ? "Verificando..." : "Verificar Código"}
              </Button>
            </div>

            {leadData && (
              <div className="mt-6 p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-emerald-700 font-semibold text-lg mb-2">✓ Código verificado</p>
                    <p className="text-slate-700">
                      Hola <strong className="text-slate-900">{leadData.nombre_cliente}</strong>
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      {leadData.telefono_whatsapp}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Step 1: Seleccionar tipo de servicio */}
        {step >= 1 && !tipo && (
          <Card className="bg-white border-2 border-blue-100 p-6 mb-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold shadow-lg">2</span>
              ¿Qué necesitás?
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Button
                onClick={() => {
                  setTipo("colocacion")
                  setStep(2)
                }}
                className="h-32 text-lg font-semibold bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg transition-all duration-200 hover:scale-105 border-0"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">🔧</div>
                  <span>Colocación</span>
                </div>
              </Button>
              <Button
                onClick={() => {
                  setTipo("retiro")
                  setStep(2)
                }}
                className="h-32 text-lg font-semibold bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-800 shadow-lg transition-all duration-200 hover:scale-105"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">📦</div>
                  <span>Retiro</span>
                </div>
              </Button>
              <Button
                onClick={() => {
                  setTipo("envio")
                  // Para envío, saltamos fecha y horario, vamos directo a datos
                  setStep(4)
                }}
                className="h-32 text-lg font-semibold bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all duration-200 hover:scale-105 border-0"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">🚚</div>
                  <span>Envío</span>
                </div>
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Seleccionar fecha (NO para envío) */}
        {step >= 2 && tipo && tipo !== "envio" && !fecha && (
          <Card className="bg-white border-2 border-blue-100 p-6 mb-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold shadow-lg">3</span>
              Elegí la fecha
            </h2>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={fecha}
                onSelect={(date) => {
                  setFecha(date)
                  if (date) fetchSlots(date)
                }}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                className="rounded-xl border-2 border-blue-100 bg-blue-50 p-4 shadow-md"
                classNames={{
                  months: "space-y-4",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-slate-800 font-semibold",
                  caption_label: "text-lg font-bold",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-9 w-9 bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-between",
                  head_cell: "text-slate-600 rounded-md w-12 font-semibold text-sm",
                  row: "flex w-full mt-2 justify-between",
                  cell: "relative p-0 text-center focus-within:relative focus-within:z-20",
                  day: "h-12 w-12 p-0 font-normal hover:bg-blue-100 rounded-lg transition-colors text-slate-700",
                  day_selected: "bg-gradient-to-br from-blue-600 to-cyan-600 text-white hover:bg-blue-700 font-bold shadow-lg scale-105",
                  day_today: "bg-blue-100 text-blue-700 font-bold border-2 border-blue-300",
                  day_outside: "text-slate-400 opacity-50",
                  day_disabled: "text-slate-300 opacity-30 cursor-not-allowed",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </Card>
        )}

        {/* Step 3: Seleccionar horario (NO para envío) */}
        {step >= 3 && tipo !== "envio" && fecha && !selectedSlot && (
          <Card className="bg-white border-2 border-blue-100 p-6 mb-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold shadow-lg">4</span>
              Seleccioná el horario
            </h2>
            {loading ? (
              <div className="text-center py-8 text-slate-600">Cargando horarios disponibles...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-slate-600">No hay horarios disponibles para esta fecha</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <Button
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlot(slot)
                      setStep(4)
                    }}
                    disabled={!slot.disponible}
                    className={`h-16 text-base font-semibold transition-all duration-200 border-0 ${
                      slot.disponible
                        ? "bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:scale-105"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200 opacity-40"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="w-5 h-5" />
                      <span>{slot.display}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 4: Completar datos - ENVÍO */}
        {step >= 4 && tipo === "envio" && (
          <Card className="bg-white border-2 border-purple-100 p-6 mb-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold shadow-lg">3</span>
              Datos de envío
            </h2>
            {/* Mostrar resumen del pedido si existe */}
            {leadData?.pedido && (
              <div className="mb-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 shadow-md">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-600" />
                  Productos de tu pedido
                </h3>
                <div className="space-y-2 mb-4">
                  {leadData.pedido.items && leadData.pedido.items.length > 0 ? (
                    leadData.pedido.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-purple-100">
                        <div className="font-medium text-slate-800">
                          {item.marca} {item.modelo} - {item.medida}
                        </div>
                        <div className="text-sm text-slate-600">
                          Cantidad: {item.cantidad} {item.cantidad === 1 ? 'neumático' : 'neumáticos'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-purple-100">
                      {leadData.pedido.producto_descripcion || "Sin detalles de producto"}
                    </div>
                  )}
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">¿Este no es tu pedido?</span> Escribinos por WhatsApp al <a href="https://wa.me/5491131849695" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">+54 9 11 3184-9695</a> y te ayudamos.
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Nombre del destinatario *</Label>
                  <Input
                    required
                    value={datosEnvio.nombre_destinatario}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, nombre_destinatario: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">DNI *</Label>
                  <Input
                    required
                    value={datosEnvio.dni}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, dni: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label className="text-slate-700 mb-2 block font-medium">Calle *</Label>
                  <Input
                    required
                    value={datosEnvio.calle}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, calle: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="Av. Libertador"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Altura *</Label>
                  <Input
                    required
                    value={datosEnvio.altura}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, altura: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Localidad *</Label>
                  <Input
                    required
                    value={datosEnvio.localidad}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, localidad: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="Vicente López"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Provincia *</Label>
                  <Input
                    required
                    value={datosEnvio.provincia}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, provincia: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="Buenos Aires"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 mb-2 block font-medium">Código Postal *</Label>
                <Input
                  required
                  value={datosEnvio.cp}
                  onChange={(e) => setDatosEnvio({ ...datosEnvio, cp: e.target.value })}
                  className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                  placeholder="1638"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    <Phone className="w-4 h-4" /> Teléfono *
                  </Label>
                  <Input
                    required
                    type="tel"
                    value={datosEnvio.telefono}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, telefono: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="11 1234-5678"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    <Mail className="w-4 h-4" /> Email *
                  </Label>
                  <Input
                    required
                    type="email"
                    value={datosEnvio.mail}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, mail: e.target.value })}
                    className="bg-purple-50 border-2 border-purple-200 text-slate-800 h-12 focus:border-purple-500"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all duration-200 border-0"
              >
                {loading ? "Procesando..." : "Confirmar Envío 🚚"}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 4: Completar datos - COLOCACION/RETIRO */}
        {step >= 4 && tipo !== "envio" && selectedSlot && (
          <Card className="bg-white border-2 border-blue-100 p-6 mb-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold shadow-lg">5</span>
              Completá tus datos
            </h2>

            {/* Mostrar resumen del pedido si existe */}
            {leadData?.pedido && (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 shadow-md">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  Productos de tu pedido
                </h3>
                <div className="space-y-2 mb-4">
                  {leadData.pedido.items && leadData.pedido.items.length > 0 ? (
                    leadData.pedido.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="font-medium text-slate-800">
                          {item.marca} {item.modelo} - {item.medida}
                        </div>
                        <div className="text-sm text-slate-600">
                          Cantidad: {item.cantidad} {item.cantidad === 1 ? 'neumático' : 'neumáticos'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-blue-100">
                      {leadData.pedido.producto_descripcion || "Sin detalles de producto"}
                    </div>
                  )}
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">¿Este no es tu pedido?</span> Escribinos por WhatsApp al <a href="https://wa.me/5491131849695" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">+54 9 11 3184-9695</a> y te ayudamos.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                  <User className="w-4 h-4" /> Nombre completo *
                </Label>
                <Input
                  required
                  value={formData.nombre_cliente}
                  onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                  className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                  <Phone className="w-4 h-4" /> Teléfono *
                </Label>
                <Input
                  required
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                  placeholder="11 1234-5678"
                />
              </div>

              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                  <Mail className="w-4 h-4" /> Email (opcional)
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Marca del vehículo</Label>
                  <Input
                    value={formData.marca_vehiculo}
                    onChange={(e) => setFormData({ ...formData, marca_vehiculo: e.target.value })}
                    className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                    placeholder="Ford"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-2 block font-medium">Modelo</Label>
                  <Input
                    value={formData.modelo_vehiculo}
                    onChange={(e) => setFormData({ ...formData, modelo_vehiculo: e.target.value })}
                    className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors"
                    placeholder="Focus"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 mb-2 block font-medium">Patente</Label>
                <Input
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value.toUpperCase()})}
                  className="bg-blue-50 border-2 border-blue-200 text-slate-800 h-12 focus:border-blue-500 transition-colors uppercase"
                  placeholder="ABC123"
                  maxLength={7}
                />
              </div>

              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                  <MessageSquare className="w-4 h-4" /> Observaciones
                </Label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-slate-800 resize-none focus:border-blue-500 transition-colors"
                  rows={3}
                  placeholder="Información adicional que quieras agregar..."
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-6 text-lg shadow-lg transition-all duration-200 disabled:opacity-50 border-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Agendando turno...
                  </span>
                ) : (
                  "✓ Confirmar Turno"
                )}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 5: Confirmación */}
        {step === 5 && fecha && (
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-8 text-center shadow-xl">
            <div className="mb-6">
              <div className="inline-block bg-gradient-to-br from-emerald-500 to-green-500 rounded-full p-6 shadow-lg">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-4">
              ¡Turno Confirmado!
            </h2>
            
            <div className="bg-white rounded-xl p-6 mb-6 border-2 border-blue-100 shadow-md">
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Servicio</p>
                    <p className="text-slate-800 font-semibold capitalize">{tipo}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="text-slate-800 font-semibold">{fecha.toLocaleDateString("es-AR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-100 rounded-lg p-2">
                    <Clock className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Horario</p>
                    <p className="text-slate-800 font-semibold">{selectedSlot?.display}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <p className="text-slate-700 text-sm flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Te enviaremos un mensaje de confirmación por WhatsApp al <strong className="text-slate-900">{formData.telefono}</strong>
              </p>
            </div>

            <Button 
              onClick={() => window.location.href = '/'}
              className="mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-8 py-3 shadow-lg border-0"
            >
              Volver al Inicio
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
