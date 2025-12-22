"use client"

import { Users, TrendingUp, DollarSign, CheckCircle, AlertCircle, Clock, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { subDays } from "date-fns"
import type { Lead } from "@/lib/types/lead"

interface LeadsStatsProps {
  leads: Lead[]
}

export function LeadsStats({ leads }: LeadsStatsProps) {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const fourteenDaysAgo = subDays(now, 14)

  // Separar leads de esta semana vs semana anterior
  const leadsThisWeek = leads.filter(l => new Date(l.created_at) >= sevenDaysAgo)
  const leadsPrevWeek = leads.filter(l => {
    const date = new Date(l.created_at)
    return date >= fourteenDaysAgo && date < sevenDaysAgo
  })

  // Contadores por estado
  const estadoCounts = {
    nuevo: leads.filter(l => l.estado === "nuevo").length,
    en_conversacion: leads.filter(l => l.estado === "en_conversacion").length,
    cotizado: leads.filter(l => l.estado === "cotizado").length,
    esperando_pago: leads.filter(l => l.estado === "esperando_pago").length,
    pago_informado: leads.filter(l => l.estado === "pago_informado").length,
  }

  const totalLeads = leads.length
  const leadsActivos = totalLeads - leads.filter(l => l.estado === "perdido").length

  // Comparación con semana anterior - Total Leads
  const totalThisWeek = leadsThisWeek.length
  const totalPrevWeek = leadsPrevWeek.length
  const totalDiff = totalThisWeek - totalPrevWeek
  const totalDiffPercent = totalPrevWeek > 0 ? ((totalDiff / totalPrevWeek) * 100).toFixed(1) : "0"

  // Calcular tasas de conversión
  const conversionEnConversacion = estadoCounts.nuevo > 0 
    ? ((estadoCounts.en_conversacion / estadoCounts.nuevo) * 100) 
    : 0

  const conversionCotizado = estadoCounts.en_conversacion > 0
    ? ((estadoCounts.cotizado / estadoCounts.en_conversacion) * 100)
    : 0

  const conversionPago = estadoCounts.cotizado > 0
    ? ((estadoCounts.esperando_pago / estadoCounts.cotizado) * 100)
    : 0

  const conversionFinal = estadoCounts.esperando_pago > 0
    ? ((estadoCounts.pago_informado / estadoCounts.esperando_pago) * 100)
    : 0

  // Valor total en pipeline
  const valorTotal = leads
    .filter(l => l.ultimo_total)
    .reduce((sum, l) => sum + (l.ultimo_total || 0), 0)

  // Comparación valor pipeline
  const valorThisWeek = leadsThisWeek
    .filter(l => l.ultimo_total)
    .reduce((sum, l) => sum + (l.ultimo_total || 0), 0)
  const valorPrevWeek = leadsPrevWeek
    .filter(l => l.ultimo_total)
    .reduce((sum, l) => sum + (l.ultimo_total || 0), 0)
  const valorDiff = valorThisWeek - valorPrevWeek
  const valorDiffPercent = valorPrevWeek > 0 ? ((valorDiff / valorPrevWeek) * 100).toFixed(1) : "0"

  // Leads activos (últimas 24hs)
  const leadsUltimas24h = leads.filter(l => {
    const lastActivity = new Date(l.ultima_interaccion || l.created_at)
    const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 24
  }).length

  // Comparación actividad
  const activosThisWeek = leadsThisWeek.filter(l => {
    const lastActivity = new Date(l.ultima_interaccion || l.created_at)
    const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 24
  }).length
  const activosPrevWeek = leadsPrevWeek.filter(l => {
    const lastActivity = new Date(l.ultima_interaccion || l.created_at)
    const createdDate = new Date(l.created_at)
    const hoursSinceCreation = (sevenDaysAgo.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
    return hoursSinceCreation <= 24
  }).length
  const activosDiff = activosThisWeek - activosPrevWeek
  const activosDiffPercent = activosPrevWeek > 0 ? ((activosDiff / activosPrevWeek) * 100).toFixed(1) : "0"

  // Leads calientes (actividad en últimas 72hs)
  const leadsCalientes = leads.filter(l => {
    const lastActivity = new Date(l.ultima_interaccion || l.created_at)
    const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 72
  }).length

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const renderTrend = (diff: number, percent: string) => {
    if (diff === 0) {
      return <span className="inline-flex items-center text-xs text-slate-500"><Minus className="h-3 w-3 mr-1" /> 0%</span>
    }
    if (diff > 0) {
      return <span className="inline-flex items-center text-xs text-green-600"><ArrowUp className="h-3 w-3 mr-1" /> {percent}%</span>
    }
    return <span className="inline-flex items-center text-xs text-red-600"><ArrowDown className="h-3 w-3 mr-1" /> {Math.abs(Number(percent))}%</span>
  }

  const stats = [
    {
      label: "Total Leads",
      value: totalLeads,
      subtext: `${leadsActivos} activos`,
      trend: renderTrend(totalDiff, totalDiffPercent),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Actividad 24hs",
      value: leadsUltimas24h,
      subtext: `${leadsCalientes} últimas 72hs`,
      trend: renderTrend(activosDiff, activosDiffPercent),
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Conversión Final",
      value: `${conversionFinal.toFixed(0)}%`,
      subtext: "Pago confirmado",
      trend: null,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Valor Pipeline",
      value: formatPrice(valorTotal),
      subtext: `${leads.filter(l => l.ultimo_total).length} pedidos`,
      trend: renderTrend(valorDiff, valorDiffPercent),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                {stat.trend && <div>{stat.trend}</div>}
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.subtext}</p>
            </div>
            <div className={`${stat.bg} p-2 rounded-lg`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
