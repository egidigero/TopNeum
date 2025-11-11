"use client"

import { useState, useEffect } from "react"
import type { ReactElement } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Phone, Car, CalendarDays, LayoutGrid } from "lucide-react"
import { TurnoDetailModal } from "./turno-detail-modal"

interface Turno {
  id: string
  nombre_cliente: string
  telefono: string
  email?: string
  tipo: "colocacion" | "retiro"
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  marca_vehiculo?: string
  modelo_vehiculo?: string
  patente?: string
  cantidad_neumaticos?: number
  observaciones?: string
  origen: string
  created_at: string
  producto?: {
    marca: string
    modelo: string
    medida: string
    diseno: string
    precio_unitario: number
    precio_final: number
  }
}

type ViewMode = "day" | "week" | "month"

export function TurnosCalendar({ userRole }: { userRole: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  useEffect(() => {
    fetchTurnos()
  }, [currentDate, viewMode])

  const fetchTurnos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/turnos`)
      const data = await res.json()
      
      console.log('📅 Turnos recibidos del servidor:', data.length)
      
      // Filtrar según el modo de vista
      const filtered = filterTurnosByView(data)
      
      console.log('📅 Turnos filtrados para vista:', filtered.length)
      setTurnos(filtered)
    } catch (error) {
      console.error("Error fetching turnos:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTurnosByView = (data: Turno[]) => {
    if (viewMode === "day") {
      const targetDate = currentDate.toISOString().split('T')[0]
      return data.filter((t: Turno) => t.fecha === targetDate)
    } else if (viewMode === "week") {
      const startOfWeek = getStartOfWeek(currentDate)
      const endOfWeek = getEndOfWeek(currentDate)
      return data.filter((t: Turno) => {
        const turnoDate = new Date(t.fecha + 'T00:00:00')
        const start = new Date(startOfWeek)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endOfWeek)
        end.setHours(23, 59, 59, 999)
        return turnoDate >= start && turnoDate <= end
      })
    } else {
      // month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      return data.filter((t: Turno) => {
        const turnoDate = new Date(t.fecha + 'T00:00:00')
        return turnoDate.getFullYear() === year && turnoDate.getMonth() === month
      })
    }
  }

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const getEndOfWeek = (date: Date) => {
    const start = getStartOfWeek(date)
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  }

  const prevPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(currentDate.getDate() - 1)
    } else if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() - 7)
    } else {
      newDate.setMonth(currentDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const nextPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(currentDate.getDate() + 1)
    } else if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + 7)
    } else {
      newDate.setMonth(currentDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getTurnosForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return turnos.filter(t => t.fecha === dateStr).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { color: string, label: string }> = {
      pendiente: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pendiente" },
      confirmado: { color: "bg-blue-100 text-blue-800 border-blue-300", label: "Confirmado" },
      en_proceso: { color: "bg-purple-100 text-purple-800 border-purple-300", label: "En Proceso" },
      completado: { color: "bg-green-100 text-green-800 border-green-300", label: "Completado" },
      cancelado: { color: "bg-red-100 text-red-800 border-red-300", label: "Cancelado" },
    }
    const variant = variants[estado] || variants.pendiente
    return <Badge className={`${variant.color} border text-xs`}>{variant.label}</Badge>
  }

  const handleTurnoClick = (turno: Turno) => {
    setSelectedTurno(turno)
    setDetailModalOpen(true)
  }

  const getPeriodLabel = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } else if (viewMode === "week") {
      const start = getStartOfWeek(currentDate)
      const end = getEndOfWeek(currentDate)
      return `${start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <div>
      {/* Header con navegación y controles */}
      <Card className="bg-white border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={prevPeriod} className="border-slate-300 hover:bg-slate-50" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" onClick={goToToday} className="border-slate-300 hover:bg-slate-50" size="sm">
              Hoy
            </Button>

            <Button variant="outline" onClick={nextPeriod} className="border-slate-300 hover:bg-slate-50" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center flex-1">
            <h2 className="text-xl font-semibold text-slate-900 capitalize">
              {getPeriodLabel()}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
              className={viewMode === "day" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300 hover:bg-slate-50"}
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Día
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              className={viewMode === "week" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300 hover:bg-slate-50"}
              size="sm"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Semana
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              className={viewMode === "month" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300 hover:bg-slate-50"}
              size="sm"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Mes
            </Button>
          </div>
        </div>
      </Card>

      {/* Mensaje de carga */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-slate-600">Cargando turnos...</p>
        </div>
      )}

      {/* Renderizar vista según modo */}
      {!loading && viewMode === "day" && <DayView currentDate={currentDate} turnos={getTurnosForDay(currentDate)} onTurnoClick={handleTurnoClick} getEstadoBadge={getEstadoBadge} />}
      {!loading && viewMode === "week" && <WeekView currentDate={currentDate} turnos={turnos} onTurnoClick={handleTurnoClick} getEstadoBadge={getEstadoBadge} getStartOfWeek={getStartOfWeek} getTurnosForDay={getTurnosForDay} />}
      {!loading && viewMode === "month" && <MonthView currentDate={currentDate} turnos={turnos} onTurnoClick={handleTurnoClick} getEstadoBadge={getEstadoBadge} getTurnosForDay={getTurnosForDay} />}

      {/* Modal de detalle */}
      {selectedTurno && (
        <TurnoDetailModal
          turno={selectedTurno}
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            fetchTurnos()
          }}
        />
      )}
    </div>
  )
}

// Vista de Día
function DayView({ 
  currentDate, 
  turnos, 
  onTurnoClick, 
  getEstadoBadge 
}: { 
  currentDate: Date
  turnos: Turno[]
  onTurnoClick: (turno: Turno) => void
  getEstadoBadge: (estado: string) => ReactElement
}) {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8 AM a 5 PM

  return (
    <Card className="bg-white border-slate-200 shadow-sm p-6">
      {turnos.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay turnos para este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {turnos.map((turno) => (
            <div
              key={turno.id}
              onClick={() => onTurnoClick(turno)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                turno.tipo === 'colocacion' 
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <span className="font-semibold text-lg text-slate-900">
                    {turno.hora_inicio.substring(0, 5)} - {turno.hora_fin.substring(0, 5)}
                  </span>
                </div>
                {getEstadoBadge(turno.estado)}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-900 font-medium">{turno.nombre_cliente}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-600">{turno.telefono}</span>
                </div>
                {turno.patente && (
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-600">{turno.patente}</span>
                  </div>
                )}
                <Badge 
                  variant="outline" 
                  className={`w-fit text-xs ${
                    turno.tipo === 'colocacion'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-green-600 text-green-700'
                  }`}
                >
                  {turno.tipo === 'colocacion' ? '🔧 Colocación' : '📦 Retiro'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Vista de Semana (tu vista original mejorada)
function WeekView({ 
  currentDate, 
  turnos, 
  onTurnoClick, 
  getEstadoBadge,
  getStartOfWeek,
  getTurnosForDay
}: any) {
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  const startOfWeek = getStartOfWeek(currentDate)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    return date
  })

  return (
    <div className="grid grid-cols-7 gap-4">
      {daysOfWeek.map((date, idx) => {
        const turnosDelDia = getTurnosForDay(date)
        const isToday = date.toDateString() === new Date().toDateString()
        
        return (
          <Card 
            key={idx} 
            className={`bg-white border-slate-200 shadow-sm p-4 min-h-[400px] ${
              isToday ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-center mb-4 pb-3 border-b border-slate-200">
              <div className="text-sm text-slate-600 mb-1">{weekDays[idx]}</div>
              <div className={`text-3xl font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                {date.getDate()}
              </div>
              {turnosDelDia.length > 0 && (
                <Badge className="mt-2 bg-slate-100 text-slate-700 text-xs">
                  {turnosDelDia.length} {turnosDelDia.length === 1 ? 'turno' : 'turnos'}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {turnosDelDia.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  Sin turnos
                </div>
              ) : (
                turnosDelDia.map((turno: Turno) => (
                  <div
                    key={turno.id}
                    onClick={() => onTurnoClick(turno)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      turno.tipo === 'colocacion' 
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                        : 'bg-green-50 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {turno.hora_inicio.substring(0, 5)}
                      </span>
                      {getEstadoBadge(turno.estado)}
                    </div>
                    
                    <div className="text-sm font-medium text-slate-900 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{turno.nombre_cliente}</span>
                    </div>
                    
                    {turno.patente && (
                      <div className="text-xs text-slate-600 flex items-center gap-1 mb-2">
                        <Car className="w-3 h-3" />
                        {turno.patente}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          turno.tipo === 'colocacion'
                            ? 'border-blue-600 text-blue-700'
                            : 'border-green-600 text-green-700'
                        }`}
                      >
                        {turno.tipo === 'colocacion' ? '🔧 Colocación' : '📦 Retiro'}
                      </Badge>
                      
                      {turno.producto && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] border-emerald-600 text-emerald-700 bg-emerald-50"
                          title={`${turno.producto.marca} ${turno.producto.modelo} - $${turno.producto.precio_final.toLocaleString('es-AR')}`}
                        >
                          🛒 Comprado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// Vista de Mes
function MonthView({ 
  currentDate, 
  turnos, 
  onTurnoClick,
  getEstadoBadge,
  getTurnosForDay
}: any) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Obtener el primer día del mes
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Ajustar para que la semana empiece en lunes
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  
  // Crear array de días
  const days = []
  const totalDays = lastDay.getDate()
  
  // Días vacíos al principio
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  
  // Días del mes
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i))
  }

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  return (
    <Card className="bg-white border-slate-200 shadow-sm p-6">
      {/* Headers de días */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-slate-700 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="aspect-square" />
          }

          const turnosDelDia = getTurnosForDay(date)
          const isToday = date.toDateString() === new Date().toDateString()

          return (
            <div
              key={idx}
              className={`aspect-square border rounded-lg p-2 ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              } transition-colors`}
            >
              <div className="flex flex-col h-full">
                <div className={`text-sm font-semibold mb-1 ${
                  isToday ? 'text-blue-600' : 'text-slate-900'
                }`}>
                  {date.getDate()}
                </div>
                
                {turnosDelDia.length > 0 && (
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {turnosDelDia.slice(0, 2).map((turno: Turno) => (
                      <div
                        key={turno.id}
                        onClick={() => onTurnoClick(turno)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate ${
                          turno.tipo === 'colocacion'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-green-200 text-green-800'
                        }`}
                        title={`${turno.hora_inicio.substring(0, 5)} - ${turno.nombre_cliente}`}
                      >
                        {turno.hora_inicio.substring(0, 5)} {turno.nombre_cliente.split(' ')[0]}
                      </div>
                    ))}
                    {turnosDelDia.length > 2 && (
                      <div className="text-[10px] text-slate-600 px-1.5">
                        +{turnosDelDia.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
