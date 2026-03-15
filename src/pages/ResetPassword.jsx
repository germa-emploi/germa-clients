import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Extraire le token de récupération depuis le hash de l'URL
    // Format: #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type === 'recovery' && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError('Lien de récupération invalide ou expiré. Veuillez refaire une demande.')
          } else {
            setSessionReady(true)
          }
          setLoading(false)
        })
    } else {
      setError('Lien de récupération invalide. Veuillez refaire une demande depuis la page de connexion.')
      setLoading(false)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (!/[A-Z]/.test(password)) { setError('Le mot de passe doit contenir au moins une majuscule.'); return }
    if (!/[a-z]/.test(password)) { setError('Le mot de passe doit contenir au moins une minuscule.'); return }
    if (!/[0-9]/.test(password)) { setError('Le mot de passe doit contenir au moins un chiffre.'); return }
    if (!/[^A-Za-z0-9]/.test(password)) { setError('Le mot de passe doit contenir au moins un caractère spécial (!@#$%...).'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setSaving(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    // Mettre à jour le flag must_change_password aussi
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    }

    setSuccess(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-germa-800 via-germa-700 to-germa-600 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-germa-800 via-germa-700 to-germa-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Nouveau mot de passe</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
              <h2 className="font-display font-semibold text-lg text-gray-900 mb-2">Mot de passe modifié</h2>
              <p className="text-sm text-gray-500 mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full flex items-center justify-center gap-2 !py-3">
                Se connecter
              </button>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-4">
              <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <button onClick={() => navigate('/login')} className="btn-secondary w-full">
                Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Min. 8 car., majuscule, minuscule, chiffre, spécial"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="input-field"
                    placeholder="Répétez le mot de passe"
                    required
                  />
                  {confirm && password && confirm === password && (
                    <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1">
                      <CheckCircle2 size={12} /> Les mots de passe correspondent
                    </div>
                  )}
                </div>

                <button type="submit" disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base disabled:opacity-60">
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Lock size={18} /><span>Valider</span></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
