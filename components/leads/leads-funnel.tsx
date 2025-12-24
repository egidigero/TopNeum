"use client"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Lead } from "@/lib/types/lead"

interface LeadsFunnelProps {
  leads: Lead[]
}

interface FunnelStage {
  name: string
  label: string
  color: string
  bgColor: string
  count: number
  percentage: number
  conversionRate?: number
}

export function LeadsFunnel({ leads }: LeadsFunnelProps) {
  const totalLeads = leads.length

  // LÓGICA DE EMBUDO: cada etapa incluye a los que llegaron a esa etapa o más allá
  // Orden de progresión: nuevo -> en_conversacion -> cotizado -> esperando_pago -> pago_informado -> pedido_confirmado
  
  const estadosProgresivos = ["nuevo", "en_conversacion", "cotizado", "esperando_pago", "pago_informado", "pedido_confirmado"]
  
  // Total de leads (100%)
  const total = totalLeads
  
  // Leads que entraron en conversación (excluyendo los que se quedaron en "nuevo")
  const enConversacion = leads.filter(l => 
    ["en_conversacion", "cotizado", "esperando_pago", "pago_informado", "pedido_confirmado"].includes(l.estado)
  ).length
  
  // Leads que fueron cotizados
  const cotizado = leads.filter(l => 
    ["cotizado", "esperando_pago", "pago_informado", "pedido_confirmado"].includes(l.estado)
  ).length
  
  // Leads que esperaron pago
  const esperandoPago = leads.filter(l => 
    ["esperando_pago", "pago_informado", "pedido_confirmado"].includes(l.estado)
  ).length
  
  // Leads con pago confirmado
  const pagoConfirmado = leads.filter(l => 
    ["pago_informado", "pedido_confirmado"].includes(l.estado)
  ).length

  const stages: FunnelStage[] = [
    {
      name: "total",
      label: "📊 Total Leads",
      color: "text-slate-700",
      bgColor: "bg-slate-100",
      count: total,
      percentage: 100,
    },
    {
      name: "en_conversacion",
      label: "💬 Entraron en Conversación",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      count: enConversacion,
      percentage: total > 0 ? (enConversacion / total) * 100 : 0,
      conversionRate: total > 0 ? (enConversacion / total) * 100 : 0,
    },
    {
      name: "cotizado",
      label: "📋 Cotizados",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      count: cotizado,
      percentage: total > 0 ? (cotizado / total) * 100 : 0,
      conversionRate: enConversacion > 0 ? (cotizado / enConversacion) * 100 : 0,
    },
    {
      name: "esperando_pago",
      label: "⏳ Esperando Pago",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      count: esperandoPago,
      percentage: total > 0 ? (esperandoPago / total) * 100 : 0,
      conversionRate: cotizado > 0 ? (esperandoPago / cotizado) * 100 : 0,
    },
    {
      name: "pago_confirmado",
      label: "✅ Pago Confirmado",
      color: "text-green-600",
      bgColor: "bg-green-100",
      count: pagoConfirmado,
      percentage: total > 0 ? (pagoConfirmado / total) * 100 : 0,
      conversionRate: esperandoPago > 0 ? (pagoConfirmado / esperandoPago) * 100 : 0,
    },
  ]

  const getConversionIcon = (rate?: number) => {
    if (!rate) return null
    if (rate >= 70) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (rate >= 40) return <Minus className="w-4 h-4 text-yellow-600" />
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }

  const getConversionColor = (rate?: number) => {
    if (!rate) return "text-slate-500"
    if (rate >= 70) return "text-green-600"
    if (rate >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  // El ancho debe ser proporcional al porcentaje del total (no al máximo)
  // Esto hace que las barras se vayan achicando como embudo

  return (
    <Card className="p-6">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Embudo de Conversión</h3>
        <p className="text-sm text-slate-500">Progresión de leads a través del proceso de venta</p>
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          // El ancho es proporcional al porcentaje del total - va bajando
          const widthPercentage = stage.percentage
          
          return (
            <div key={stage.name} className="space-y-2">
              {/* Flecha de conversión entre etapas */}
              {index > 0 && stage.conversionRate !== undefined && (
                <div className="flex items-center gap-2 pl-4 py-1">
                  <div className="flex-1 border-l-2 border-dashed border-slate-300 h-4"></div>
                  <div className="flex items-center gap-2 text-sm">
                    {getConversionIcon(stage.conversionRate)}
                    <span className={`font-semibold ${getConversionColor(stage.conversionRate)}`}>
                      {stage.conversionRate.toFixed(1)}% avanzó
                    </span>
                  </div>
                </div>
              )}

              {/* Barra del stage */}
              <div className="relative">
                <div 
                  className={`${stage.bgColor} rounded-lg p-4 transition-all duration-300`}
                  style={{ width: `${Math.max(widthPercentage, 15)}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${stage.color}`}>
                          {stage.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-bold text-slate-900 text-xl">
                          {stage.count}
                        </span>
                        <span className="text-slate-600">
                          ({stage.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen de conversión total */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Conversión Total</p>
            <p className="text-xs text-slate-500">De entrada a pago confirmado</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">
              {total > 0 ? ((pagoConfirmado / total) * 100).toFixed(1) : "0"}%
            </p>
            <p className="text-xs text-slate-500">
              {pagoConfirmado} de {total} leads
            </p>
          </div>
        </div>
        <Progress 
          value={total > 0 ? (pagoConfirmado / total) * 100 : 0} 
          className="mt-3 h-2"
        />
      </div>
    </Card>
  )
}
