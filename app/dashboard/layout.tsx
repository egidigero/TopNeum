import type React from "react"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <aside className="w-64 flex-shrink-0">
        <AppSidebar user={user} />
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
