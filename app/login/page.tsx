import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sistema Neumáticos</h1>
          <p className="text-slate-400">Gestión integral de ventas y stock</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
