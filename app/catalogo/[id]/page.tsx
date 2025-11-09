import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { ProductoForm } from "@/components/catalogo/producto-form"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EditProductoPage({ params }: { params: { id: string } }) {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/catalogo")
  }

  // Detectar tabla disponible
  const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
  const table = exists[0]?.tbl ? 'productos' : 'products'

  let producto

  if (table === 'productos') {
    const productos = await sql`
      SELECT * FROM productos WHERE id = ${params.id} LIMIT 1
    `
    producto = productos[0]
  } else {
    const productos = await sql`
      SELECT * FROM products WHERE id = ${params.id} LIMIT 1
    `
    producto = productos[0]
  }

  if (!producto) {
    notFound()
  }

  // Normalizar producto para el formulario
  const productoNormalizado = {
    id: String(producto.id),
    marca: producto.marca || "",
    diseno: producto.diseno || producto.diseno_linea || "",
    modelo: producto.modelo || producto.linea || "",
    medida: producto.medida || "",
    codigo: producto.sku || producto.codigo || "",
    costo: producto.costo ? Number(producto.costo) : 0,
    stock: producto.stock || "",
    precio_lista_base: producto.precio_lista_base || null,
    activo: producto.tiene_stock ?? producto.activo ?? true,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/catalogo">
          <Button variant="outline" className="mb-4 border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Catálogo
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Editar Producto</h1>
        <p className="text-slate-600">Modificar información del neumático</p>
      </div>

      <ProductoForm producto={productoNormalizado as any} />
    </div>
  )
}
