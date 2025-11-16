"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, MessageSquare, ShoppingCart, Calendar, LogOut, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { User, UserRole } from "@/lib/auth"

interface AppSidebarProps {
  user: User
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Catálogo",
    href: "/catalogo",
    icon: Package,
  },
  {
    title: "Turnos",
    href: "/dashboard/turnos",
    icon: Calendar,
  },
  {
    title: "Clientes WhatsApp",
    href: "/leads",
    icon: MessageSquare,
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
  },
  {
    title: "Pedidos",
    href: "/pedidos",
    icon: ShoppingCart,
  },
]

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(user.role)
  })

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">TopNeum</h2>
        <p className="text-sm text-slate-600 mt-1">{user.nombre}</p>
        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-blue-600 text-white" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
              )}
            >
              <Icon className="w-5 h-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-100"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
