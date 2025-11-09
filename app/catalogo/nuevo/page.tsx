import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProductoForm } from "@/components/catalogo/producto-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NuevoProductoPage() {
  const user = await getSession()

  if (user?.role !== "admin") {
    redirect("/catalogo")
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nuevo Producto</h1>
        <p className="text-slate-600">Agregar un nuevo neumático al catálogo</p>
      </div>

      <ProductoForm />
    </div>
  )
}
