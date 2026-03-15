import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises.')
}

// Nettoyer TOUT résidu Supabase des versions précédentes
// pour que le client parte de zéro, sans rien à rafraîchir
try {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase') || key === 'germa_session')) {
      toRemove.push(key)
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k))
} catch (e) { /* ignore */ }

// Client Supabase SANS persistence — pas de localStorage, pas de refresh automatique au démarrage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
})
