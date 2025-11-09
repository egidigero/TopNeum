import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { notFound } from "next/navigation"
import { PedidoDetail } from "@/components/pedidos/pedido-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  await getSession()

  const pedidosRaw = await sql`
    SELECT * FROM pedidos WHERE id = ${params.id} LIMIT 1
  `

  if (pedidosRaw.length === 0) {
    notFound()
  }

  const pedidoRaw = pedidosRaw[0]
  const pedido = {
    id: String(pedidoRaw.id),
    cliente_nombre: String(pedidoRaw.cliente_nombre || ''),
    cliente_telefono: String(pedidoRaw.cliente_telefono || ''),
    estado: String(pedidoRaw.estado || 'pendiente'),
    direccion: String(pedidoRaw.direccion || ''),
    tipo_entrega: String(pedidoRaw.tipo_entrega || 'retiro'),
    items_total: Number(pedidoRaw.items_total || 0),
    notas: pedidoRaw.notas || null,
    created_at: String(pedidoRaw.created_at),
    updated_at: String(pedidoRaw.updated_at),
  }

  const itemsRaw = await sql`
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

  const items = itemsRaw.map((item: any) => ({
    id: String(item.id),
    cantidad: Number(item.cantidad || 0),
    precio_unitario: Number(item.precio_unitario || 0),
    subtotal: Number(item.subtotal || 0),
    marca: String(item.marca || ''),
    diseno: String(item.diseno || ''),
    modelo: String(item.modelo || ''),
    medida: String(item.medida || ''),
    codigo: String(item.codigo || ''),
  }))

  return (
    <div className="p-8">
      <Link href="/pedidos">
        <Button variant="outline" className="mb-4 border-slate-300">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Pedidos
        </Button>
      </Link>
      <PedidoDetail pedido={pedido} items={items} />
    </div>
  )
}
