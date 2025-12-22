"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types/lead";
import { TrendingUp } from "lucide-react";
import { startOfDay, subDays, format, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";

interface LeadsTrendChartProps {
  leads: Lead[];
}

export function LeadsTrendChart({ leads }: LeadsTrendChartProps) {
  // Obtener últimos 14 días de datos
  const days = 14;
  const today = startOfDay(new Date());
  
  const trendData = Array.from({ length: days }, (_, i) => {
    const day = subDays(today, days - 1 - i);
    const nextDay = subDays(today, days - 2 - i);
    
    const count = leads.filter(lead => {
      const leadDate = startOfDay(new Date(lead.created_at));
      return leadDate.getTime() === day.getTime();
    }).length;
    
    return {
      date: day,
      count,
      label: format(day, "dd/MM", { locale: es })
    };
  });

  const maxCount = Math.max(...trendData.map(d => d.count), 1);
  
  // Calcular promedio de últimos 7 días vs 7 días anteriores
  const last7Days = trendData.slice(-7);
  const prev7Days = trendData.slice(-14, -7);
  
  const avg7Days = last7Days.reduce((sum, d) => sum + d.count, 0) / 7;
  const avgPrev7Days = prev7Days.reduce((sum, d) => sum + d.count, 0) / 7;
  
  const trend = avg7Days - avgPrev7Days;
  const trendPercentage = avgPrev7Days > 0 ? ((trend / avgPrev7Days) * 100).toFixed(1) : "0";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendencia de Leads
        </CardTitle>
        <CardDescription>
          Últimos {days} días
          {trend !== 0 && (
            <span className={`ml-2 font-semibold ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(Number(trendPercentage))}% vs semana anterior
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-1 h-32">
          {trendData.map((day, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              <div className="w-full flex flex-col justify-end h-24 relative group">
                <div
                  className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                  style={{
                    height: `${(day.count / maxCount) * 100}%`,
                    minHeight: day.count > 0 ? "4px" : "0px"
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    {day.count} leads
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {day.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Promedio últimos 7 días: <span className="font-semibold text-foreground">{avg7Days.toFixed(1)}</span> leads/día
        </div>
      </CardContent>
    </Card>
  );
}
