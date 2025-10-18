import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProductoForm } from "@/components/catalogo/producto-form"

export default async function NuevoProductoPage() {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/catalogo")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nuevo Producto</h1>
        <p className="text-slate-400">Agregar un nuevo neumático al catálogo</p>
      </div>

      <ProductoForm />
    </div>
  )
}
