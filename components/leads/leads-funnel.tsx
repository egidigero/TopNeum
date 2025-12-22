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

  // Contadores por estado
  const nuevo = leads.filter(l => l.estado === "nuevo").length
  const enConversacion = leads.filter(l => l.estado === "en_conversacion").length
  const cotizado = leads.filter(l => l.estado === "cotizado").length
  const esperandoPago = leads.filter(l => l.estado === "esperando_pago").length
  const pagoInformado = leads.filter(l => l.estado === "pago_informado").length

  // Calcular tasas de conversión entre etapas
  const conversionToConversacion = nuevo > 0 ? (enConversacion / nuevo) * 100 : 0
  const conversionToCotizado = enConversacion > 0 ? (cotizado / enConversacion) * 100 : 0
  const conversionToPago = cotizado > 0 ? (esperandoPago / cotizado) * 100 : 0
  const conversionToConfirmado = esperandoPago > 0 ? (pagoInformado / esperandoPago) * 100 : 0

  const stages: FunnelStage[] = [
    {
      name: "nuevo",
      label: "🆕 Nuevo",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      count: nuevo,
      percentage: totalLeads > 0 ? (nuevo / totalLeads) * 100 : 0,
    },
    {
      name: "en_conversacion",
      label: "💬 En Conversación",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      count: enConversacion,
      percentage: totalLeads > 0 ? (enConversacion / totalLeads) * 100 : 0,
      conversionRate: conversionToConversacion,
    },
    {
      name: "cotizado",
      label: "📋 Cotizado",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      count: cotizado,
      percentage: totalLeads > 0 ? (cotizado / totalLeads) * 100 : 0,
      conversionRate: conversionToCotizado,
    },
    {
      name: "esperando_pago",
      label: "⏳ Esperando Pago",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      count: esperandoPago,
      percentage: totalLeads > 0 ? (esperandoPago / totalLeads) * 100 : 0,
      conversionRate: conversionToPago,
    },
    {
      name: "pago_informado",
      label: "✅ Pago Confirmado",
      color: "text-green-600",
      bgColor: "bg-green-100",
      count: pagoInformado,
      percentage: totalLeads > 0 ? (pagoInformado / totalLeads) * 100 : 0,
      conversionRate: conversionToConfirmado,
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

  // Calcular el ancho máximo basado en el stage con más leads
  const maxCount = Math.max(...stages.map(s => s.count))

  return (
    <Card className="p-6">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Embudo de Conversión</h3>
        <p className="text-sm text-slate-500">Visualización del flujo de leads por cada etapa</p>
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
          
          return (
            <div key={stage.name} className="space-y-2">
              {/* Flecha de conversión entre etapas */}
              {index > 0 && stage.conversionRate !== undefined && (
                <div className="flex items-center gap-2 pl-4 py-1">
                  <div className="flex-1 border-l-2 border-dashed border-slate-300 h-4"></div>
                  <div className="flex items-center gap-2 text-sm">
                    {getConversionIcon(stage.conversionRate)}
                    <span className={`font-semibold ${getConversionColor(stage.conversionRate)}`}>
                      {stage.conversionRate.toFixed(1)}% conversión
                    </span>
                  </div>
                </div>
              )}

              {/* Barra del stage */}
              <div className="relative">
                <div 
                  className={`${stage.bgColor} rounded-lg p-4 transition-all duration-300`}
                  style={{ width: `${Math.max(widthPercentage, 20)}%` }}
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
                          ({stage.percentage.toFixed(1)}% del total)
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
            <p className="text-xs text-slate-500">De nuevo a pago confirmado</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">
              {nuevo > 0 ? ((pagoInformado / nuevo) * 100).toFixed(1) : "0"}%
            </p>
            <p className="text-xs text-slate-500">
              {pagoInformado} de {nuevo} leads nuevos
            </p>
          </div>
        </div>
        <Progress 
          value={nuevo > 0 ? (pagoInformado / nuevo) * 100 : 0} 
          className="mt-3 h-2"
        />
      </div>
    </Card>
  )
}
