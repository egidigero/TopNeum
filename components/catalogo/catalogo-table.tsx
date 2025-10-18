"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Edit } from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@/lib/auth"

interface Producto {
  id: string
  marca: string
  diseno: string
  modelo: string
  medida: string
  codigo: string
  costo: number
  stock: number
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
}

export function CatalogoTable({ productos, userRole }: CatalogoTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")

  const canSeeCost = userRole === "admin"

  // Get unique marcas for filter
  const marcas = useMemo(() => {
    const uniqueMarcas = new Set(productos.map((p) => p.marca))
    return Array.from(uniqueMarcas).sort()
  }, [productos])

  // Filter productos
  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      const matchesSearch =
        producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.medida.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMarca = marcaFilter === "all" || producto.marca === marcaFilter

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "ok" && producto.stock > 0) ||
        (stockFilter === "zero" && producto.stock === 0) ||
        (stockFilter === "low" && producto.stock > 0 && producto.stock < 5)

      return matchesSearch && matchesMarca && matchesStock
    })
  }, [productos, searchTerm, marcaFilter, stockFilter])

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
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por código, marca, modelo o medida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <select
            value={marcaFilter}
            onChange={(e) => setMarcaFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <option value="all">Todas las marcas</option>
            {marcas.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <option value="all">Todo el stock</option>
            <option value="ok">Con stock</option>
            <option value="low">Stock bajo (&lt;5)</option>
            <option value="zero">Sin stock</option>
          </select>

          <Button variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredProductos.length} de {productos.length} productos
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Código</TableHead>
                <TableHead className="text-slate-300">Marca</TableHead>
                <TableHead className="text-slate-300">Diseño</TableHead>
                <TableHead className="text-slate-300">Modelo</TableHead>
                <TableHead className="text-slate-300">Medida</TableHead>
                <TableHead className="text-slate-300 text-right">Stock</TableHead>
                {canSeeCost && <TableHead className="text-slate-300 text-right">Costo</TableHead>}
                <TableHead className="text-slate-300 text-right">Lista</TableHead>
                <TableHead className="text-slate-300 text-right">Online</TableHead>
                <TableHead className="text-slate-300 text-right">3 cuotas</TableHead>
                <TableHead className="text-slate-300 text-right">6 cuotas</TableHead>
                <TableHead className="text-slate-300 text-right">12 cuotas</TableHead>
                <TableHead className="text-slate-300 text-right">Efectivo CABA</TableHead>
                <TableHead className="text-slate-300 text-right">Efectivo Interior</TableHead>
                <TableHead className="text-slate-300 text-right">May. C/F</TableHead>
                <TableHead className="text-slate-300 text-right">May. S/F</TableHead>
                <TableHead className="text-slate-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canSeeCost ? 17 : 16} className="text-center text-slate-400 py-8">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductos.map((producto) => (
                  <TableRow key={producto.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-sm text-slate-300">{producto.codigo}</TableCell>
                    <TableCell className="text-white font-medium">{producto.marca}</TableCell>
                    <TableCell className="text-slate-300">{producto.diseno}</TableCell>
                    <TableCell className="text-slate-300">{producto.modelo}</TableCell>
                    <TableCell className="text-slate-300">{producto.medida}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={producto.stock === 0 ? "destructive" : producto.stock < 5 ? "secondary" : "default"}
                        className={
                          producto.stock === 0
                            ? "bg-red-900/50 text-red-300"
                            : producto.stock < 5
                              ? "bg-yellow-900/50 text-yellow-300"
                              : "bg-green-900/50 text-green-300"
                        }
                      >
                        {producto.stock}
                      </Badge>
                    </TableCell>
                    {canSeeCost && (
                      <TableCell className="text-right text-slate-300 font-medium">
                        {formatPrice(producto.costo)}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-slate-300">{formatPrice(producto.precio_lista)}</TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {formatPrice(producto.precio_online_base)}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">{formatPrice(producto.precio_3_cuotas)}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatPrice(producto.precio_6_cuotas)}</TableCell>
                    <TableCell className="text-right text-slate-300">
                      {formatPrice(producto.precio_12_cuotas)}
                    </TableCell>
                    <TableCell className="text-right text-blue-300">
                      {formatPrice(producto.efectivo_sin_iva_caba)}
                    </TableCell>
                    <TableCell className="text-right text-blue-300">
                      {formatPrice(producto.efectivo_sin_iva_interior)}
                    </TableCell>
                    <TableCell className="text-right text-purple-300">
                      {formatPrice(producto.mayorista_con_factura)}
                    </TableCell>
                    <TableCell className="text-right text-purple-300">
                      {formatPrice(producto.mayorista_sin_factura)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/catalogo/${producto.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
