import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NuevoPedidoForm } from "@/components/pedidos/nuevo-pedido-form"

export default async function NuevoPedidoPage() {
  await getSession()

  // Get productos for selection
  const productos = await sql`
    SELECT 
      p.id,
      p.marca,
      p.diseno,
      p.modelo,
      p.medida,
      p.codigo,
      p.stock,
      pc.precio_online_base
    FROM productos p
    LEFT JOIN precios_calculados pc ON p.id = pc.producto_id
    WHERE p.activo = true AND p.stock > 0
    ORDER BY p.marca, p.modelo
  `

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nuevo Pedido</h1>
        <p className="text-slate-400">Crear una nueva orden de venta</p>
      </div>

      <NuevoPedidoForm productos={productos} />
    </div>
  )
}
