import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react"
import Image from "next/image"
import { LeadsStats } from "@/components/leads/leads-stats"
import { LeadsFunnel } from "@/components/leads/leads-funnel"
import { LeadsTrendChart } from "@/components/leads/leads-trend-chart"
import { LeadsTopProducts } from "@/components/leads/leads-top-products"

export default async function DashboardPage() {
  const user = await getSession()

  // Obtener estadísticas reales
  const stats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE tiene_stock = true) as productos_activos,
      (SELECT COUNT(*) FROM leads WHERE estado NOT IN ('pedido_confirmado', 'perdido')) as leads_activos,
      (SELECT COUNT(*) FROM leads WHERE estado = 'pedido_confirmado') as pedidos_confirmados,
      (SELECT COUNT(*) FROM lead_pedidos WHERE estado_pago IN ('pendiente', 'sena_recibida')) as pagos_pendientes,
      (SELECT COUNT(*) FROM turnos WHERE fecha >= CURRENT_DATE) as turnos_proximos,
      (SELECT COUNT(*) FROM leads WHERE estado IN ('esperando_pago', 'pago_informado')) as leads_en_proceso
  `

  const {
    productos_activos = 0,
    leads_activos = 0,
    pedidos_confirmados = 0,
    pagos_pendientes = 0,
    turnos_proximos = 0,
    leads_en_proceso = 0
  } = stats[0] || {}

  // Obtener todos los leads para analytics
  const leadsData = await sql`
    SELECT 
      l.id,
      l.nombre,
      l.telefono,
      l.email,
      l.estado,
      l.region,
      l.codigo_confirmacion,
      l.medida_neumatico,
      l.marca_preferida,
      l.tipo_vehiculo,
      l.notas,
      l.created_at,
      l.updated_at,
      l.ultima_interaccion,
      (
        SELECT row_to_json(p.*) 
        FROM (
          SELECT 
            lp.id,
            lp.total,
            lp.forma_pago,
            lp.estado_pago,
            lp.created_at,
            (
              SELECT json_agg(
                json_build_object(
                  'producto_sku', pi.producto_sku,
                  'cantidad', pi.cantidad,
                  'precio_unitario', pi.precio_unitario,
                  'producto_descripcion', p.descripcion
                )
              )
              FROM pedido_items pi
              LEFT JOIN products p ON p.sku = pi.producto_sku
              WHERE pi.pedido_id = lp.id
            ) as items
          FROM lead_pedidos lp
          WHERE lp.lead_id = l.id
          ORDER BY lp.created_at DESC
          LIMIT 1
        ) p
      ) as ultimo_pedido
    FROM leads l
    WHERE l.estado NOT IN ('pedido_confirmado', 'perdido')
    ORDER BY l.created_at DESC
  `

  // Transformar datos para los componentes de analytics
  const leadsForAnalytics = leadsData.map((lead: any) => ({
    ...lead,
    ultimo_total: lead.ultimo_pedido?.total || null,
    forma_pago: lead.ultimo_pedido?.forma_pago || null,
    producto_descripcion: lead.ultimo_pedido?.items?.[0]?.producto_descripcion || null,
    pedidos: lead.ultimo_pedido ? [lead.ultimo_pedido] : [],
  }))

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido, {user?.nombre}</h1>
          <p className="text-slate-600">Panel de control del sistema de gestión de neumáticos</p>
        </div>
        <div className="flex items-center gap-4">
          <Image 
            src="/images/image.png" 
            alt="TopNeum" 
            width={200} 
            height={60}
            className="h-12 w-auto"
            priority
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Productos Activos</CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(productos_activos)}</div>
            <p className="text-xs text-slate-500 mt-1">Con stock disponible</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads Activos</CardTitle>
            <Users className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(leads_activos)}</div>
            <p className="text-xs text-slate-500 mt-1">En seguimiento</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">En Proceso de Pago</CardTitle>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(leads_en_proceso)}</div>
            <p className="text-xs text-slate-500 mt-1">Esperando confirmación</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pagos Pendientes</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(pagos_pendientes)}</div>
            <p className="text-xs text-slate-500 mt-1">Por verificar</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pedidos Confirmados</CardTitle>
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(pedidos_confirmados)}</div>
            <p className="text-xs text-slate-500 mt-1">Listos para gestionar</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Turnos Próximos</CardTitle>
            <Calendar className="w-4 h-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{Number(turnos_proximos)}</div>
            <p className="text-xs text-slate-500 mt-1">Desde hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Analytics de Leads */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Analytics de Leads</h2>
        
        {/* Stats Cards */}
        <LeadsStats leads={leadsForAnalytics} />

        {/* Embudo de Conversión */}
        <div className="mt-6">
          <LeadsFunnel leads={leadsForAnalytics} />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <LeadsTrendChart leads={leadsForAnalytics} />
          <LeadsTopProducts leads={leadsForAnalytics} />
        </div>
      </div>

      <div className="mt-8">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Acceso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p>Usa el menú lateral para navegar entre los módulos del sistema.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
