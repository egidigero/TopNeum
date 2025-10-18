import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { CatalogoTable } from "@/components/catalogo/catalogo-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function CatalogoPage() {
  const user = await getSession()

  // Fetch productos with calculated prices
  const productos = await sql`
    SELECT 
      p.id,
      p.marca,
      p.diseno,
      p.modelo,
      p.medida,
      p.codigo,
      p.costo,
      p.stock,
      p.activo,
      pc.precio_lista,
      pc.precio_online_base,
      pc.precio_3_cuotas,
      pc.precio_6_cuotas,
      pc.precio_12_cuotas,
      pc.efectivo_sin_iva_caba,
      pc.efectivo_sin_iva_interior,
      pc.mayorista_con_factura,
      pc.mayorista_sin_factura
    FROM productos p
    LEFT JOIN precios_calculados pc ON p.id = pc.producto_id
    WHERE p.activo = true
    ORDER BY p.marca, p.modelo
  `

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Catálogo de Productos</h1>
          <p className="text-slate-400">Gestión de neumáticos y precios</p>
        </div>
        <Link href="/catalogo/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <CatalogoTable productos={productos} userRole={user?.role || "ventas"} />
    </div>
  )
}
