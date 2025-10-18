"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, DollarSign, MessageSquare, ShoppingCart, Receipt, LogOut } from "lucide-react"
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
    title: "Tarifas",
    href: "/tarifas",
    icon: DollarSign,
    roles: ["admin"],
  },
  {
    title: "Clientes WhatsApp",
    href: "/leads",
    icon: MessageSquare,
  },
  {
    title: "Pedidos",
    href: "/pedidos",
    icon: ShoppingCart,
  },
  {
    title: "Gastos",
    href: "/gastos",
    icon: Receipt,
    roles: ["admin", "finanzas"],
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
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">Sistema Neumáticos</h2>
        <p className="text-sm text-slate-400 mt-1">{user.nombre}</p>
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
                isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
            >
              <Icon className="w-5 h-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
