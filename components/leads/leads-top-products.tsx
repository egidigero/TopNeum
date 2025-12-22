"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/types/lead";
import { Package } from "lucide-react";

interface LeadsTopProductsProps {
  leads: Lead[];
}

export function LeadsTopProducts({ leads: allLeads }: LeadsTopProductsProps) {
  // Filtrar leads con pedidos que tengan items con producto_descripcion
  const leadsConPedidos = allLeads.filter(
    lead => lead.pedidos && 
    lead.pedidos.length > 0 && 
    lead.pedidos[0].items &&
    lead.pedidos[0].items.length > 0
  );

  // Contar productos
  const productCounts: Record<string, { count: number; total: number }> = {};
  
  leadsConPedidos.forEach(lead => {
    const pedido = lead.pedidos![0];
    const producto = pedido.items![0].producto_descripcion;
    
    if (!productCounts[producto]) {
      productCounts[producto] = { count: 0, total: 0 };
    }
    
    productCounts[producto].count += 1;
    productCounts[producto].total += pedido.total || 0;
  });

  // Ordenar por cantidad de veces cotizado
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([producto, data]) => ({
      producto,
      count: data.count,
      totalValue: data.total,
      percentage: ((data.count / leadsConPedidos.length) * 100).toFixed(1)
    }));

  if (topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top Productos Cotizados
          </CardTitle>
          <CardDescription>Productos más solicitados</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay productos cotizados todavía
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Top Productos Cotizados
        </CardTitle>
        <CardDescription>
          Top 5 productos más solicitados ({leadsConPedidos.length} cotizaciones)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topProducts.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant={index === 0 ? "default" : "outline"} className="shrink-0">
                  #{index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} cotizaciones ({item.percentage}%)
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  ${item.totalValue.toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-muted-foreground">valor total</p>
              </div>
            </div>
          ))}
        </div>
        
        {leadsConPedidos.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cotizado:</span>
              <span className="font-semibold">
                ${topProducts.reduce((sum, p) => sum + p.totalValue, 0).toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
