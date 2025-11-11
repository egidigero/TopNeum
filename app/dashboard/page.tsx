import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react"
import Image from "next/image"

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
