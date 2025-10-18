import { cookies } from "next/headers"

export type UserRole = "admin" | "ventas" | "finanzas"

export interface User {
  id: string
  email: string
  nombre: string
  role: UserRole
  activo: boolean
}

export type AuthUser = User

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export async function setSession(user: User) {
  const cookieStore = await cookies()
  const sessionData = JSON.stringify({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    activo: user.activo,
  })

  cookieStore.set("auth-session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("auth-session")

    if (!session) return null

    const user = JSON.parse(session.value) as User
    return user
  } catch {
    return null
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-session")
}

export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user || !user.activo) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}
