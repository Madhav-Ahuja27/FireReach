import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCredits = useCallback(async () => {
    try {
      const { data } = await api.get('/api/credits')
      setCredits(data.balance)
    } catch {
      setCredits(0)
    }
  }, [])

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fr_token')
    if (!token) { setLoading(false); return }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
      await fetchCredits()
    } catch {
      localStorage.removeItem('fr_token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }, [fetchCredits])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('fr_token', data.access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUser(data.user)
    await fetchCredits()
    return data
  }

  const signup = async (email, name, password) => {
    const { data } = await api.post('/api/auth/signup', { email, name, password })
    localStorage.setItem('fr_token', data.access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUser(data.user)
    await fetchCredits()
    return data
  }

  const logout = () => {
    localStorage.removeItem('fr_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    setCredits(null)
  }

  return (
    <AuthCtx.Provider value={{ user, credits, loading, login, signup, logout, fetchCredits }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
