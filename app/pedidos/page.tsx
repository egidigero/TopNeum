import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { PedidosTable } from "@/components/pedidos/pedidos-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function PedidosPage() {
  await getSession()

  const pedidos = await sql`
    SELECT 
      p.*,
      COUNT(pi.id) as items_count
    FROM pedidos p
    LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pedidos</h1>
          <p className="text-slate-400">Gestión de órdenes y entregas</p>
        </div>
        <Link href="/pedidos/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
        </Link>
      </div>

      <PedidosTable pedidos={pedidos} />
    </div>
  )
}
