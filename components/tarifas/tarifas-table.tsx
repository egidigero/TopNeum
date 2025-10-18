"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Tarifa {
  id: string
  nombre: string
  vigente: boolean
  jitter_min: number
  jitter_max: number
  iva: number
  margen_online: number
  recargo_3: number
  recargo_6: number
  recargo_12: number
  desc_cash_caba: number
  desc_cash_interior: number
  margen_mayorista_cf: number
  margen_mayorista_sf: number
  vigente_desde: string | null
  vigente_hasta: string | null
  created_at: string
}

interface TarifasTableProps {
  tarifas: Tarifa[]
}

export function TarifasTable({ tarifas }: TarifasTableProps) {
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("es-AR")
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-800/50">
              <TableHead className="text-slate-300">Nombre</TableHead>
              <TableHead className="text-slate-300">Estado</TableHead>
              <TableHead className="text-slate-300">IVA</TableHead>
              <TableHead className="text-slate-300">Margen Online</TableHead>
              <TableHead className="text-slate-300">Recargo 3c</TableHead>
              <TableHead className="text-slate-300">Recargo 6c</TableHead>
              <TableHead className="text-slate-300">Recargo 12c</TableHead>
              <TableHead className="text-slate-300">Desc. CABA</TableHead>
              <TableHead className="text-slate-300">Desc. Interior</TableHead>
              <TableHead className="text-slate-300">May. C/F</TableHead>
              <TableHead className="text-slate-300">May. S/F</TableHead>
              <TableHead className="text-slate-300">Vigencia</TableHead>
              <TableHead className="text-slate-300">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarifas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-slate-400 py-8">
                  No hay tarifas creadas
                </TableCell>
              </TableRow>
            ) : (
              tarifas.map((tarifa) => (
                <TableRow key={tarifa.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="text-white font-medium">{tarifa.nombre}</TableCell>
                  <TableCell>
                    {tarifa.vigente ? (
                      <Badge className="bg-green-900/50 text-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Vigente
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">{formatPercent(tarifa.iva)}</TableCell>
                  <TableCell className="text-slate-300">{formatPercent(tarifa.margen_online)}</TableCell>
                  <TableCell className="text-slate-300">{formatPercent(tarifa.recargo_3)}</TableCell>
                  <TableCell className="text-slate-300">{formatPercent(tarifa.recargo_6)}</TableCell>
                  <TableCell className="text-slate-300">{formatPercent(tarifa.recargo_12)}</TableCell>
                  <TableCell className="text-blue-300">{formatPercent(tarifa.desc_cash_caba)}</TableCell>
                  <TableCell className="text-blue-300">{formatPercent(tarifa.desc_cash_interior)}</TableCell>
                  <TableCell className="text-purple-300">{formatPercent(tarifa.margen_mayorista_cf)}</TableCell>
                  <TableCell className="text-purple-300">{formatPercent(tarifa.margen_mayorista_sf)}</TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {tarifa.vigente_desde ? (
                      <div>
                        <div>Desde: {formatDate(tarifa.vigente_desde)}</div>
                        {tarifa.vigente_hasta && <div>Hasta: {formatDate(tarifa.vigente_hasta)}</div>}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/tarifas/${tarifa.id}`}>
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
  )
}
