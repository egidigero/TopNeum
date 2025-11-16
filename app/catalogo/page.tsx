import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { CatalogoTable } from "@/components/catalogo/catalogo-table"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { NuevoProductoModal } from "@/components/catalogo/nuevo-producto-modal"
import { ImportCsvButton } from "@/components/catalogo/import-csv-button"
import { ApplyAdjustmentsButton } from "@/components/catalogo/apply-adjustments-button"

export default async function CatalogoPage() {
  const user = await getSession()

  // Fetch filter options
  const marcasRaw = await sql`
    SELECT DISTINCT marca 
    FROM products 
    WHERE marca IS NOT NULL AND marca != ''
    ORDER BY marca
  `
  const marcas = marcasRaw.map((m: any) => m.marca)

  const familiasRaw = await sql`
    SELECT DISTINCT marca, familia
    FROM products 
    WHERE marca IS NOT NULL AND marca != '' 
      AND familia IS NOT NULL AND familia != ''
    ORDER BY marca, familia
  `
  const familiasPorMarca = familiasRaw.reduce((acc: any, row: any) => {
    if (!acc[row.marca]) acc[row.marca] = []
    acc[row.marca].push(row.familia)
    return acc
  }, {})

  const medidasRaw = await sql`
    SELECT DISTINCT medida 
    FROM products 
    WHERE medida IS NOT NULL AND medida != ''
    ORDER BY medida
  `
  const medidas = medidasRaw.map((m: any) => m.medida)

  // Fetch products directly from the products table (no precios_calculados view)
  const productosRaw = await sql`
    SELECT
      p.id,
      p.marca,
      p.familia,
      COALESCE(p.diseno, p.descripcion_larga) AS diseno,
      NULL::text AS modelo,
      p.medida,
      p.indice,
      p.sku AS codigo,
      p.costo,
      p.stock,
      p.tiene_stock,

      -- Price fields mapped directly from products table
      NULL::numeric AS precio_lista,
      COALESCE(p.efectivo_bsas_sin_iva, p.cuota_3) AS precio_online_base,
      p.cuota_3 AS precio_3_cuotas,
      p.cuota_6 AS precio_6_cuotas,
      p.cuota_12 AS precio_12_cuotas,
      p.efectivo_bsas_sin_iva AS efectivo_sin_iva_caba,
      p.efectivo_int_sin_iva AS efectivo_sin_iva_interior,
      p.mayorista_fact AS mayorista_con_factura,
      p.mayorista_sin_fact AS mayorista_sin_factura
    FROM products p
    ORDER BY p.marca, p.sku
  `

  // Map raw DB rows to the shape expected by the UI component
  const productos = productosRaw.map((p: any) => ({
    id: String(p.id),
    marca: p.marca ?? "",
    familia: p.familia ?? "",
    diseno: p.diseno ?? "",
    modelo: p.modelo ?? "",
    medida: p.medida ?? "",
    indice: p.indice ?? null,
    codigo: p.codigo ?? "",
    costo: p.costo !== null && p.costo !== undefined ? Number(p.costo) : 0,
    stock: p.stock ?? "",
    activo: p.tiene_stock ?? true,
    precio_lista: p.precio_lista !== null && p.precio_lista !== undefined ? Number(p.precio_lista) : 0,
    precio_online_base:
      p.precio_online_base !== null && p.precio_online_base !== undefined ? Number(p.precio_online_base) : 0,
    precio_3_cuotas: p.precio_3_cuotas !== null && p.precio_3_cuotas !== undefined ? Number(p.precio_3_cuotas) : 0,
    precio_6_cuotas: p.precio_6_cuotas !== null && p.precio_6_cuotas !== undefined ? Number(p.precio_6_cuotas) : 0,
    precio_12_cuotas: p.precio_12_cuotas !== null && p.precio_12_cuotas !== undefined ? Number(p.precio_12_cuotas) : 0,
    efectivo_sin_iva_caba:
      p.efectivo_sin_iva_caba !== null && p.efectivo_sin_iva_caba !== undefined ? Number(p.efectivo_sin_iva_caba) : 0,
    efectivo_sin_iva_interior:
      p.efectivo_sin_iva_interior !== null && p.efectivo_sin_iva_interior !== undefined ? Number(p.efectivo_sin_iva_interior) : 0,
    mayorista_con_factura:
      p.mayorista_con_factura !== null && p.mayorista_con_factura !== undefined ? Number(p.mayorista_con_factura) : 0,
    mayorista_sin_factura:
      p.mayorista_sin_factura !== null && p.mayorista_sin_factura !== undefined ? Number(p.mayorista_sin_factura) : 0,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Catálogo de Productos</h1>
          <p className="text-slate-600">Gestión de neumáticos y precios</p>
        </div>
        <div className="flex items-center gap-3">
          <ApplyAdjustmentsButton />
          <ImportCsvButton userRole={user?.role} />
          <NuevoProductoModal />
        </div>
      </div>

      <CatalogoTable 
        productos={productos} 
        userRole={user?.role || "ventas"}
        marcas={marcas}
        familiasPorMarca={familiasPorMarca}
        medidas={medidas}
      />
    </div>
  )
}
