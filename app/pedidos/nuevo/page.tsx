import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NuevoPedidoForm } from "@/components/pedidos/nuevo-pedido-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NuevoPedidoPage() {
  await getSession()

  // Get productos from products table (imported catalog)
  const productosRaw = await sql`
    SELECT 
      id,
      marca,
      familia as diseno,
      diseno as modelo,
      medida,
      indice,
      sku as codigo,
      COALESCE(
        CASE 
          WHEN stock ~ '^[0-9]+$' THEN stock::integer
          WHEN UPPER(TRIM(stock)) = 'OK' THEN 999
          ELSE 0
        END, 
        0
      ) as stock,
      cuota_3 as precio_online_base
    FROM products
    WHERE tiene_stock = true
    ORDER BY marca, medida, indice
  `

  const productos = productosRaw.map((p: any) => ({
    id: String(p.id),
    marca: String(p.marca || ''),
    diseno: String(p.diseno || ''),
    modelo: String(p.modelo || ''),
    medida: String(p.medida || ''),
    indice: String(p.indice || ''),
    codigo: String(p.codigo || ''),
    stock: Number(p.stock || 0),
    precio_online_base: Number(p.precio_online_base || 0),
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/pedidos">
          <Button variant="outline" className="mb-4 border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Pedidos
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nuevo Pedido</h1>
        <p className="text-slate-600">Crear una nueva orden de venta</p>
      </div>

      <NuevoPedidoForm productos={productos} />
    </div>
  )
}
