import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false) // false = on affiche login direct

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error || !data) { setProfile(null); return null }
      setProfile(data)
      return data
    } catch (err) {
      setProfile(null)
      return null
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const prof = await fetchProfile(data.user.id)
    if (!prof) throw new Error('Profil introuvable. Contactez la direction.')

    if (!prof.is_active) {
      await supabase.auth.signOut()
      throw new Error('Votre compte a été désactivé. Contactez la direction.')
    }

    setUser(data.user)
    setProfile(prof)
    return data
  }

  async function signOut() {
    setUser(null)
    setProfile(null)
    try { await supabase.auth.signOut() } catch (e) { /* ignore */ }
  }

  const isDirection = profile?.role === 'direction'

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, isDirection }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
