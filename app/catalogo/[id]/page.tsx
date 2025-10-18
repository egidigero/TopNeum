import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { ProductoForm } from "@/components/catalogo/producto-form"
import { notFound } from "next/navigation"

export default async function EditProductoPage({ params }: { params: { id: string } }) {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/catalogo")
  }

  const productos = await sql`
    SELECT * FROM productos WHERE id = ${params.id} LIMIT 1
  `

  if (productos.length === 0) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Editar Producto</h1>
        <p className="text-slate-400">Modificar información del neumático</p>
      </div>

      <ProductoForm producto={productos[0]} />
    </div>
  )
}
