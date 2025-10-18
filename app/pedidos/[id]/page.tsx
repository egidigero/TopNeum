import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"
import { PedidoDetail } from "@/components/pedidos/pedido-detail"

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  await getSession()

  const pedidos = await sql`
    SELECT * FROM pedidos WHERE id = ${params.id} LIMIT 1
  `

  if (pedidos.length === 0) {
    notFound()
  }

  const items = await sql`
    SELECT 
      pi.*,
      p.marca,
      p.diseno,
      p.modelo,
      p.medida,
      p.codigo
    FROM pedido_items pi
    JOIN productos p ON p.id = pi.producto_id
    WHERE pi.pedido_id = ${params.id}
  `

  return (
    <div className="p-8">
      <PedidoDetail pedido={pedidos[0]} items={items} />
    </div>
  )
}
