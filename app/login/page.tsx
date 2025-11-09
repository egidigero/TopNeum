import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">TopNeum</h1>
          <p className="text-slate-600">Gestión integral de ventas y stock</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
