"use client"

import React from "react"
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductoForm } from "./producto-form"

export function NuevoProductoModal() {
  return (
    <Dialog>
      <DialogTrigger>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="text-white">Nuevo Producto</DialogTitle>
        <div className="mt-4">
          <ProductoForm onModal />
        </div>
      </DialogContent>
    </Dialog>
  )
}
