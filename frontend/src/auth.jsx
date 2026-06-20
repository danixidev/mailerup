import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // _skipRetry=true prevents the 401 interceptor from attempting a refresh on the
    // initial session check — if there's no cookie yet, just stay logged out.
    api.get('/auth/me/', { _skipRetry: true })
      .then((r) => setUser(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    await api.post('/auth/token/', { email, password })
    const me = await api.get('/auth/me/')
    setUser(me.data)
  }

  async function logout() {
    try { await api.post('/auth/logout/') } catch {}
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
