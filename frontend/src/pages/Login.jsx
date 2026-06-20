import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { login, user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handle(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await login(email, password)
      nav('/')
    } catch {
      setErr('Email o contraseña incorrectos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <form onSubmit={handle} className="card p-8 w-full max-w-md space-y-4">
        <div className="text-center">
          <img src="/logo.png?v=2" alt="MailerUp" className="mx-auto h-16 w-16 object-contain mb-2" />
          <h1 className="text-xl font-semibold">MailerUp</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Inicia sesión</p>
        </div>
        <div>
          <label htmlFor="login-email" className="label">Email</label>
          <input id="login-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="login-password" className="label">Contraseña</label>
          <input id="login-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <p role="alert" className="text-red-600 dark:text-red-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
