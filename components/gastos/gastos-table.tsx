"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download } from "lucide-react"

interface Gasto {
  id: string
  fecha: string
  categoria: string
  descripcion: string
  monto: number
  medio_pago: string
  comprobante_url: string | null
  creado_por_nombre: string
  created_at: string
}

interface GastosTableProps {
  gastos: Gasto[]
}

export function GastosTable({ gastos }: GastosTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  const categorias = useMemo(() => {
    const uniqueCategorias = new Set(gastos.map((g) => g.categoria))
    return Array.from(uniqueCategorias).sort()
  }, [gastos])

  const filteredGastos = useMemo(() => {
    return gastos.filter((gasto) => {
      const matchesSearch =
        gasto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gasto.categoria.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategoria = categoriaFilter === "all" || gasto.categoria === categoriaFilter

      const matchesFechaDesde = !fechaDesde || gasto.fecha >= fechaDesde
      const matchesFechaHasta = !fechaHasta || gasto.fecha <= fechaHasta

      return matchesSearch && matchesCategoria && matchesFechaDesde && matchesFechaHasta
    })
  }, [gastos, searchTerm, categoriaFilter, fechaDesde, fechaHasta])

  const totalGastos = useMemo(() => {
    return filteredGastos.reduce((sum, gasto) => sum + gasto.monto, 0)
  }, [filteredGastos])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-AR")
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <option value="all">Todas las categorías</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>

          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            placeholder="Desde"
            className="bg-slate-800 border-slate-700 text-white"
          />

          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            placeholder="Hasta"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Mostrando {filteredGastos.length} de {gastos.length} gastos
          </div>
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold text-white">Total: {formatPrice(totalGastos)}</div>
            <Button variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Fecha</TableHead>
                <TableHead className="text-slate-300">Categoría</TableHead>
                <TableHead className="text-slate-300">Descripción</TableHead>
                <TableHead className="text-slate-300 text-right">Monto</TableHead>
                <TableHead className="text-slate-300">Medio de Pago</TableHead>
                <TableHead className="text-slate-300">Creado Por</TableHead>
                <TableHead className="text-slate-300">Comprobante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No se encontraron gastos
                  </TableCell>
                </TableRow>
              ) : (
                filteredGastos.map((gasto) => (
                  <TableRow key={gasto.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300">{formatDate(gasto.fecha)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                        {gasto.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{gasto.descripcion}</TableCell>
                    <TableCell className="text-right text-white font-medium">{formatPrice(gasto.monto)}</TableCell>
                    <TableCell className="text-slate-300">{gasto.medio_pago}</TableCell>
                    <TableCell className="text-slate-300">{gasto.creado_por_nombre}</TableCell>
                    <TableCell>
                      {gasto.comprobante_url ? (
                        <a
                          href={gasto.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
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
