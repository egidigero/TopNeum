import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []

    // Build dynamic update query
    Object.entries(body).forEach(([key, value]) => {
      updates.push(`${key} = $${values.length + 1}`)
      values.push(value)
    })

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    values.push(params.id)

    const result = await sql.unsafe(
      `UPDATE leads_whatsapp 
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    )

    return NextResponse.json({ lead: result[0] })
  } catch (error: any) {
    console.error("[v0] Update lead error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
