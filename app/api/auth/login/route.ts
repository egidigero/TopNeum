import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { setSession, verifyPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
    }

    // Get user from database
    const users = await sql`
      SELECT id, email, nombre, role, activo, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const user = users[0]

    if (!user.activo) {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 401 })
    }

    // For demo purposes, accept "admin123" for all users
    // In production, use proper password verification
    const isValid = password === "admin123" || (await verifyPassword(password, user.password_hash))

    if (!isValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Create session
    await setSession({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      activo: user.activo,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
