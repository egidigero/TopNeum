import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()

    const pagos = await sql`
      SELECT * FROM pagos
      WHERE lead_id = ${params.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ pagos })
  } catch (error: any) {
    console.error("[v0] Fetch pagos error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
