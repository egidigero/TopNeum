import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()

    const body = await request.json()
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { id: leadId } = await params
    
    // Update simple por campo
    let result: any[] = []
    
    if (body.estado !== undefined) {
      result = await sql`
        UPDATE leads 
        SET estado = ${body.estado}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    
    if (body.notas !== undefined) {
      result = await sql`
        UPDATE leads 
        SET updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
      // Las notas se guardan en lead_notas, no en leads
    }
    
    if (body.ultimo_contacto_at !== undefined) {
      result = await sql`
        UPDATE leads 
        SET ultima_interaccion = ${body.ultimo_contacto_at}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }

    return NextResponse.json({ lead: result[0] })
  } catch (error: any) {
    console.error("[v0] Update lead error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()

    const { id } = await params

    // Eliminar en orden (por las foreign keys)
    // Usar try-catch para cada tabla por si no existe
    try {
      await sql`DELETE FROM lead_entregas WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_pedidos WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_cotizaciones WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_consultas WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_historial WHERE lead_id = ${id}`
    } catch (e) {}
    
    // 6. Finalmente el lead
    await sql`DELETE FROM leads WHERE id = ${id}`

    return NextResponse.json({ success: true, message: "Lead eliminado correctamente" })
  } catch (error: any) {
    console.error("[v0] Delete lead error:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar lead" }, { status: 500 })
  }
}
