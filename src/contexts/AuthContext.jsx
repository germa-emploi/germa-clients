import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MIRROR_ACCOUNTS } from '../utils/constants'

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

  const [viewAsState, setViewAsState] = useState(() => { try { return JSON.parse(sessionStorage.getItem('gc_view_as')) || null } catch { return null } })
  function setViewAs(v) {
    setViewAsState(v)
    try { if (v) sessionStorage.setItem('gc_view_as', JSON.stringify(v)); else sessionStorage.removeItem('gc_view_as') } catch { /* ignore */ }
  }

  async function signOut() {
    setUser(null)
    setProfile(null)
    // Oublier les filtres et tris mémorisés des listes
    try { Object.keys(sessionStorage).filter(k => k.startsWith('gc_list_')).forEach(k => sessionStorage.removeItem(k)) } catch { /* ignore */ }
    setViewAs(null)
    try { await supabase.auth.signOut() } catch (e) { /* ignore */ }
  }

  // Sélecteur de vue (direction) : afficher le site exactement comme un commercial le voit.
  // Les saisies faites dans cette vue restent enregistrées au nom de la personne connectée.
  const realIsDirection = profile?.role === 'direction'
  const viewAs = realIsDirection ? viewAsState : null
  const isDirection = realIsDirection && !viewAs
  const mirror = MIRROR_ACCOUNTS[(profile?.email || '').toLowerCase()] || null
  const viewId = viewAs?.id || mirror?.id || profile?.id

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, isDirection, realIsDirection, viewAs, setViewAs, viewId, mirror }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
