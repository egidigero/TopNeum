"use client"

import { useState } from "react"
import { NuevoLeadForm } from "@/components/leads/nuevo-lead-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NuevoLeadPage() {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  const handleClose = () => {
    setOpen(false)
    router.push("/leads")
  }

  const handleSuccess = () => {
    router.push("/leads")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/leads">
          <Button variant="outline" className="mb-4 border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Leads
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nuevo Lead</h1>
        <p className="text-slate-600">Registrar un nuevo cliente potencial</p>
      </div>

      <NuevoLeadForm 
        open={open} 
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
