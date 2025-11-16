"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/auth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditProductoModal } from "./edit-producto-modal"

interface Producto {
  id: string
  marca: string
  familia: string
  diseno: string
  modelo: string
  medida: string
  indice: string | null
  codigo: string
  costo: number
  stock: string | number  // Puede ser número, "OK", o vacío
  activo: boolean
  precio_lista: number
  precio_online_base: number
  precio_3_cuotas: number
  precio_6_cuotas: number
  precio_12_cuotas: number
  efectivo_sin_iva_caba: number
  efectivo_sin_iva_interior: number
  mayorista_con_factura: number
  mayorista_sin_factura: number
}

interface CatalogoTableProps {
  productos: Producto[]
  userRole: UserRole
  marcas: string[]
  familiasPorMarca: Record<string, string[]>
  medidas: string[]
}

export function CatalogoTable({ productos, userRole, marcas, familiasPorMarca, medidas }: CatalogoTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<string>("all")
  const [familiaFilter, setFamiliaFilter] = useState<string>("all")
  const [medidaFilter, setMedidaFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<string | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()

  const canSeeCost = userRole === "admin"

  // Helper para verificar si hay stock
  const tieneStock = (stock: string | number): boolean => {
    if (!stock) return false
    const stockStr = String(stock).toUpperCase().trim()
    if (stockStr === 'OK') return true
    const num = parseInt(stockStr)
    return !isNaN(num) && num > 0
  }

  // Helper para mostrar el stock
  const formatStock = (stock: string | number): string => {
    if (!stock) return 'Sin stock'
    const stockStr = String(stock).toUpperCase().trim()
    if (stockStr === 'OK') return 'OK'
    return stockStr
  }

  // Get available families for selected marca
  const familiasDisponibles = useMemo(() => {
    if (marcaFilter === "all") return []
    return familiasPorMarca[marcaFilter] || []
  }, [marcaFilter, familiasPorMarca])

  // Reset familia filter when marca changes
  const handleMarcaChange = (newMarca: string) => {
    setMarcaFilter(newMarca)
    setFamiliaFilter("all")
  }

  // Filter productos
  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      const matchesSearch =
        producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.medida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.familia.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMarca = marcaFilter === "all" || producto.marca === marcaFilter
      const matchesFamilia = familiaFilter === "all" || producto.familia === familiaFilter
      const matchesMedida = medidaFilter === "all" || producto.medida === medidaFilter

      const hasStock = tieneStock(producto.stock)
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "ok" && hasStock) ||
        (stockFilter === "zero" && !hasStock)

      return matchesSearch && matchesMarca && matchesFamilia && matchesMedida && matchesStock
    })
  }, [productos, searchTerm, marcaFilter, familiaFilter, medidaFilter, stockFilter])

  const handleDeleteClick = (producto: Producto) => {
    setProductToDelete(producto)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (productoId: string) => {
    setProductToEdit(productoId)
    setEditModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/productos/${productToDelete.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Error al eliminar producto')
      }

      toast({
        title: '✅ Producto eliminado',
        description: `${productToDelete.codigo} fue eliminado correctamente`,
      })

      router.refresh()
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error) {
      toast({
        title: '❌ Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "-"
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por código, marca, modelo o medida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <select
            value={marcaFilter}
            onChange={(e) => handleMarcaChange(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[150px]"
          >
            <option value="all">Todas las marcas</option>
            {marcas.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>

          <select
            value={familiaFilter}
            onChange={(e) => setFamiliaFilter(e.target.value)}
            disabled={marcaFilter === "all"}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">
              {marcaFilter === "all" ? "Seleccione marca primero" : "Todas las familias"}
            </option>
            {familiasDisponibles.map((familia) => (
              <option key={familia} value={familia}>
                {familia}
              </option>
            ))}
          </select>

          <select
            value={medidaFilter}
            onChange={(e) => setMedidaFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[150px]"
          >
            <option value="all">Todas las medidas</option>
            {medidas.map((medida) => (
              <option key={medida} value={medida}>
                {medida}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm min-w-[130px]"
          >
            <option value="all">Todo el stock</option>
            <option value="ok">Con stock</option>
            <option value="zero">Sin stock</option>
          </select>

          <Button variant="outline" className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Mostrando {filteredProductos.length} de {productos.length} productos
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-slate-50">
                <TableHead className="text-slate-700">Código</TableHead>
                <TableHead className="text-slate-700">Marca</TableHead>
                <TableHead className="text-slate-700">Familia</TableHead>
                <TableHead className="text-slate-700">Diseño</TableHead>
                <TableHead className="text-slate-700">Medida</TableHead>
                <TableHead className="text-slate-700">Índice</TableHead>
                <TableHead className="text-slate-700 text-right">Stock</TableHead>
                {canSeeCost && <TableHead className="text-slate-700 text-right">Costo</TableHead>}
                <TableHead className="text-slate-700 text-right">3 cuotas</TableHead>
                <TableHead className="text-slate-700 text-right">6 cuotas</TableHead>
                <TableHead className="text-slate-700 text-right">12 cuotas</TableHead>
                <TableHead className="text-slate-700 text-right">Efectivo CABA</TableHead>
                <TableHead className="text-slate-700 text-right">Efectivo Interior</TableHead>
                <TableHead className="text-slate-700 text-right">May. C/F</TableHead>
                <TableHead className="text-slate-700 text-right">May. S/F</TableHead>
                <TableHead className="text-slate-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canSeeCost ? 16 : 15} className="text-center text-slate-500 py-8">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductos.map((producto) => (
                  <TableRow key={producto.id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-slate-700">{producto.codigo}</TableCell>
                    <TableCell className="text-slate-900 font-medium">{producto.marca}</TableCell>
                    <TableCell className="text-slate-700">{producto.familia}</TableCell>
                    <TableCell className="text-slate-700">{producto.diseno || '-'}</TableCell>
                    <TableCell className="text-slate-700 font-medium">{producto.medida}</TableCell>
                    <TableCell className="text-slate-700">
                      {producto.indice ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-mono text-xs">
                          {producto.indice}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={!tieneStock(producto.stock) ? "destructive" : "default"}
                        className={
                          !tieneStock(producto.stock)
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-green-100 text-green-800 border-green-300"
                        }
                      >
                        {formatStock(producto.stock)}
                      </Badge>
                    </TableCell>
                    {canSeeCost && (
                      <TableCell className="text-right text-slate-900 font-medium">
                        {formatPrice(producto.costo)}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-slate-700">{formatPrice(producto.precio_3_cuotas)}</TableCell>
                    <TableCell className="text-right text-slate-700">{formatPrice(producto.precio_6_cuotas)}</TableCell>
                    <TableCell className="text-right text-slate-700">
                      {formatPrice(producto.precio_12_cuotas)}
                    </TableCell>
                    <TableCell className="text-right text-blue-700">
                      {formatPrice(producto.efectivo_sin_iva_caba)}
                    </TableCell>
                    <TableCell className="text-right text-blue-700">
                      {formatPrice(producto.efectivo_sin_iva_interior)}
                    </TableCell>
                    <TableCell className="text-right text-purple-700">
                      {formatPrice(producto.mayorista_con_factura)}
                    </TableCell>
                    <TableCell className="text-right text-purple-700">
                      {formatPrice(producto.mayorista_sin_factura)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" 
                          onClick={() => handleEditClick(producto.id)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(producto)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el producto <strong>{productToDelete?.codigo}</strong> - {productToDelete?.marca} {productToDelete?.medida}.
              <br /><br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      {productToEdit && (
        <EditProductoModal
          productoId={productToEdit}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open)
            if (!open) {
              setProductToEdit(null)
            }
          }}
        />
      )}
    </div>
  )
}
