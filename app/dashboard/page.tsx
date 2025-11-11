import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react"

export default async function DashboardPage() {
  const user = await getSession()

  // Obtener estadísticas reales
  const stats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE tiene_stock = true) as productos_activos,
      (SELECT COUNT(*) FROM leads WHERE estado NOT IN ('pedido_finalizado', 'abandonado')) as leads_activos,
      (SELECT COUNT(*) FROM lead_pedidos WHERE estado_pago = 'pendiente') as pedidos_pendientes,
      (SELECT COUNT(*) FROM lead_pedidos WHERE estado_pago IN ('a_confirmar_pago', 'pendiente')) as pagos_pendientes,
      (SELECT COUNT(*) FROM turnos WHERE fecha >= CURRENT_DATE) as turnos_proximos,
      (SELECT COUNT(*) FROM leads WHERE estado = 'en_proceso_de_pago') as leads_en_proceso
  `

  const {
    productos_activos = 0,
    leads_activos = 0,
    pedidos_pendientes = 0,
    pagos_pendientes = 0,
    turnos_proximos = 0,
    leads_en_proceso = 0
  } = stats[0] || {}

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido, {user?.nombre}</h1>
        <p className="text-slate-600">Panel de control del sistema de gestión de neumáticos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Productos Activos</CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">En catálogo</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads Activos</CardTitle>
            <Users className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">En seguimiento</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pedidos Pendientes</CardTitle>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Por preparar</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pagos Pendientes</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Por verificar</p>
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
