"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ApplyAdjustmentsButton() {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()

      const res = await fetch('/api/productos/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })

      const data = await res.json()
      if (!res.ok) {
        toast({ 
          title: 'Error al aplicar ajustes', 
          description: data?.error || 'Error applying adjustments',
          variant: 'destructive'
        })
      } else {
        const summary = data?.summary
        if (summary) {
          const { total, aplicados, omitidos, errores, detalleErrores } = summary
          
          if (errores === 0 && omitidos === 0) {
            toast({ 
              title: '✅ Ajustes aplicados exitosamente', 
              description: `${aplicados} de ${total} productos actualizados`,
              duration: 5000
            })
          } else {
            // Mostrar resumen con detalle
            const errorList = detalleErrores?.slice(0, 5).map((e: any) => e.error).join('\n') || ''
            const moreErrors = errores > 5 ? `\n... y ${errores - 5} errores más` : ''
            
            toast({ 
              title: aplicados > 0 ? '⚠️ Ajustes parciales' : '❌ No se aplicaron ajustes',
              description: `✓ ${aplicados} aplicados | ⊘ ${omitidos} omitidos | ✗ ${errores} errores de ${total} total\n\nPrimeros errores:\n${errorList}${moreErrors}`,
              variant: aplicados === 0 ? 'destructive' : 'default',
              duration: 10000
            })
          }
        } else {
          toast({ title: 'Ajustes completados', description: 'Adjustments applied' })
        }
      }
    } catch (err: any) {
      toast({ title: 'Ajustes failed', description: String(err?.message || err) })
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="hidden"
      />
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} title="Aplicar ajustes de precio">
        <TrendingUp className="mr-2 h-4 w-4" />
        Aplicar Ajustes
      </Button>
    </div>
  )
}

export default ApplyAdjustmentsButton
